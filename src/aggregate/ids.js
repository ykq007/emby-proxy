// 聚合端 Id ↔ 节点 Id 的全部编码规则。只有这里拼 / 拆 Id，调用方不切字符串、不对 Id 做算术。
//
// 推出的季 / 集 Id：不存表，由编号推出（vid 从 1001 起，推出的 Id 都 ≥ 1e9，与目录 vid 不重叠）。
//   集 = vid * 1e6 + 季 * 1000 + 集号（季 0–998，集 0–999；超出范围的集不收录）
//   季 = vid * 1e6 + 999000 + 季
// 版本（媒体源）Id：`<节点前缀>~<节点上的媒体源 Id>`，之后的流 / 进度请求凭它找回节点。
// 节点地址：节点给的相对流地址 → /n/<前缀>/<节点路径>（去掉 /emby）；
//   没问过节点的附加版本 → /n/<前缀>/ea-play/<节点条目 Id>/<节点媒体源 Id 或 _>/stream。
const M = 1e6;
const SEASON_BASE = 999000;
const DERIVED_MIN = 1e9;
const SEP = '~';

export function decodeId(id) {
    const n = Number(id);
    if (!/^\d+$/.test(String(id)) || !Number.isSafeInteger(n) || n < DERIVED_MIN) return null;
    const vid = Math.floor(n / M), r = n % M;
    if (r >= SEASON_BASE) return { vid, season: r - SEASON_BASE };
    return { vid, season: Math.floor(r / 1000), episode: r % 1000 };
}
export const seasonId = (vid, s) => String(Number(vid) * M + SEASON_BASE + s);
export const episodeId = (vid, s, e) => String(Number(vid) * M + s * 1000 + e);
export const okSeason = (s) => Number.isInteger(s) && s >= 0 && s < 999;
export const okEpisode = (e) => Number.isInteger(e) && e >= 0 && e < 1000;

export const encodeMsid = (prefix, id) => `${prefix}${SEP}${id}`;
// prefixes：viewer 能用的节点；不在其中的前缀当作不是版本 Id。
export function decodeMsid(v, prefixes) {
    const s = String(v || ''); const i = s.indexOf(SEP);
    if (i < 1) return null;
    const prefix = s.slice(0, i);
    return prefixes.includes(prefix) ? { prefix, id: s.slice(i + 1) } : null;
}
// 看起来是版本 Id（客户端把它放在 /Videos/{vid}/<版本 Id>/… 路径里时用）。
export const hasMsid = (v) => String(v || '').indexOf(SEP) > 0;

// 节点给的地址 → 节点上的路径（去掉 /emby 前缀；相对地址补 /）。绝对地址原样返回：
// 它们已由 proxy/forward.js 像生产代理那样改写成 /n/<前缀>/<绝对地址>。
export function nodePath(u) {
    let p = String(u);
    if (/^https?:\/\//i.test(p)) return p;
    if (!p.startsWith('/')) p = '/' + p;
    return p.replace(/^\/emby(?=\/)/i, '');
}
export const nodeBase = (prefix) => `/n/${encodeURIComponent(prefix)}`;
export const nodeUrl = (prefix, u) => (!u || /^https?:\/\//i.test(String(u)) ? u : nodeBase(prefix) + nodePath(u));
export const lazyUrl = (prefix, itemId, msid, token) =>
    `${nodeBase(prefix)}/ea-play/${encodeURIComponent(itemId)}/${msid ? encodeURIComponent(msid) : '_'}/stream?api_key=${token}`;

// 客户端常在节点地址前加 /emby（如 Hills）。返回 { prefix, rest } 或 { prefix, lazy: { itemId, msid } }，不是节点地址返回 null。
const NODE_RE = /^\/(?:emby\/|mediabrowser\/)?n\/([^/]+)(\/.*)$/i;
const LAZY_RE = /^\/ea-play\/([^/]+)\/([^/]+)\/[^/]+$/i;
export function parseNodeUrl(path) {
    const m = NODE_RE.exec(path);
    if (!m) return null;
    const prefix = decodeURIComponent(m[1]);
    const l = LAZY_RE.exec(m[2]);
    if (!l) return { prefix, rest: m[2] };
    const msid = decodeURIComponent(l[2]);
    return { prefix, lazy: { itemId: decodeURIComponent(l[1]), msid: msid === '_' ? '' : msid } };
}
