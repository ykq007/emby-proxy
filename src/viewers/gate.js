// Viewer 网关：engine.js 在节点解析完、国家/防盗链网关之后调用。
//   - 无 viewer 令牌：只拦截「viewer 用户名」的 AuthenticateByName，其余返回 null（原样透传）。
//   - 有 ev_ 令牌：换成节点上游账号的令牌再经 forward（= proxyRequest 递归）转发；
//     在此基础上叠加 并发限制 / 独立观看状态 / 首页媒体库隐藏，并把响应里的上游令牌换回 viewer 令牌。
// viewer 登录后拿到的 User.Id 就是上游账号的 Id，所以 /Users/{id}/… 路径无需改写，身份只看令牌。
import { dbFirst } from '../db/helpers.js';
import { rateLimitFixedWindow, resp429 } from '../db/rate-limit.js';
import { TOKEN_PREFIX, resolveViewer, findViewerForLogin, verifyPassword, issueToken, revokeToken, changeOwnPassword, randomHex } from './store.js';
import { getUpstreamSession, dropUpstreamSession } from './upstream.js';
import { acquireSlot, heartbeatSlot, releaseSlot } from './limits.js';
import { recordPlayback, setUserData, applyUserData, overlayJson, localFilterIds, resumeIds, buildNextUp } from './watch.js';

const E = '^\\/(?:emby\\/)?';
const re = (s) => new RegExp(E + s + '$', 'i');
const LOGIN = re('Users\\/AuthenticateByName');
const LOGOUT = re('Sessions\\/Logout');
const PLAYBACK_INFO = re('Items\\/([^/]+)\\/PlaybackInfo');
const SESSION_PLAYING = re('Sessions\\/Playing(?:\\/(Progress|Stopped))?');
const PLAYED_ITEM = re('Users\\/[^/]+\\/PlayedItems\\/([^/]+)');
const FAVORITE_ITEM = re('Users\\/[^/]+\\/FavoriteItems\\/([^/]+)');
const ITEM_USERDATA = re('Users\\/[^/]+\\/Items\\/([^/]+)\\/UserData');
const RESUME = re('(?:Users\\/[^/]+\\/)?Items\\/Resume');
const NEXT_UP = re('Shows\\/NextUp');
const ITEMS_QUERY = re('(?:Users\\/[^/]+\\/)?Items');
const PASSWORD = re('Users\\/[^/]+\\/Password');
const USER_OBJECT = re('Users\\/([^/]+)');
const VIEWS = re('(?:Users\\/[^/]+\\/Views|Library\\/MediaFolders|Library\\/VirtualFolders|Library\\/SelectableMediaFolders)');
const ROOT_ITEMS = re('Users\\/[^/]+\\/Items');
// 共享的上游账号不能被 viewer 改动/删除内容（仍建议给节点配非管理员上游账号）。
const DENIED = [
    [/^DELETE$/, re('Items\\/.+')],
    [/^(POST|DELETE)$/, re('Users\\/(?:New|[^/]+\\/Policy|[^/]+\\/EasyPassword|[^/]+)')],
    [/./, re('System\\/(?:Restart|Shutdown)')],
    [/^(POST|DELETE)$/, re('(?:Plugins|Packages)(?:\\/.*)?')],
];

const unauthorized = () => Response.json({ message: 'Unauthorized' }, { status: 401 });

export function extractToken(request, url) {
    const h = request.headers;
    const direct = h.get('X-Emby-Token') || h.get('X-MediaBrowser-Token');
    if (direct) return direct;
    for (const [k, v] of url.searchParams) if (/^(api_?key|x-emby-token)$/i.test(k) && v) return v;
    for (const name of ['X-Emby-Authorization', 'Authorization']) {
        const m = /Token="?([^",\s]+)"?/i.exec(h.get(name) || '');
        if (m) return m[1];
    }
    return null;
}

function deviceIdOf(request, url, fallback) {
    const h = request.headers;
    const m = /DeviceId="?([^",]+)"?/i.exec(h.get('X-Emby-Authorization') || h.get('Authorization') || '');
    return h.get('X-Emby-Device-Id') || (m && m[1]) || url.searchParams.get('DeviceId') || url.searchParams.get('deviceId') || fallback;
}

// 把请求里出现的 from 令牌（header / query / 授权串）全部换成 to。
export function swapToken(request, from, to) {
    const u = new URL(request.url);
    for (const [k, v] of [...u.searchParams]) if (v === from) u.searchParams.set(k, to);
    const req = new Request(u, request);
    for (const [k, v] of [...req.headers]) if (v.includes(from)) req.headers.set(k, v.split(from).join(to));
    return req;
}

async function readBody(request) {
    const raw = await request.clone().text().catch(() => '');
    try { return JSON.parse(raw); } catch (e) { return Object.fromEntries(new URLSearchParams(raw)); }
}

// opts: { prefix, path, url, forward(Request) → Promise<Response> }
export async function handleViewerRequest(request, env, ctx, opts) {
    const { prefix, path, url } = opts;
    // 登录请求可能还带着旧令牌，先于令牌判断处理。
    if (request.method === 'POST' && LOGIN.test(path)) return viewerLogin(request, env, opts);
    const token = extractToken(request, url);
    if (!token || !token.startsWith(TOKEN_PREFIX)) return null;
    const s = await resolveViewer(env, prefix, token);
    if (!s) return unauthorized();
    if (request.method === 'POST' && LOGOUT.test(path)) {
        await revokeToken(env, token);
        return new Response(null, { status: 204 });
    }
    if (request.method === 'POST' && PASSWORD.test(path)) {
        const b = await readBody(request);
        const ok = await changeOwnPassword(env, s, b.CurrentPw ?? b.CurrentPassword, b.NewPw ?? b.NewPassword);
        return ok ? new Response(null, { status: 204 }) : unauthorized();
    }
    if (DENIED.some(([m, p]) => m.test(request.method) && p.test(path))) {
        return Response.json({ message: 'Forbidden for viewer accounts' }, { status: 403 });
    }
    const ua = request.headers.get('User-Agent') || '';
    let up = await getUpstreamSession(env, prefix);
    if (!up) return Response.json({ message: 'Upstream account unavailable' }, { status: 503 });

    // 上游令牌失效 → 丢弃会话重新登录；GET 可安全重放一次。
    const send = async (req) => {
        const retry = req.method === 'GET' ? req.clone() : null;
        let r = await opts.forward(swapToken(req, token, up.token));
        if (r.status === 401) {
            await dropUpstreamSession(env, prefix);
            const fresh = await getUpstreamSession(env, prefix);
            if (fresh) {
                up = fresh;
                if (retry) r = await opts.forward(swapToken(retry, token, up.token));
            }
        }
        return r;
    };
    const upJson = async (pathQuery) => {
        const r = await send(new Request(`${url.origin}/${prefix}/emby${pathQuery}`,
            { headers: { 'X-Emby-Token': token, 'Accept': 'application/json', 'User-Agent': ua } }));
        return r.ok ? r.json().catch(() => null) : null;
    };
    const fetchItem = (id) => upJson(`/Users/${up.userId}/Items/${encodeURIComponent(id)}`);
    const v = { env, ctx, s, token, url, path, method: request.method, get up() { return up; } };
    const m = request.method;
    let mm;

    if ((mm = PLAYBACK_INFO.exec(path))) {
        const device = deviceIdOf(request, url, token);
        const blocked = await acquireSlot(env, s, device, mm[1]);
        if (blocked) return blocked;
        const r = await send(request);
        if (!r.ok) await releaseSlot(env, s, device);
        return finish(v, r);
    }

    if (m === 'POST' && (mm = SESSION_PLAYING.exec(path))) {
        const kind = (mm[1] || 'playing').toLowerCase();
        const body = await readBody(request);
        const device = deviceIdOf(request, url, token);
        const r = await send(request);
        const work = [kind === 'stopped' ? releaseSlot(env, s, device) : heartbeatSlot(env, s, device)];
        if (r.ok) work.push(recordPlayback(env, s, kind, body, fetchItem));
        const all = Promise.all(work).catch(e => console.log('viewer watch write failed:', e.message));
        if (ctx && ctx.waitUntil) ctx.waitUntil(all); else await all;
        return r;
    }

    if ((m === 'POST' || m === 'DELETE') && ((mm = PLAYED_ITEM.exec(path)) || (mm = FAVORITE_ITEM.exec(path)))) {
        const flags = PLAYED_ITEM.test(path) ? { played: m === 'POST' } : { favorite: m === 'POST' };
        return userDataWrite(v, await send(request), mm[1], flags, fetchItem);
    }

    if (m === 'POST' && (mm = ITEM_USERDATA.exec(path))) {
        const b = await readBody(request);
        const flags = {};
        if (b.Played !== undefined) flags.played = !!b.Played;
        if (b.IsFavorite !== undefined) flags.favorite = !!b.IsFavorite;
        if (b.PlaybackPositionTicks !== undefined) flags.position = b.PlaybackPositionTicks;
        return userDataWrite(v, await send(request), mm[1], flags, fetchItem);
    }

    if (m === 'GET' && RESUME.test(path)) {
        const { ids, total } = await resumeIds(env, s, url.searchParams);
        let items = [];
        if (ids.length) {
            const q = new URLSearchParams();
            for (const k of ['Fields', 'EnableImageTypes', 'ImageTypeLimit', 'EnableImages', 'EnableUserData', 'MediaTypes', 'IncludeItemTypes']) {
                if (url.searchParams.get(k)) q.set(k, url.searchParams.get(k));
            }
            q.set('Ids', ids.join(','));
            const data = await upJson(`/Users/${up.userId}/Items?${q}`);
            const byId = new Map(((data && data.Items) || []).map(it => [String(it.Id), it]));
            items = ids.map(id => byId.get(id)).filter(Boolean);
        }
        return Response.json(await overlayJson(env, s, { Items: items, TotalRecordCount: total }), { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    if (m === 'GET' && NEXT_UP.test(path)) {
        const fields = url.searchParams.get('Fields') || '';
        const data = await buildNextUp(env, s, url.searchParams, async (sid) => {
            const d = await upJson(`/Shows/${encodeURIComponent(sid)}/Episodes?UserId=${up.userId}&Fields=${encodeURIComponent(fields)}`);
            return d && d.Items;
        });
        return Response.json(await overlayJson(env, s, data), { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    if (m === 'GET' && ITEMS_QUERY.test(path)) {
        const params = new URLSearchParams(url.search);
        const ids = await localFilterIds(env, s, params);
        if (ids !== null) {
            if (!ids.length) return Response.json({ Items: [], TotalRecordCount: 0 }, { headers: { 'Access-Control-Allow-Origin': '*' } });
            params.set('Ids', ids.join(','));
            const u = new URL(request.url); u.search = params.toString();
            return finish(v, await send(new Request(u, request)));
        }
    }

    return finish(v, await send(request));
}

// PlayedItems / FavoriteItems / UserData 写：上游成功后写本地，响应里的 UserData 换成本地状态。
async function userDataWrite(v, r, itemId, flags, fetchItem) {
    if (!r.ok) return r;
    const row = await setUserData(v.env, v.s, itemId, flags, fetchItem);
    const ud = await r.clone().json().catch(() => null);
    if (!ud || typeof ud !== 'object') return r;
    const headers = new Headers(r.headers); headers.delete('Content-Length');
    return new Response(JSON.stringify(applyUserData(ud, row)), { status: r.status, headers });
}

// 响应后处理：上游令牌 → viewer 令牌；GET JSON 再做 媒体库隐藏 + 观看状态覆盖 + 用户对象改名。
async function finish(v, r) {
    if (r.status === 101 || r.webSocket) return r;
    const { up, token } = v;
    const ct = r.headers.get('content-type') || '';
    const textual = /json|mpegurl|dash\+xml/i.test(ct) || /\.(m3u8|mpd)$/i.test(v.path);
    const loc = r.headers.get('Location') || '';
    if (!textual && !loc.includes(up.token)) return r;
    const headers = new Headers(r.headers);
    if (loc) headers.set('Location', loc.split(up.token).join(token));
    if (!textual) return new Response(r.body, { status: r.status, statusText: r.statusText, headers });
    let text = (await r.text()).split(up.token).join(token);
    if (r.ok && v.method === 'GET' && /json/i.test(ct)) {
        try {
            let data = JSON.parse(text);
            data = hideLibraries(v, data);
            await overlayJson(v.env, v.s, data);
            const um = USER_OBJECT.exec(v.path);
            if (um && data && data.Id === up.userId) viewerize(data, v.s);
            text = JSON.stringify(data);
        } catch (e) { /* 非 JSON 或解析失败：只做令牌替换 */ }
    }
    headers.delete('Content-Length');
    return new Response(text, { status: r.status, statusText: r.statusText, headers });
}

function hideLibraries(v, data) {
    const hidden = v.s.hidden;
    if (!hidden.size) return data;
    const isViews = VIEWS.test(v.path);
    const isRoot = ROOT_ITEMS.test(v.path) && !v.url.searchParams.get('ParentId');
    if (!isViews && !isRoot) return data;
    const keep = (x) => !x || !hidden.has(String(x.Id ?? x.ItemId ?? '')) ||
        (isRoot && !isViews && !['CollectionFolder', 'UserView'].includes(x.Type));
    if (Array.isArray(data)) return data.filter(keep);
    if (data && Array.isArray(data.Items)) {
        const before = data.Items.length;
        data.Items = data.Items.filter(keep);
        if (typeof data.TotalRecordCount === 'number') data.TotalRecordCount -= before - data.Items.length;
    }
    return data;
}

function viewerize(user, s) {
    user.Name = s.username;
    delete user.PrimaryImageTag;
    user.Policy = { ...(user.Policy || {}), IsAdministrator: false, EnableContentDeletion: false, EnableContentDeletionFromFolders: [] };
    return user;
}

async function viewerLogin(request, env, opts) {
    const b = await readBody(request);
    const username = b.Username ?? b.username;
    if (!username) return null;
    const row = await findViewerForLogin(env, opts.prefix, username);
    if (!row) return null; // 非 viewer → 交给上游账号体系
    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || '';
    const now = Date.now();
    if (ip) {
        const ban = await dbFirst(env, `SELECT until FROM ip_bans WHERE ip = ?`, ip);
        if (ban && ban.until > now) return resp429(ban.until - now);
    }
    if (!row.enabled || !(await verifyPassword(b.Pw ?? b.Password ?? b.pw ?? '', row.password))) {
        const limited = ip ? await rateLimitFixedWindow(env, ip, now,
            { table: 'auth_rl', minuteLimit: 12, hourlyLimit: 100, banMs: 3600000, reason: 'viewer-bruteforce' }) : null;
        return limited || unauthorized();
    }
    const up = await getUpstreamSession(env, opts.prefix);
    if (!up) return Response.json({ message: 'Upstream account unavailable' }, { status: 503 });
    const device = deviceIdOf(request, opts.url, '');
    const token = await issueToken(env, row.id, opts.prefix, device);
    const auth = request.headers.get('X-Emby-Authorization') || request.headers.get('Authorization') || '';
    const field = (k) => (new RegExp(k + '="?([^",]+)"?', 'i').exec(auth) || [])[1] || '';
    const user = viewerize({
        Name: row.username, ServerId: up.serverId, Id: up.userId,
        HasPassword: true, HasConfiguredPassword: true, HasConfiguredEasyPassword: false, EnableAutoLogin: false,
        Policy: {
            IsHidden: false, IsDisabled: false, EnableUserPreferenceAccess: true, EnableContentDownloading: true,
            EnableRemoteAccess: true, EnableLiveTvAccess: true, EnableLiveTvManagement: false, EnableMediaPlayback: true,
            EnableAudioPlaybackTranscoding: true, EnableVideoPlaybackTranscoding: true, EnablePlaybackRemuxing: true,
            EnableSyncTranscoding: true, EnableMediaConversion: true, EnableAllDevices: true, EnableAllChannels: true,
            EnableAllFolders: true, EnablePublicSharing: false, InvalidLoginAttemptCount: 0, RemoteClientBitrateLimit: 0,
        },
        Configuration: {
            PlayDefaultAudioTrack: true, DisplayMissingEpisodes: false, EnableLocalPassword: false, HidePlayedInLatest: true,
            RememberAudioSelections: true, RememberSubtitleSelections: true, EnableNextEpisodeAutoPlay: true,
        },
    }, { username: row.username });
    return Response.json({
        User: user,
        AccessToken: token,
        ServerId: up.serverId,
        SessionInfo: {
            UserId: up.userId, UserName: row.username, ServerId: up.serverId, Id: randomHex(16),
            DeviceId: device, DeviceName: field('Device'), Client: field('Client'), ApplicationVersion: field('Version'),
            SupportsRemoteControl: false, PlayableMediaTypes: ['Audio', 'Video'], SupportedCommands: [],
        },
    }, { headers: { 'Access-Control-Allow-Origin': '*' } });
}
