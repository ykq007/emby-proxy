// AUTO-GENERATED from src/ — do not edit directly. Run 'npm run build'.
function F(t,e,...s){return t.DB.prepare(e).bind(...s).run()}function R(t,e,...s){return t.DB.prepare(e).bind(...s).all()}function x(t,e,...s){return t.DB.prepare(e).bind(...s).first()}function _(t,e,...s){return t.DB.prepare(e).bind(...s)}function N(t,e){return t.DB.batch(e)}var ht="schema_version",lt="manual_redirect_domains",et="proxy_country_allowlist",st="hotlink_allow_hosts",pe="emby_last_rollup_ts",at="tg_alerts_muted_until_ts",St="emby_shared_username",Et="emby_shared_password_enc",me="optimized_vps789_fetched_at";function $a(t){if(!t)return null;let e=new Set(String(t).split(",").map(s=>s.trim().toUpperCase()).filter(Boolean));return e.size?e:null}function za(t){let e=t instanceof Set?[...t]:Array.isArray(t)?t:String(t||"").split(",");return[...new Set(e.map(o=>String(o||"").trim().toUpperCase()).filter(Boolean))].join(",")}function Ga(t){if(!t)return null;let e=new Set(String(t).split(/[,\n]/).map(s=>s.trim().toLowerCase()).filter(Boolean));return e.size?e:null}function Wa(t){let e=t instanceof Set?[...t]:Array.isArray(t)?t:String(t||"").split(/[,\n]/);return[...new Set(e.map(o=>String(o||"").trim().toLowerCase()).filter(Boolean))].join(",")}function Ka(t){let e=t?parseInt(t,10):0;return Number.isFinite(e)&&e>0?e:0}function Ya(t){return String(parseInt(t,10)||0)}var Bt={[et]:{parse:$a,serialize:za},[st]:{parse:Ga,serialize:Wa},[at]:{parse:Ka,serialize:Ya}},Xa={parse:t=>t==null?null:String(t),serialize:t=>t==null?"":String(t)};function ue(t){return Bt[t]||Xa}var Ke=Bt[et],Ye=Bt[st],cr=Bt[at];async function H(t,e){if(!t?.DB)return ue(e).parse(null);let s=await x(t,"SELECT v FROM kv_config WHERE k = ?",e);return ue(e).parse(s?s.v:null)}function At(t,e,s){let o=ue(e).serialize(s);return _(t,"INSERT OR REPLACE INTO kv_config (k, v, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",e,o)}async function ot(t,e,s){return At(t,e,s).run()}async function Ft(t,e){return F(t,"DELETE FROM kv_config WHERE k = ?",e)}var Xe=new Set(["api","admin","__client_rtt__","login","logout","assets","static","public","health","healthz","ping","status","emby","web","stats","favicon.ico","robots.txt","apple-touch-icon","sw.js","manifest.json","cdn-cgi"]),Ve=/^[a-z0-9][a-z0-9_-]{0,63}$/i;function Pt(t){let e=String(t||"").trim();return e?Ve.test(e)?Xe.has(e.toLowerCase())?`\u522B\u540D "${e}" \u4E3A\u7CFB\u7EDF\u4FDD\u7559\u524D\u7F00`:null:"\u522B\u540D\u683C\u5F0F\u975E\u6CD5\uFF08\u4EC5\u5141\u8BB8\u5B57\u6BCD/\u6570\u5B57/_/-\uFF0C\u4E14\u4E0D\u8D85\u8FC7 64 \u4F4D\uFF0C\u4E0D\u80FD\u4EE5\u7279\u6B8A\u5B57\u7B26\u5F00\u5934\uFF09":"\u522B\u540D\u4E3A\u7A7A"}var fe=["cn-beijing-data.aliyundrive.net","cn-shenzhen-data.aliyundrive.net","alicdn-adrive-cn-data-yk.alicdn.com","115.com","115cdn.com","anxia.com","pcs.drive.quark.cn","video-pcs.drive.quark.cn","mypikpak.com","mypikpak.net","aliyuncs.com","myqcloud.com","myhuaweicloud.com","cos.ap-shanghai.myqcloud.com"];function vt(t){return(Array.isArray(t)?t:[]).map(s=>String(s||"").trim().toLowerCase()).filter(s=>s&&/^[a-z0-9.-]+$/.test(s))}function Ht(t){return vt(String(t||"").split(`
`))}function Je(t){return vt(t).join(`
`)}function Ct(t,e){if(!t||!e||e.size===0)return!1;let s=t.toLowerCase();if(e.has(s))return!0;for(let o of e)if(s.endsWith("."+o))return!0;return!1}function he(t){return t?.MANUAL_REDIRECT_ALLOWLIST||null}async function jt(t){let e=he(t);if(e?.readDomains)return vt(await e.readDomains());if(!t?.DB)return[];let s=await x(t,`SELECT v FROM kv_config WHERE k = '${lt}'`);return Ht(s?.v||"")}async function ye(t,e){let s=vt(e),o=he(t);return o?.writeDomains&&await o.writeDomains(s),t?.DB&&await F(t,`INSERT OR REPLACE INTO kv_config (k, v, updated_at) VALUES ('${lt}', ?, CURRENT_TIMESTAMP)`,Je(s)),s}async function be(t){let e=he(t);return e?.readHosts?e.readHosts():new Set(await jt(t))}var Ze=[{domain:"cf.090227.xyz",note:"ZhiXuanWang \u4F18\u9009\u5408\u96C6"},{domain:"cf.zhetengsha.eu.org",note:"\u793E\u533A\u7EF4\u62A4"},{domain:"cdn.2020111.xyz",note:"2020111 \u63A8\u9001"},{domain:"xn--b6gac.eu.org",note:"IPv6 \u53CB\u597D"},{domain:"cloudflare.182682.xyz",note:"182682 \u63A8\u9001"},{domain:"cf.877771.xyz",note:"877771 \u63A8\u9001"},{domain:"cf.0sm.com",note:"0sm \u63A8\u9001"},{domain:"visa.com.sg",note:"\u4E9A\u592A\u4F4E\u5EF6\u8FDF"},{domain:"visa.com.hk",note:"\u9999\u6E2F"},{domain:"time.is",note:"\u6B27\u6D32\u4F4E\u5EF6\u8FDF"},{domain:"cf-ns.com",note:"\u901A\u7528"},{domain:"icook.tw",note:"\u53F0\u6E7E"}];async function Qe(t){let e=Date.now(),s=new AbortController,o=setTimeout(()=>s.abort(),4e3);try{let a=await fetch(`https://${t}/cdn-cgi/trace`,{method:"HEAD",redirect:"manual",signal:s.signal,cf:{cacheTtl:0}});return clearTimeout(o),a.status>=500?{ms:-1,ok:!1}:{ms:Date.now()-e,ok:!0}}catch{return clearTimeout(o),{ms:-1,ok:!1}}}async function qe(t){if(!t.DB)return null;try{return await H(t,et)}catch{return null}}async function ts(t){if(!t.DB)return null;try{return await H(t,st)}catch{return null}}var _e=!1,es=1;async function M(t){if(!(_e||!t.DB))try{let e=null;try{let r=await x(t,"SELECT v FROM kv_config WHERE k = ?",ht);e=r?r.v:null}catch{e=null}if(e===String(es)){_e=!0;return}await t.DB.exec("CREATE TABLE IF NOT EXISTS routes (prefix TEXT PRIMARY KEY, target TEXT NOT NULL)"),await t.DB.exec("CREATE TABLE IF NOT EXISTS request_stats (prefix TEXT, date TEXT, count INTEGER DEFAULT 0, PRIMARY KEY(prefix, date))"),await t.DB.exec("CREATE TABLE IF NOT EXISTS visitor_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, prefix TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, ip TEXT, country TEXT, ua TEXT)");try{await t.DB.exec("ALTER TABLE routes ADD COLUMN mode TEXT DEFAULT 'off'")}catch{}try{await t.DB.exec("ALTER TABLE routes ADD COLUMN remark TEXT DEFAULT ''")}catch{}try{await t.DB.exec("ALTER TABLE routes ADD COLUMN group_name TEXT DEFAULT ''")}catch{}try{await t.DB.exec("ALTER TABLE routes ADD COLUMN last_play TEXT DEFAULT ''")}catch{}try{await t.DB.exec("ALTER TABLE routes ADD COLUMN icon TEXT DEFAULT ''")}catch{}try{await t.DB.exec("ALTER TABLE routes ADD COLUMN cache_img TEXT DEFAULT 'on'")}catch{}try{await t.DB.exec("ALTER TABLE routes ADD COLUMN sort_order INTEGER DEFAULT 0")}catch{}try{await t.DB.exec("ALTER TABLE routes ADD COLUMN custom_headers TEXT DEFAULT ''")}catch{}try{await t.DB.exec("ALTER TABLE routes ADD COLUMN backend_url TEXT DEFAULT ''")}catch{}try{await t.DB.exec("ALTER TABLE routes ADD COLUMN keepalive_days INTEGER DEFAULT 0")}catch{}try{await t.DB.exec("ALTER TABLE routes ADD COLUMN keepalive_last_played_at INTEGER DEFAULT 0")}catch{}try{await t.DB.exec("ALTER TABLE routes ADD COLUMN keepalive_last_reminded_at INTEGER DEFAULT 0")}catch{}await t.DB.exec("CREATE TABLE IF NOT EXISTS kv_config (k TEXT PRIMARY KEY, v TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)"),await t.DB.exec("CREATE TABLE IF NOT EXISTS optimized_domains (id INTEGER PRIMARY KEY AUTOINCREMENT, domain TEXT NOT NULL UNIQUE, note TEXT DEFAULT '', builtin INTEGER DEFAULT 0, enabled INTEGER DEFAULT 1, last_ms INTEGER DEFAULT -1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"),await t.DB.exec("CREATE TABLE IF NOT EXISTS dns_config (id INTEGER PRIMARY KEY CHECK (id = 1), cf_api_token TEXT DEFAULT '', cf_zone_id TEXT DEFAULT '', cf_record_id TEXT DEFAULT '', target_alias TEXT DEFAULT '', updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)");try{await t.DB.exec("ALTER TABLE routes ADD COLUMN show_on_status INTEGER DEFAULT 0")}catch{}try{await t.DB.exec("ALTER TABLE routes ADD COLUMN public_alias TEXT DEFAULT ''")}catch{}try{await t.DB.exec("ALTER TABLE routes ADD COLUMN media_counts_auto_auth INTEGER DEFAULT 0")}catch{}try{await t.DB.exec("ALTER TABLE routes ADD COLUMN emby_auth_cache TEXT DEFAULT ''")}catch{}try{await t.DB.exec("ALTER TABLE routes ADD COLUMN emby_auth_seen_at INTEGER DEFAULT 0")}catch{}try{await t.DB.exec("ALTER TABLE routes ADD COLUMN emby_auth_used_at INTEGER DEFAULT 0")}catch{}try{await t.DB.exec("ALTER TABLE routes ADD COLUMN emby_username TEXT DEFAULT ''")}catch{}try{await t.DB.exec("ALTER TABLE routes ADD COLUMN emby_password_enc TEXT DEFAULT ''")}catch{}try{await t.DB.exec("ALTER TABLE routes ADD COLUMN monitor_enabled INTEGER DEFAULT 1")}catch{}let s=async(r,i,n,c)=>{try{await R(t,`SELECT ${c} FROM ${r} LIMIT 0`)}catch(l){if(/no such column|no such table/i.test(l.message||""))try{await t.DB.exec(`DROP TABLE IF EXISTS ${r}`)}catch{}}await t.DB.exec(i),n&&await t.DB.exec(n)};await s("emby_probes","CREATE TABLE IF NOT EXISTS emby_probes (prefix TEXT NOT NULL, ts INTEGER NOT NULL, ok INTEGER NOT NULL, ms INTEGER NOT NULL, status INTEGER DEFAULT 0, PRIMARY KEY(prefix, ts))","CREATE INDEX IF NOT EXISTS idx_emby_probes_prefix_ts ON emby_probes(prefix, ts)","ms"),await s("emby_probe_hourly","CREATE TABLE IF NOT EXISTS emby_probe_hourly (prefix TEXT NOT NULL, hour_ts INTEGER NOT NULL, ok_count INTEGER NOT NULL, fail_count INTEGER NOT NULL, avg_ms INTEGER NOT NULL, p95_ms INTEGER NOT NULL, PRIMARY KEY(prefix, hour_ts))",null,"hour_ts"),await t.DB.exec("CREATE TABLE IF NOT EXISTS emby_probe_state (prefix TEXT PRIMARY KEY, first_fail_at INTEGER DEFAULT 0, last_alert_at INTEGER DEFAULT 0, alert_kind TEXT DEFAULT 'none')"),await t.DB.exec("CREATE TABLE IF NOT EXISTS emby_media_counts (prefix TEXT NOT NULL, day TEXT NOT NULL, movies INTEGER DEFAULT 0, series INTEGER DEFAULT 0, episodes INTEGER DEFAULT 0, artists INTEGER DEFAULT 0, albums INTEGER DEFAULT 0, songs INTEGER DEFAULT 0, music_videos INTEGER DEFAULT 0, box_sets INTEGER DEFAULT 0, books INTEGER DEFAULT 0, PRIMARY KEY(prefix, day))"),await t.DB.exec("CREATE TABLE IF NOT EXISTS emby_media_counts_live (prefix TEXT PRIMARY KEY, movies INTEGER DEFAULT 0, series INTEGER DEFAULT 0, episodes INTEGER DEFAULT 0, artists INTEGER DEFAULT 0, albums INTEGER DEFAULT 0, songs INTEGER DEFAULT 0, music_videos INTEGER DEFAULT 0, box_sets INTEGER DEFAULT 0, books INTEGER DEFAULT 0, updated_at INTEGER DEFAULT 0, last_scan_end INTEGER DEFAULT 0)");for(let r of["artists","albums","songs","music_videos","box_sets","books"]){try{await t.DB.exec(`ALTER TABLE emby_media_counts ADD COLUMN ${r} INTEGER DEFAULT 0`)}catch{}try{await t.DB.exec(`ALTER TABLE emby_media_counts_live ADD COLUMN ${r} INTEGER DEFAULT 0`)}catch{}}await t.DB.exec("CREATE TABLE IF NOT EXISTS route_bandwidth_today (prefix TEXT NOT NULL, day TEXT NOT NULL, bytes INTEGER DEFAULT 0, updated_at INTEGER DEFAULT 0, PRIMARY KEY(prefix, day))"),await t.DB.exec("CREATE TABLE IF NOT EXISTS auth_rl (ip TEXT NOT NULL, win INTEGER NOT NULL, n INTEGER DEFAULT 0, PRIMARY KEY(ip, win))"),await t.DB.exec("CREATE TABLE IF NOT EXISTS ip_bans (ip TEXT PRIMARY KEY, until INTEGER NOT NULL, reason TEXT DEFAULT '')"),await t.DB.exec("CREATE TABLE IF NOT EXISTS scan_rl (ip TEXT NOT NULL, win INTEGER NOT NULL, n INTEGER DEFAULT 0, PRIMARY KEY(ip, win))");let o=Ze.map(r=>_(t,"INSERT OR IGNORE INTO optimized_domains (domain, note, builtin, enabled) VALUES (?, ?, 1, 1)",r.domain,r.note));o.length&&await N(t,o),await x(t,`SELECT v FROM kv_config WHERE k = '${lt}'`)||await F(t,`INSERT INTO kv_config (k, v) VALUES ('${lt}', ?)`,fe.join(`
`)),await F(t,"INSERT OR REPLACE INTO kv_config (k, v, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",ht,String(es)),_e=!0}catch(e){console.log("ensureSchema error:",e.message)}}function Ee(t=Date.now()){return new Date(t+288e5)}function K(t=Date.now()){return Ee(t).toISOString().split("T")[0]}function ge(t=Date.now()){let e=new Date(t),s=Ee(t);s.setUTCHours(0,0,0,0);let o=new Date(s.getTime()-288e5);return{start:o,end:e,startIso:o.toISOString(),endIso:e.toISOString(),day:K(t)}}function pt(t=Date.now()){return Ee(t).toISOString().replace("T"," ").slice(0,19)}function O(t){return String(t??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function rt(t){if(t=Math.max(0,t|0),t>=86400){let e=Math.floor(t/86400),s=Math.floor(t%86400/3600);return`${e}d${s}h`}if(t>=3600){let e=Math.floor(t/3600),s=Math.floor(t%3600/60);return`${e}h${s}m`}if(t>=60){let e=Math.floor(t/60),s=t%60;return`${e}m${s}s`}return`${t}s`}function we(t){if(!t)return{};let e={},s=String(t);try{let o=JSON.parse(s);if(o&&typeof o=="object"){for(let a of Object.keys(o))/^[A-Za-z0-9_\-]+$/.test(a)&&(e[a]=String(o[a]));return e}}catch{}for(let o of s.split(/\r?\n/)){let a=/^\s*([A-Za-z0-9_\-]+)\s*:\s*(\S.*?)\s*$/.exec(o);a&&(e[a[1]]=a[2])}return e}function ss(t){if(!t)return null;let e=String(t),s=[];try{let o=JSON.parse(e);if(o&&typeof o=="object")for(let a of Object.keys(o))s.push(`${a}: ${o[a]}`)}catch{s=e.split(/\r?\n/)}for(let o of s){let a=/^\s*(X-Emby-Token|X-MediaBrowser-Token)\s*:\s*(\S.*)$/i.exec(o);if(a)return a[2].trim()}return null}function as(t,e,s){let o=String(e||"forward"),a=['MediaBrowser Client="Forward"','Device="Forward"','DeviceId="'+o.replace(/"/g,"")+'"','Version="1.0.0"','Token="'+String(t||"").replace(/"/g,"")+'"'].join(", "),r={Accept:"application/json",Authorization:a,"X-Emby-Authorization":a,"X-Emby-Client":"Forward","X-Emby-Device-Name":"Forward","X-Emby-Device-Id":o,"X-Emby-Client-Version":"1.0.0","X-Emby-Token":t};return s&&(r["User-Agent"]=s),r}function os(t,e){let s=String(t||"forward"),o=['MediaBrowser Client="Forward"','Device="Forward"','DeviceId="'+s.replace(/"/g,"")+'"','Version="1.0.0"'].join(", "),a={Accept:"application/json","Content-Type":"application/json",Authorization:o,"X-Emby-Authorization":o,"X-Emby-Client":"Forward","X-Emby-Device-Name":"Forward","X-Emby-Device-Id":s,"X-Emby-Client-Version":"1.0.0"};return e&&(a["User-Agent"]=e),a}function Te(t,e,s,o){let a=new Headers(t.headers);a.set("Host",e.host),a.delete("Accept-Encoding");let r=t.headers.get("cf-connecting-ip")||t.headers.get("x-real-ip")||(t.headers.get("x-forwarded-for")||"").split(",")[0].trim();return a.delete("cf-connecting-ip"),a.delete("cf-ipcountry"),a.delete("cf-ray"),a.delete("cf-visitor"),a.delete("x-forwarded-for"),a.delete("x-real-ip"),s==="realip_only"&&r?a.set("X-Real-IP",r):s==="dual"&&r?(a.set("X-Real-IP",r),a.set("X-Forwarded-For",r)):s==="strict"&&(a.delete("X-Forwarded-Proto"),a.delete("X-Forwarded-Host"),a.set("Origin",e.origin),a.set("Referer",e.origin+"/"),r&&(a.set("X-Real-IP",r),a.set("X-Forwarded-For",r))),o&&o.split(`
`).forEach(i=>{let n=i.indexOf(":");if(n>0){let c=i.slice(0,n).trim(),l=i.slice(n+1).trim();c&&a.set(c,l)}}),a}var V=["movies","series","episodes","artists","albums","songs","music_videos","box_sets","books"],Va={movies:"MovieCount",series:"SeriesCount",episodes:"EpisodeCount",artists:"ArtistCount",albums:"AlbumCount",songs:"SongCount",music_videos:"MusicVideoCount",box_sets:"BoxSetCount",books:"BookCount"};function rs(t){if(!t)return null;let e={};for(let s of V)e[s]=Number(t[Va[s]]||0)|0;return e}function $t(t){if(!t)return null;let e={};for(let s of V)e[s]=t[s]|0;return e.updated_at=t.updated_at|0,e}function ns(t){let e=0;for(let s of V)e+=t[s]|0;return e}function is(t,e){if(!t||!e)return null;let s={};for(let o of V)s[o]=(t[o]|0)-(e[o]|0);return s}var Ja="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";function cs(t){return t?String(t).replace(/\/+$/,""):""}function ls(t,e,s,o){let a=as(t,e,s),r=we(o);for(let i of Object.keys(r))a[i]=r[i];return a}async function xe(t,e,s={}){let o=cs(t),a=Array.isArray(e)?e:[e];if(!o||a.length===0)return null;let r=s.fetchImpl||fetch,i=s.timeoutMs||1e4,n=new AbortController,c=setTimeout(()=>n.abort(),i);try{let l=null;for(let u of a){let p=await r(o+u,{method:s.method||"GET",redirect:"manual",signal:n.signal,headers:s.headers||{},body:s.body,cf:{cacheTtl:0}});if(l=p,p.status===404&&u!==a[a.length-1]){p.body?.cancel().catch(()=>{});continue}break}if(clearTimeout(c),!l)return null;if(l.status===401||l.status===403)return l.body?.cancel().catch(()=>{}),{unauthorized:!0};if(!l.ok)return l.body?.cancel().catch(()=>{}),null;let d=await l.json().catch(()=>null);return d==null?null:{data:d}}catch{return clearTimeout(c),null}}async function Za(t,e,s={}){let o=cs(t),a=Array.isArray(e)?e:[e];if(!o||a.length===0)return null;let r=s.fetchImpl||fetch,i=s.timeoutMs||1e4;try{let n=null;for(let c of a){let l=new AbortController,d=setTimeout(()=>l.abort(),i);try{n=await r(o+c,{method:s.method||"GET",redirect:"manual",signal:l.signal,headers:s.headers||{},cf:{cacheTtl:0}})}finally{clearTimeout(d)}if(n.body?.cancel().catch(()=>{}),!(n.status===404&&c!==a[a.length-1]))break}return n?{status:n.status}:null}catch{return null}}async function Re(t,e,s,o,a,r={}){if(!t||!e)return null;let i="Recursive=true&api_key="+encodeURIComponent(e),n=ls(e,o,a,s),c=await xe(t,["/emby/Items/Counts?"+i,"/Items/Counts?"+i],{headers:n,timeoutMs:15e3,fetchImpl:r.fetchImpl});return c?c.unauthorized?{unauthorized:!0}:rs(c.data):null}function Qa(t){if(!Array.isArray(t))return 0;let e=0;for(let s of t){let o=String(s?.Key||"").toLowerCase();if(o!=="refreshlibrary"&&!o.includes("library"))continue;let a=s?.LastExecutionResult?.EndTimeUtc;if(!a)continue;let r=Math.floor(Date.parse(a)/1e3);r>e&&(e=r)}return e}async function ke(t,e,s,o,a,r={}){if(!t||!e)return 0;let i="api_key="+encodeURIComponent(e),n=ls(e,o,a,s),c=await xe(t,["/emby/ScheduledTasks?"+i,"/ScheduledTasks?"+i],{headers:n,timeoutMs:5e3,fetchImpl:r.fetchImpl});return c?c.unauthorized?-1:Qa(c.data):0}async function ds(t,e,s,o,a,r={}){if(!t||!e||!o)return null;let i=os(a,o),n=JSON.stringify({Username:e,Pw:s||""}),c=await xe(t,["/emby/Users/AuthenticateByName","/Users/AuthenticateByName"],{method:"POST",headers:i,body:n,timeoutMs:1e4,fetchImpl:r.fetchImpl});if(!c)return null;if(c.unauthorized)return{unauthorized:!0};let l=c.data&&(c.data.AccessToken||c.data.accessToken);return l?{token:l}:null}async function us(t,e,s={}){let o=Date.now(),a=we(e),r=await Za(t,["/emby/System/Info/Public","/System/Info/Public","/emby/Users/Public"],{timeoutMs:8e3,fetchImpl:s.fetchImpl,headers:{"User-Agent":Ja,Accept:"application/json,text/plain,*/*","X-Forward-Probe":"1",...a}}),i=Date.now()-o;return r?{ok:r.status>=200&&r.status<400||r.status===401||r.status===403,ms:i,status:r.status}:{ok:!1,ms:i,status:0}}async function Se(t,e,s){if(!t.TG_BOT_TOKEN)return{ok:!1,error:"no TG_BOT_TOKEN"};let o=`https://api.telegram.org/bot${t.TG_BOT_TOKEN}/${e}`,a=()=>fetch(o,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(s)});try{let r=await a();if(r.ok)return await r.json();let i=await r.text();if(r.status===429){let n=1;try{let l=JSON.parse(i);l?.parameters?.retry_after&&(n=l.parameters.retry_after)}catch{}if(n>5)return console.warn(`tgApi ${e} 429 retry_after=${n}s > 5s, deferring`),{ok:!1,status:429,description:i,retry_after:n};let c=Math.max(0,n)*1e3;await new Promise(l=>setTimeout(l,c));try{let l=await a();if(l.ok)return await l.json();let d=await l.text();return console.warn(`tgApi ${e} retry-nok`,l.status,d),{ok:!1,status:l.status,description:d}}catch(l){return console.warn(`tgApi ${e} retry-exception`,l.message),{ok:!1,error:l.message}}}return console.warn(`tgApi ${e} nok`,r.status,i),{ok:!1,status:r.status,description:i}}catch(r){return console.warn(`tgApi ${e} exception`,r.message),{ok:!1,error:r.message}}}async function P(t,e){let s={chat_id:e.chat_id,text:e.text,parse_mode:e.parse_mode||"HTML"};return e.reply_markup!==void 0&&(s.reply_markup=e.reply_markup),e.disable_web_page_preview!==void 0&&(s.disable_web_page_preview=e.disable_web_page_preview),Se(t,"sendMessage",s)}async function ps(t,e){let s={chat_id:e.chat_id,message_id:e.message_id,text:e.text,parse_mode:e.parse_mode||"HTML"};e.reply_markup!==void 0&&(s.reply_markup=e.reply_markup);try{let o=await Se(t,"editMessageText",s);return!o.ok&&typeof o.description=="string"&&o.description.includes("message is not modified"),o}catch(o){return console.warn("tgEditMessageText exception",o.message),{ok:!1,error:o.message}}}async function ms(t,e){return Se(t,"answerCallbackQuery",e)}function j(t,e){return{text:t,callback_data:e}}function gt(){return{inline_keyboard:[[j("\u{1F504} \u5237\u65B0","s:r"),j("\u23F0 \u4FDD\u53F7\u63D0\u9192","k:r")],[j("\u{1F507} \u9759\u97F3 30m","m:30"),j("\u{1F507} \u9759\u97F3 2h","m:120")]]}}function Ae(){return{inline_keyboard:[[j("\u{1F504} \u5237\u65B0","k:r"),j("\u{1F4CA} \u8282\u70B9\u72B6\u6001","s:r")]]}}function fs(t){return{inline_keyboard:[[j("\u{1F504} \u5237\u65B0\u8282\u70B9",`n:r:${t}`),j("\u{1F4CB} \u8FD4\u56DE\u5217\u8868","l:r")]]}}function hs(t){return{inline_keyboard:[[j("\u{1F50D} \u8282\u70B9\u8BE6\u60C5",`n:v:${t}`)],[j("\u{1F507} \u9759\u97F3 30m","m:30"),j("\u{1F507} \u9759\u97F3 2h","m:120")]]}}function ys(){return{inline_keyboard:[[j("\u{1F504} \u5237\u65B0\u4FDD\u53F7","k:r"),j("\u{1F4CA} \u8282\u70B9\u72B6\u6001","s:r")]]}}function bs(){return{inline_keyboard:[[j("\u{1F507} 30m","m:30"),j("\u{1F507} 2h","m:120"),j("\u{1F507} 1d","m:1440")]]}}function _s(t){return{inline_keyboard:t.slice(0,8).map(({prefix:s,label:o})=>[j(`\u{1F50D} ${o}`,`n:v:${s}`)])}}var qa=6e4,Dt={data:null,loadedAt:0};function Es(t={}){return{routesMap:new Map,countrySet:null,hotlinkSet:null,manualRedirectSet:new Set,schemaVersion:null,ok:!0,...t}}async function ve(t){let e=Date.now();if(Dt.data&&e-Dt.loadedAt<qa)return{config:Dt.data,cacheHit:!0,loadMs:0};if(!t||!t.DB)return{config:Es({ok:!1}),cacheHit:!1,loadMs:0};let s=Date.now();try{let o=[_(t,`SELECT ${gs} FROM routes`),_(t,"SELECT k, v FROM kv_config WHERE k IN (?, ?, ?, ?)",et,st,lt,ht)],[a,r]=await N(t,o),i=new Map;for(let d of a?.results||[])d&&d.prefix&&i.set(d.prefix,d);let n=new Map;for(let d of r?.results||[])d&&d.k!==void 0&&n.set(d.k,d.v);let c={routesMap:i,countrySet:Ke.parse(n.get(et)),hotlinkSet:Ye.parse(n.get(st)),manualRedirectSet:new Set(Ht(n.get(lt)||"")),schemaVersion:n.has(ht)?n.get(ht):null,ok:!0},l=Date.now();return Dt={data:c,loadedAt:l},{config:c,cacheHit:!1,loadMs:l-s}}catch(o){return{config:Es({ok:!1,error:o}),cacheHit:!1,loadMs:Date.now()-s}}}function yt(){Dt.data=null}var ws=Object.freeze(["prefix","target","mode","cache_img","custom_headers","media_counts_auto_auth","keepalive_days"]),gs=ws.join(", "),Hr=Object.freeze(["prefix","public_alias","remark"]),to=Object.freeze(["prefix","public_alias","remark","icon","sort_order","media_counts_auto_auth"]),Ce=to.join(", "),eo=Object.freeze(["prefix","target","remark","public_alias","custom_headers","show_on_status","media_counts_auto_auth","emby_auth_cache"]),Ts=eo.join(", "),so=Object.freeze(["prefix","remark","public_alias","keepalive_days","keepalive_last_played_at","keepalive_last_reminded_at"]),Wt=so.join(", "),ao=Object.freeze(["prefix","remark","public_alias","last_play","keepalive_days","keepalive_last_played_at","mode"]),xs=ao.join(", "),De=Object.freeze(["prefix","remark","public_alias"]),Me=De.join(", ");function Rs(t,e){return e.map(s=>`${t}.${s} AS ${s}`).join(", ")}var oo=Object.freeze(["prefix","target","custom_headers","emby_auth_cache","emby_username","emby_password_enc"]),wt=oo.join(", "),Tt="prefix",ks="prefix, remark",ro=Object.freeze(["emby_username","emby_password_enc","emby_auth_cache"]),Ss=ro.join(", "),no=Object.freeze(["sort_order","show_on_status","public_alias","media_counts_auto_auth","monitor_enabled","last_play","emby_auth_cache","emby_auth_seen_at","emby_auth_used_at","keepalive_last_played_at","keepalive_last_reminded_at","emby_username","emby_password_enc"]),Oe=no.join(", "),zt=Object.freeze(["prefix","target","mode","remark","group_name","last_play","icon","cache_img","sort_order","custom_headers","backend_url","show_on_status","public_alias","media_counts_auto_auth","keepalive_days","keepalive_last_played_at","keepalive_last_reminded_at"]),Gt=Object.freeze(["prefix","target","mode","remark","group_name","icon","cache_img","sort_order","custom_headers","backend_url","show_on_status","public_alias","media_counts_auto_auth","monitor_enabled","last_play","emby_auth_cache","emby_auth_seen_at","emby_auth_used_at","keepalive_days","keepalive_last_played_at","keepalive_last_reminded_at","emby_username","emby_password_enc"]);function J(t){return t&&(t.public_alias||t.remark||t.prefix)||""}function io(t){return!t||!t.length?!1:t.some(e=>ws.includes(e))}function Mt(t){io(t)&&yt()}async function nt(t,e,s){let o=Object.keys(s||{});if(!o.length)return;let a=o.map(i=>`${i} = ?`).join(", "),r=o.map(i=>s[i]);await F(t,`UPDATE routes SET ${a} WHERE prefix = ?`,...r,e),Mt(o)}async function As(t,e){let s=Array.isArray(e)?e:[];if(!s.length)return;let o=s.map(a=>_(t,"UPDATE routes SET sort_order = ? WHERE prefix = ?",a.sort_order,a.prefix));await N(t,o),Mt(["sort_order"])}async function vs(t,e){let s=Gt.map(a=>e[a]),o=Gt.map(()=>"?").join(", ");await F(t,`INSERT OR REPLACE INTO routes (${Gt.join(", ")}) VALUES (${o})`,...s),Mt(Gt)}async function Cs(t,e){let s=zt.map(a=>e[a]),o=zt.map(()=>"?").join(", ");await F(t,`INSERT OR REPLACE INTO routes (${zt.join(", ")}) VALUES (${o})`,...s),Mt(zt)}async function Le(t,e){await F(t,"DELETE FROM routes WHERE prefix = ?",e),yt()}async function Ds(t,e,s){return nt(t,e,{keepalive_last_played_at:s,keepalive_last_reminded_at:0})}async function Ms(t,e,s){return nt(t,e,{last_play:s})}async function Os(t,e,s){return nt(t,e,{keepalive_last_played_at:s})}async function Ls(t,e,s){let o=Array.isArray(e)?e:[];if(!o.length)return;let a=o.map(r=>_(t,"UPDATE routes SET keepalive_last_reminded_at = ? WHERE prefix = ?",s,r));await N(t,a),Mt(["keepalive_last_reminded_at"])}async function Ne(t,e,s,o){return nt(t,e,{emby_auth_cache:s,emby_auth_seen_at:o})}async function Kt(t,e,s){let o={emby_auth_cache:"",emby_auth_seen_at:0};return s&&s.clearUsedAt&&(o.emby_auth_used_at=0),nt(t,e,o)}function Ns(t,e,s){return _(t,`UPDATE routes SET emby_auth_cache='', emby_auth_seen_at=0, emby_auth_used_at=0
                            WHERE emby_auth_cache != ''
                              AND emby_auth_seen_at > 0 AND (? - emby_auth_seen_at) > ?
                              AND (emby_auth_used_at = 0 OR (? - emby_auth_used_at) > ?)`,e,s,e,s)}function Is(t,e,s){return _(t,"UPDATE routes SET emby_auth_used_at = ? WHERE prefix = ?",s,e)}function Ie(t){return pt(t*1e3)}function co(t,e,s){let o=Ie(s),a=e.filter(n=>n.kind==="offline"),r=e.filter(n=>n.kind==="recovered");if(e.length===1){let n=e[0],c=O(n.name),l=n.kind==="offline",d=l?`\u{1F6A8} <b>\u8282\u70B9\u544A\u8B66</b>

\u{1F534} <b>${c}</b> \u5DF2\u79BB\u7EBF
\u23F1\uFE0F \u6301\u7EED ${rt(n.duration)}

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F552} ${o} (UTC+8)`:`\u2705 <b>\u8282\u70B9\u6062\u590D</b>

\u{1F7E2} <b>${c}</b> \u5DF2\u6062\u590D
\u23F1\uFE0F \u672C\u6B21\u79BB\u7EBF ${rt(n.duration)}

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F552} ${o} (UTC+8)`,u=l&&n.prefix?hs(n.prefix):void 0;return{chat_id:t,text:d,parse_mode:"HTML",...u?{reply_markup:u}:{}}}let i=[];if(i.push("\u{1F6A8} <b>\u8282\u70B9\u544A\u8B66</b>"),i.push(""),a.length){i.push(`\u{1F534} <b>\u79BB\u7EBF (${a.length})</b>`);for(let n of a)i.push(`  \u2022 ${O(n.name)} \u2014 ${rt(n.duration)}`)}if(r.length){a.length&&i.push(""),i.push(`\u{1F7E2} <b>\u5DF2\u6062\u590D (${r.length})</b>`);for(let n of r)i.push(`  \u2022 ${O(n.name)} \u2014 \u79BB\u7EBF ${rt(n.duration)}`)}return i.push(""),i.push(`\u{1F4CA} \u5171 ${e.length} \u6761\u4E8B\u4EF6\uFF1A\u79BB\u7EBF ${a.length} / \u6062\u590D ${r.length}`),i.push(""),i.push("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501"),i.push(`\u{1F552} ${o} (UTC+8)`),{chat_id:t,text:i.join(`
`),parse_mode:"HTML",reply_markup:gt()}}function lo(t,e,s){let o=[...e].sort((r,i)=>r.remaining-i.remaining),a=[];for(let{route:r,remaining:i}of o){let n=O(J(r));if(i<=0){let c=Math.ceil(Math.abs(i)/86400),l=c>3?"\u{1F6A8}":"\u26A0\uFE0F";a.push(`${l} <b>${n}</b> \u2014 \u5DF2\u8D85\u671F ${c} \u5929`)}else{let c=i<3600?Math.ceil(i/60)+" \u5206\u949F":Math.ceil(i/3600)+" \u5C0F\u65F6";a.push(`\u23F0 <b>${n}</b> \u2014 \u8FD8\u5269\u7EA6 ${c}`)}}return{chat_id:t,text:["\u26A0\uFE0F <b>\u4FDD\u53F7\u63D0\u9192</b>","",a.join(`
`),"","\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501",`\u{1F552} ${Ie(s)} (UTC+8)`].join(`
`),parse_mode:"HTML",reply_markup:ys()}}function uo(t,e){let s=`\u{1F4CA} <b>\u4ECA\u65E5\u53CD\u4EE3\u64AD\u653E\u6570\u636E</b>
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u25B6\uFE0F <b>\u4ECA\u65E5\u603B\u64AD\u653E\u6B21\u6570:</b> ${e.totalStr} \u6B21
\u{1F30D} <b>\u6700\u591A\u8BBF\u95EE\u5730\u533A:</b> ${e.regionStr}
\u{1F680} <b>\u6700\u559C\u6B22\u7684EMBY:</b> ${e.nodeStr}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F310} <b>\u5B9E\u9645\u6D41\u91CF\u6D88\u8017</b>
\u5F53\u5929\u5185: ${O(e.trafficToday)}
\u4E03\u5929\u5185: ${O(e.traffic7d)}
30\u5929\u5185: ${O(e.traffic30d)}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F3C6} <b>\u4ECA\u65E5\u6D41\u91CF\u4E4B\u738B</b>
\u{1F451} ${e.topNodeMsg}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F552} \u66F4\u65B0\u4E8E: ${e.timestamp} (UTC+8)`;return{chat_id:t,text:s,parse_mode:"HTML",reply_markup:gt(),disable_web_page_preview:!0}}function po(t,e){return{chat_id:t,text:`\u{1F9EA} telegram test ok @ ${Ie(e)} (UTC+8)`,parse_mode:"HTML"}}var mo={"probe-alert":{respectsMute:!0,render:(t,{sends:e,now:s})=>co(t,e,s)},"keepalive-reminder":{respectsMute:!0,render:(t,{toRemind:e,now:s})=>lo(t,e,s)},"daily-stats":{respectsMute:!1,render:(t,{stats:e})=>uo(t,e)},"tg-test":{respectsMute:!1,render:(t,{now:e})=>po(t,e)}};async function fo(t,e){try{return await H(t,at)>e}catch{return!1}}async function mt(t,e,s={},o=Math.floor(Date.now()/1e3)){let a=mo[e];if(!a)throw new Error(`notify: unknown notification kind "${e}"`);if(!t.TG_BOT_TOKEN||!t.TG_CHAT_ID)return{ok:!1,skipped:"no-config"};if(a.respectsMute&&await fo(t,o))return{ok:!1,muted:!0,skipped:"muted"};let r=a.render(t.TG_CHAT_ID,{...s,now:o});return P(t,r)}var ho=24*3600,yo=7*86400,bo=900,_o=7*86400;async function Us(t,e){try{let s=await H(t,pe),o=s&&parseInt(s,10)||0;if(Math.floor(e/3600)<=Math.floor(o/3600))return;let a=Math.floor(e/3600)*3600-3600,r=a+3600,{results:i}=await R(t,`
            SELECT prefix,
                   SUM(CASE WHEN ok=1 THEN 1 ELSE 0 END) AS ok_count,
                   SUM(CASE WHEN ok=0 THEN 1 ELSE 0 END) AS fail_count,
                   AVG(ms) AS avg_ms,
                   MAX(ms) AS max_ms
              FROM emby_probes
             WHERE ts >= ? AND ts < ?
          GROUP BY prefix
        `,a,r),n=(i||[]).map(c=>_(t,"INSERT OR REPLACE INTO emby_probe_hourly(prefix, hour_ts, ok_count, fail_count, avg_ms, p95_ms) VALUES(?,?,?,?,?,?)",c.prefix,a,c.ok_count|0,c.fail_count|0,Math.round(c.avg_ms||0),Math.round(c.max_ms||0)));n.push(_(t,"DELETE FROM emby_probes WHERE ts < ?",e-ho)),n.push(_(t,"DELETE FROM emby_probe_hourly WHERE hour_ts < ?",e-yo)),n.push(At(t,pe,e)),n.push(Ns(t,e,_o)),n.length&&await N(t,n)}catch(s){console.log("maybeRollupHourly error:",s.message)}}async function Bs(t,e,s,o){try{let a=await R(t,"SELECT prefix, first_fail_at, last_alert_at, alert_kind FROM emby_probe_state"),r=new Map;for(let d of a.results||[])r.set(d.prefix,d);let i=new Map(e.map(d=>[d.prefix,d])),n=(d,u,p,m)=>_(t,"INSERT OR REPLACE INTO emby_probe_state(prefix, first_fail_at, last_alert_at, alert_kind) VALUES(?,?,?,?)",d,u,p,m),c=[],l=[];for(let d of s){let u=r.get(d.prefix)||{first_fail_at:0,last_alert_at:0,alert_kind:"none"},p=i.get(d.prefix),m=p?J(p):d.prefix;if(d.ok)if(u.alert_kind==="offline"){let b=u.first_fail_at>0?o-u.first_fail_at:0;l.push({kind:"recovered",name:m,duration:b,prefix:d.prefix}),c.push(n(d.prefix,0,o,"recovered"))}else(u.first_fail_at!==0||u.alert_kind!=="none")&&c.push(n(d.prefix,0,u.last_alert_at|0,"none"));else{let b=u.first_fail_at>0?u.first_fail_at:o;u.alert_kind!=="offline"&&o-b>=bo?(l.push({kind:"offline",name:m,duration:o-b,prefix:d.prefix}),c.push(n(d.prefix,b,o,"offline"))):u.first_fail_at===0&&c.push(n(d.prefix,b,u.last_alert_at|0,"none"))}}c.length&&await N(t,c),l.length&&await mt(t,"probe-alert",{sends:l},o)}catch(a){console.log("runAlertFSM error:",a.message)}}function Be(t){let e=String(t||"").split(",").map(s=>s.trim()).filter(Boolean)[0];return e?e.replace(/\/+$/,""):null}async function Eo(t,e){let s=Be(t.target);if(!s)return{prefix:t.prefix,ok:!1,ms:0,status:0};let o=await us(s,t.custom_headers,e);return{prefix:t.prefix,...o}}var Ue=6;async function Fs(t,e=Ue,s){let o=new Array(t.length),a=0;async function r(){for(;;){let n=a++;if(n>=t.length)return;o[n]=await Eo(t[n],s)}}let i=Array.from({length:Math.min(e,t.length)},()=>r());return await Promise.all(i),o}async function Yt(t){try{if(await M(t),!t.DB)return;let e=Math.floor(Date.now()/1e3),{results:s}=await R(t,`
            SELECT ${Ts}
              FROM routes WHERE monitor_enabled = 1
        `);if(!s||!s.length)return;let o=t.EMBY_FETCH?{fetchImpl:t.EMBY_FETCH}:void 0,a=await Fs(s,Ue,o),r=15,i=a.reduce((c,l,d)=>(l.ok||c.push(d),c),[]);if(i.length&&i.length<=r){await new Promise(d=>setTimeout(d,3e3));let c=i.map(d=>s[d]),l=await Fs(c,Ue,o);i.forEach((d,u)=>{a[d]=l[u]})}let n=a.map(c=>_(t,"INSERT OR REPLACE INTO emby_probes(prefix, ts, ok, ms, status) VALUES(?,?,?,?,?)",c.prefix,e,c.ok?1:0,c.ms|0,c.status|0));n.length&&await N(t,n),await Bs(t,s,a,e),await Us(t,e)}catch(e){console.log("probeAll error:",e.message)}}var Ps=new Map;async function Hs(t,e){let s=new TextEncoder().encode(String(t.ADMIN_TOKEN||"")),o=await crypto.subtle.importKey("raw",s,"HKDF",!1,["deriveKey"]);return await crypto.subtle.deriveKey({name:"HKDF",hash:"SHA-256",salt:new TextEncoder().encode(String(e||"")),info:new TextEncoder().encode("emby-proxy:harvested-token")},o,{name:"AES-GCM",length:256},!1,["encrypt","decrypt"])}function Xt(t){let e="";for(let s=0;s<t.length;s++)e+=String.fromCharCode(t[s]);return btoa(e)}function Vt(t){let e=atob(t),s=new Uint8Array(e.length);for(let o=0;o<e.length;o++)s[o]=e.charCodeAt(o);return s}async function js(t){let e=new TextEncoder().encode(String(t.ADMIN_TOKEN||"")),s=await crypto.subtle.importKey("raw",e,"HKDF",!1,["deriveKey"]);return await crypto.subtle.deriveKey({name:"HKDF",hash:"SHA-256",salt:new TextEncoder().encode("emby-proxy:credential"),info:new TextEncoder().encode("emby-proxy:credential-v1")},s,{name:"AES-GCM",length:256},!1,["encrypt","decrypt"])}async function Ot(t,e){if(!e)return"";let s=await js(t),o=crypto.getRandomValues(new Uint8Array(12)),a=await crypto.subtle.encrypt({name:"AES-GCM",iv:o},s,new TextEncoder().encode(e));return Xt(o)+"."+Xt(new Uint8Array(a))}async function Fe(t,e){if(!e||typeof e!="string"||e.indexOf(".")<0)return null;let s=e.split(".");if(s.length!==2)return null;try{let o=Vt(s[0]),a=Vt(s[1]);if(o.length!==12)return null;let r=await js(t),i=await crypto.subtle.decrypt({name:"AES-GCM",iv:o},r,a);return new TextDecoder().decode(i)}catch{return null}}async function $s(t,e,s){let o=await Hs(t,e),a=crypto.getRandomValues(new Uint8Array(12)),r=await crypto.subtle.encrypt({name:"AES-GCM",iv:a},o,new TextEncoder().encode(s));return Xt(a)+"."+Xt(new Uint8Array(r))}async function zs(t,e,s){if(!s||typeof s!="string"||s.indexOf(".")<0)return null;let o=s.split(".");if(o.length!==2)return null;try{let a=Vt(o[0]),r=Vt(o[1]);if(a.length!==12)return null;let i=await Hs(t,e),n=await crypto.subtle.decrypt({name:"AES-GCM",iv:a},i,r);return new TextDecoder().decode(n)}catch{return null}}var Gs="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";async function Ws(t,e){try{let s=await x(t,`SELECT ua FROM visitor_logs
              WHERE prefix = ? AND ua IS NOT NULL AND ua != '' AND ua != 'Unknown'
              ORDER BY id DESC LIMIT 1`,e),o=s&&String(s.ua||"").trim();return o||null}catch{return null}}async function go(t){try{let e=await H(t,St),s=e&&String(e).trim();if(!s)return null;let o=await H(t,Et),a=o?await Fe(t,o):"";return{username:s,password:a||""}}catch{return null}}async function wo(t,e){let s=e&&String(e.emby_username||"").trim();if(s){let a=e.emby_password_enc?await Fe(t,e.emby_password_enc):"";return{username:s,password:a||"",source:"route"}}let o=await go(t);return o?{...o,source:"shared"}:null}async function To(t,e,s,o,a){return ds(t,e,s,o,a)}async function Jt(t,e,s,o){let a=o&&o.ua,r=!!(o&&o.forceLogin),i=o&&o.now||Math.floor(Date.now()/1e3),n=ss(e.custom_headers);if(n)return{token:n,source:"manual"};if(!a)return null;if(!r&&e.emby_auth_cache){let d=await zs(t,e.prefix,e.emby_auth_cache);if(d)return{token:d,source:"cache"}}let c=await wo(t,e);if(!c||!c.username)return null;let l=await To(s,c.username,c.password,a,e.prefix);if(!l)return null;if(l.unauthorized)return{unauthorized:!0};try{let d=await $s(t,e.prefix,l.token);await Ne(t,e.prefix,d,i),e.emby_auth_cache=d}catch{}return{token:l.token,source:"login"}}var xo=6*3600;async function Zt(t,e){try{await Kt(t,e)}catch{}}async function Ys(t,e,s,o){let a=!!(o&&o.scanGate),r=Be(e.target);if(!r)return{skip:!0};let i=await Ws(t,e.prefix)||Gs,n=await Jt(t,e,r,{ua:i,now:s});if(!n)return{skip:!0};if(n.unauthorized)return await Zt(t,e.prefix),{unauthorized:!0};let c=0;if(a){let d=await x(t,"SELECT updated_at, last_scan_end FROM emby_media_counts_live WHERE prefix=?",e.prefix),u=d?d.updated_at|0:0,p=d?d.last_scan_end|0:0,m=s-u>=xo;if(c=await ke(r,n.token,e.custom_headers,e.prefix,i),c===-1){let h=await Jt(t,e,r,{ua:i,now:s,forceLogin:!0});if(!h||h.unauthorized)return await Zt(t,e.prefix),h&&h.unauthorized?{unauthorized:!0}:{skip:!0};n=h,c=await ke(r,n.token,e.custom_headers,e.prefix,i),c<0&&(c=0)}if(!(c>0&&c>p)&&!m)return{skip:!0,scanEnd:c>0?c:p}}let l=await Re(r,n.token,e.custom_headers,e.prefix,i);if(l&&l.unauthorized){let d=await Jt(t,e,r,{ua:i,now:s,forceLogin:!0});if(!d||d.unauthorized)return await Zt(t,e.prefix),d&&d.unauthorized?{unauthorized:!0}:{skip:!0};n=d,l=await Re(r,n.token,e.custom_headers,e.prefix,i)}return l?l.unauthorized?(await Zt(t,e.prefix),{unauthorized:!0}):{counts:l,scanEnd:c}:{skip:!0}}var He=V.join(", "),Ks=V.map(()=>"?").join(","),Ro=V.map(t=>`${t}=excluded.${t}`).join(", ");function Xs(t,e,s,o,a){let r=K(),i=V.map(n=>s[n]);return[_(t,`INSERT INTO emby_media_counts_live(prefix, ${He}, updated_at, last_scan_end)
             VALUES(?,${Ks},?,?)
             ON CONFLICT(prefix) DO UPDATE SET ${Ro}, updated_at=excluded.updated_at, last_scan_end=excluded.last_scan_end`,e.prefix,...i,o,a|0),_(t,`INSERT OR REPLACE INTO emby_media_counts(prefix, day, ${He}) VALUES(?,?,${Ks})`,e.prefix,r,...i),Is(t,e.prefix,o)]}async function Qt(t,e,s){try{let o=[];for(let a of e){let r=await Ys(t,a,s,{scanGate:!0});if(r&&r.counts){let i=r.scanEnd>0?r.scanEnd:0;o.push(...Xs(t,a,r.counts,s,i))}}o.length&&await N(t,o)}catch(o){console.log("maybeFetchMediaCounts error:",o.message)}}async function Vs(t,e){let s=Array.isArray(e)?e:[];for(let o of s)try{let a=await x(t,`SELECT ${wt} FROM routes WHERE prefix = ?`,o);a&&await ko(t,a,null,{ttl:60})}catch{}}var Pe=new Set;async function ko(t,e,s,o){let a=o&&o.ttl||60,r=Math.floor(Date.now()/1e3),i=()=>x(t,`SELECT prefix, ${He}, updated_at FROM emby_media_counts_live WHERE prefix = ?`,e.prefix),n=await i(),c=n?r-(n.updated_at|0):1/0;if(n&&c<a)return{row:n,stale:!1,refreshing:!1};let l=async()=>{if(!Pe.has(e.prefix)){Pe.add(e.prefix);try{let u=await Ys(t,e,r,{scanGate:!1});if(u&&u.counts){let p=u.scanEnd>0?u.scanEnd:n?n.last_scan_end|0:0;await N(t,Xs(t,e,u.counts,r,p))}}catch{}finally{Pe.delete(e.prefix)}}};return n?s&&s.waitUntil?(s.waitUntil(l()),{row:n,stale:!0,refreshing:!0}):(await l(),{row:await i()||n,stale:!1,refreshing:!1}):(await l(),{row:await i()||null,stale:!1,refreshing:!1})}var Js="https://api.cloudflare.com/client/v4";function Zs(t,e){return t&&Array.isArray(t.errors)&&t.errors.length?t.errors.map(s=>s&&s.message||String(s)).join("; "):e}function dt(t,e={}){let s=t&&t.CF_API_TOKEN,o=e.timeoutMs||15e3;async function a(n,c,l){let d=e.fetchImpl||fetch,u=new AbortController,p=setTimeout(()=>u.abort(),l);try{return await d(n,{...c,signal:u.signal})}finally{clearTimeout(p)}}async function r(n,c={}){if(!s)return{ok:!1,reason:"missing-token",error:"\u7F3A\u5C11 CF_API_TOKEN \u73AF\u5883\u53D8\u91CF"};let{method:l="GET",body:d,isForm:u=!1,headers:p={},timeoutMs:m=o}=c,b={Authorization:`Bearer ${s}`,...p},h;d!==void 0&&(u?h=d:(b["Content-Type"]="application/json",h=JSON.stringify(d)));let A;try{A=await a(`${Js}${n}`,{method:l,headers:b,body:h},m)}catch(k){return{ok:!1,reason:k.name==="AbortError"?"timeout":"network-error",error:k.message}}let D=null;try{D=await A.json()}catch{}return!A.ok||!D||D.success!==!0?{ok:!1,reason:"api-error",status:A.status,errors:D&&D.errors||null,error:Zs(D,`CF API \u8BF7\u6C42\u5931\u8D25 (HTTP ${A.status})`)}:{ok:!0,status:A.status,result:D.result}}async function i(n,c,l={}){if(!s)return{ok:!1,reason:"missing-token",error:"\u7F3A\u5C11 CF_API_TOKEN \u73AF\u5883\u53D8\u91CF"};let d=l.timeoutMs||o,u=c!==void 0?{query:n,variables:c}:{query:n},p;try{p=await a(`${Js}/graphql`,{method:"POST",headers:{Authorization:`Bearer ${s}`,"Content-Type":"application/json"},body:JSON.stringify(u)},d)}catch(b){return{ok:!1,reason:b.name==="AbortError"?"timeout":"network-error",error:b.message}}let m=null;try{m=await p.json()}catch{}return!p.ok||!m||m.errors&&m.errors.length?{ok:!1,reason:"api-error",status:p.status,errors:m&&m.errors||null,error:Zs(m,`CF GraphQL \u8BF7\u6C42\u5931\u8D25 (HTTP ${p.status})`)}:{ok:!0,status:p.status,data:m.data}}return{rest:r,graphql:i}}function Lt(t){return t>=1099511627776?(t/1099511627776).toFixed(2)+" TB":t>=1073741824?(t/1073741824).toFixed(2)+" GB":t>=1048576?(t/1048576).toFixed(2)+" MB":t>=1024?(t/1024).toFixed(2)+" KB":t>0?t+" B":"0 B"}function So(t){let e=/^[a-zA-Z0-9\-_]+$/,s=new Set,o=[];for(let a of t||[]){let r=typeof a=="string"?a:a?.prefix;if(!r||!e.test(r))continue;let i="p_"+r.replace(/[^a-zA-Z0-9_]/g,"_"),n=i,c=2;for(;s.has(n);)n=i+"_"+c,c++;s.add(n),o.push({alias:n,prefix:r,route:a})}return o}async function qt(t,e,s={}){let o={bytesByPrefix:new Map,anySuccess:!1};if(!t.CF_API_TOKEN||!t.CF_ZONE_ID)return o;let a=So(e);if(a.length===0)return o;let r=s.cfApi||dt(t),{startIso:i,endIso:n}=ge(s.nowMs),c=s.chunkSize||25,l=[];for(let d=0;d<a.length;d+=c)l.push(a.slice(d,d+c));return await Promise.all(l.map(async d=>{let u=d.map(({alias:m,prefix:b})=>`${m}: httpRequestsAdaptiveGroups(
                limit: 1,
                filter: {
                  clientRequestPath_like: "/${b}%",
                  datetime_geq: "${i}",
                  datetime_leq: "${n}"
                }
              ) { sum { edgeResponseBytes } }`).join(`
`),p=`query {
              viewer {
                zones(filter: {zoneTag: "${t.CF_ZONE_ID}"}) {
                  ${u}
                }
              }
            }`;try{let m=await r.graphql(p);if(!m.ok||!m.data?.viewer?.zones?.[0])return;let b=m.data.viewer.zones[0];for(let{alias:h,prefix:A}of d){let D=b[h]?.[0]?.sum,k=D&&D.edgeResponseBytes||0;o.bytesByPrefix.set(A,k),o.anySuccess=!0}}catch{}})),o}async function Ao(t,e,s={}){if(!t.CF_API_TOKEN||!t.CF_ZONE_ID)return{ok:!1,reason:"missing-env",message:"\u7F3A\u5C11\u53D8\u91CF"};try{let o=s.cfApi||dt(t),a=s.nowMs||Date.now(),r=new Date(a),i;if(e==="today"){let{startIso:d,endIso:u}=ge(a);i=`
                query {
                  viewer {
                    zones(filter: {zoneTag: "${t.CF_ZONE_ID}"}) {
                      httpRequestsAdaptiveGroups(
                        limit: 1,
                        filter: {
                          datetime_geq: "${d}",
                          datetime_leq: "${u}"
                        }
                      ) {
                        sum {
                          edgeResponseBytes
                        }
                      }
                    }
                  }
                }`}else{let u=new Date(r.getTime()-e*24*36e5).toISOString().split("T")[0],p=r.toISOString().split("T")[0];i=`
                query {
                  viewer {
                    zones(filter: {zoneTag: "${t.CF_ZONE_ID}"}) {
                      httpRequests1dGroups(
                        limit: 10000,
                        filter: {
                          date_geq: "${u}",
                          date_leq: "${p}"
                        }
                      ) {
                        sum {
                          bytes
                        }
                      }
                    }
                  }
                }`}let n=await o.graphql(i);if(!n.ok)return{ok:!1,reason:"api-error",message:`API\u62A5\u9519: ${n.errors&&n.errors[0]?.message||n.error||"\u672A\u77E5\u9519\u8BEF"}`};let c=n.data?.viewer?.zones,l=0;return c&&c.length>0&&(e==="today"&&c[0].httpRequestsAdaptiveGroups?l=c[0].httpRequestsAdaptiveGroups[0]?.sum?.edgeResponseBytes||0:e!=="today"&&c[0].httpRequests1dGroups&&c[0].httpRequests1dGroups.forEach(d=>{l+=d.sum.bytes||0})),{ok:!0,bytes:l}}catch{return{ok:!1,reason:"exception",message:"\u8BF7\u6C42\u5F02\u5E38"}}}async function Qs(t,e){let s=await Ao(t,e);return s.ok?Lt(s.bytes):s.message}function qs(t,e){let s=0,o=null;for(let a of t||[]){let r=e.get(a.prefix)||0;r>s&&(s=r,o=a)}return{route:o,bytes:s}}async function ft(t,e){return Qs(t,e)}async function Nt(t,e){try{let s=await x(t,"SELECT COUNT(*) as count FROM visitor_logs WHERE date(timestamp, '+8 hours') = date('now', '+8 hours')"),o=await x(t,"SELECT country, COUNT(*) as c FROM visitor_logs WHERE date(timestamp, '+8 hours') = date('now', '+8 hours') GROUP BY country ORDER BY c DESC LIMIT 1"),a=await x(t,`
            SELECT r.remark, COUNT(v.id) as c
            FROM visitor_logs v
            LEFT JOIN routes r ON v.prefix = r.prefix
            WHERE date(v.timestamp, '+8 hours') = date('now', '+8 hours')
            GROUP BY v.prefix
            ORDER BY c DESC LIMIT 1
        `),[r,i,n]=await Promise.all([ft(t,"today"),ft(t,7),ft(t,30)]),c="\u6682\u65E0\u6570\u636E";if(t.CF_API_TOKEN&&t.CF_ZONE_ID&&t.DB)try{let{results:m}=await R(t,`SELECT ${ks} FROM routes`);if(m&&m.length>0){let{bytesByPrefix:b}=await qt(t,m),{route:h,bytes:A}=qs(m,b);A>0?c=`${O(h.remark||h.prefix)} \u8DD1\u4E86 ${Lt(A)}`:c="\u4ECA\u65E5\u5168\u7AD9\u96F6\u6D88\u8017"}}catch{c="\u83B7\u53D6\u5931\u8D25"}let l=s?s.count.toLocaleString("en-US"):"0",d=o?`${o.country==="CN"?"\u{1F1E8}\u{1F1F3} \u4E2D\u56FD\u5927\u9646":O(o.country)} (${o.c.toLocaleString("en-US")} \u6B21)`:"\u6682\u65E0\u8BB0\u5F55",u=a?`${O(a.remark||"\u672A\u547D\u540D\u8282\u70B9")} (${a.c.toLocaleString("en-US")} \u6B21)`:"\u6682\u65E0\u8BB0\u5F55",p=pt();await mt(t,"daily-stats",{stats:{totalStr:l,regionStr:d,nodeStr:u,trafficToday:r,traffic7d:i,traffic30d:n,topNodeMsg:c,timestamp:p}})}catch(s){console.warn("sendTgStats nok",s.message)}}function vo(t,e,s){return t>86400?!1:t<=0?s-e>=86400:Math.floor(e/3600)!==Math.floor(s/3600)}async function ta(t,e){let{results:s}=await R(t,`
        SELECT ${Wt}
          FROM routes
         WHERE keepalive_days > 0
    `),o=[];for(let r of s||[]){if(!r.keepalive_last_played_at){await Os(t,r.prefix,e);continue}let i=r.keepalive_days*86400,c=r.keepalive_last_played_at+i-e,l=r.keepalive_last_reminded_at||0;vo(c,l,e)&&o.push({route:r,remaining:c})}if(!o.length)return;let a=await mt(t,"keepalive-reminder",{toRemind:o},e);a&&a.ok?await Ls(t,o.map(({route:r})=>r.prefix),e):a&&a.muted?console.log("[keepalive] reminder suppressed by mute window"):console.warn("[keepalive] tg send failed, skipping reminded_at stamp",a?.status??a?.error)}async function je(t){if(!t.DB||!t.CF_API_TOKEN||!t.CF_ZONE_ID)return 0;let{results:e}=await R(t,`SELECT ${Tt} FROM routes`),s=(e||[]).map(c=>c.prefix).filter(Boolean);if(s.length===0)return 0;let{bytesByPrefix:o,anySuccess:a}=await qt(t,s);if(!a||o.size===0)return 0;let r=K(),i=Math.floor(Date.now()/1e3),n=[];for(let[c,l]of o)n.push(_(t,`INSERT INTO route_bandwidth_today (prefix, day, bytes, updated_at) VALUES (?, ?, ?, ?)
             ON CONFLICT(prefix, day) DO UPDATE SET bytes = excluded.bytes, updated_at = excluded.updated_at`,c,r,l,i));return n.length&&await N(t,n),n.length}async function ea(t,e=270){if(!t.DB||!t.CF_API_TOKEN||!t.CF_ZONE_ID)return 0;try{let s=K(),o=await x(t,"SELECT MAX(updated_at) AS m FROM route_bandwidth_today WHERE day = ?",s),a=o&&o.m?Number(o.m):0,r=Math.floor(Date.now()/1e3);if(a&&r-a<e)return 0}catch{}return je(t)}async function sa(t,e,s){let o=t&&t.cron||"";if(o==="0 * * * *"){e.DB&&e.TG_BOT_TOKEN&&e.TG_CHAT_ID&&s.waitUntil((async()=>{try{await M(e);let a=Math.floor(Date.now()/1e3);await ta(e,a)}catch(a){console.log("scheduled keepalive error:",a&&a.message||a)}})());return}if(o==="0 0 * * *"){e.TG_BOT_TOKEN&&e.TG_CHAT_ID&&e.DB&&s.waitUntil(Nt(e,e.TG_CHAT_ID)),e.DB&&(s.waitUntil((async()=>{try{await M(e);let{results:a}=await R(e,`
                        SELECT ${wt}
                          FROM routes WHERE monitor_enabled = 1
                    `);await Qt(e,a||[],Math.floor(Date.now()/1e3))}catch(a){console.log("scheduled maybeFetchMediaCounts error:",a&&a.message||a)}})()),s.waitUntil((async()=>{try{await M(e),await e.DB.exec("DELETE FROM visitor_logs WHERE timestamp < datetime('now', '-7 days')")}catch(a){console.log("scheduled visitor_logs cleanup error:",a&&a.message||a)}})()),s.waitUntil((async()=>{try{await M(e);let a=Math.floor(Date.now()/6e4)-120;await F(e,"DELETE FROM auth_rl WHERE win < ?",a),await F(e,"DELETE FROM scan_rl WHERE win < ?",a),await F(e,"DELETE FROM ip_bans WHERE until < ?",Date.now())}catch(a){console.log("scheduled auth_rl cleanup error:",a&&a.message||a)}})()));return}if(o==="*/5 * * * *"){e.DB&&(s.waitUntil(Yt(e)),s.waitUntil((async()=>{try{await M(e),await ea(e)}catch(a){console.log("scheduled bandwidth refresh error:",a&&a.message||a)}})()));return}e.TG_BOT_TOKEN&&e.TG_CHAT_ID&&e.DB&&s.waitUntil(Nt(e,e.TG_CHAT_ID))}var te="/static/app.003945b947.css",aa="/static/app.17f70b89e7.js";var It="2.5.1";var $e=`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>Emby \u53CD\u4EE3\u9762\u677F</title>
    <link rel="stylesheet" href="${te}">
    <script src="https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"><\/script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
    <script defer src="${aa}"><\/script>
</head>
<body class="shell-on">
    <div id="toast"></div>

    <!-- Shared SVG sprite (UI Suggestions v2.0.7) -->
    <svg width="0" height="0" class="pos-abs" aria-hidden="true">
        <defs>
            <symbol id="i-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></symbol>
            <symbol id="i-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></symbol>
            <symbol id="i-save" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></symbol>
            <symbol id="i-download" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></symbol>
            <symbol id="i-upload" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></symbol>
            <symbol id="i-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></symbol>
            <symbol id="i-more" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></symbol>
            <symbol id="i-eye" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></symbol>
            <symbol id="i-eye-off" viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></symbol>
            <symbol id="i-grip" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/></symbol>
            <symbol id="i-copy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></symbol>
            <symbol id="i-zap" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></symbol>
            <symbol id="i-image" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></symbol>
            <symbol id="i-key" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></symbol>
            <symbol id="i-edit" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></symbol>
            <symbol id="i-trash" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></symbol>
            <symbol id="i-shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></symbol>
            <symbol id="i-globe" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></symbol>
            <symbol id="i-star" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></symbol>
            <symbol id="i-shuffle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></symbol>
            <symbol id="i-info" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></symbol>
        </defs>
    </svg>


    <div id="workerUpdateModal" class="wu-overlay" style="display:none;">
        <div class="card is-danger-highlight">
            <button class="wu-close" onclick="closeWorkerUpdate()" aria-label="\u5173\u95ED">\u2716</button>
            <h2 class="wu-title">\u4E00\u952E\u8986\u76D6/\u66F4\u65B0 Worker \u6838\u5FC3\u5C42\u4EE3\u7801</h2>
            <div class="wu-warning">\u8B66\u544A\uFF1A\u63D0\u4EA4\u9519\u8BEF\u7684\u4EE3\u7801\u4F1A\u5BFC\u81F4\u9762\u677F\u77AC\u95F4\u5D29\u6E83\uFF08500 \u9519\u8BEF\uFF09\u3002\u8BF7\u786E\u4FDD\u4EE3\u7801\u5DF2\u5728\u672C\u5730\u6D4B\u8BD5\u901A\u8FC7</div>
            <textarea id="codeArea" class="wu-textarea" rows="8" placeholder="\u65B9\u5F0F\u4E00\uFF1A\u5728\u6B64\u5904\u76F4\u63A5\u7C98\u8D34\u4FEE\u6539\u597D\u7684\u6700\u65B0\u4EE3\u7801\u5168\u6587..."></textarea>
            <div class="row-end">
                <span class="wu-label">\u6216 \u65B9\u5F0F\u4E8C\uFF1A</span>
                <input type="file" id="fileInput" class="wu-file-input" accept=".js">
                <button type="button" class="btn-tier is-danger row-end-spacer" id="deployBtn" onclick="deployWorker()">\u7ACB\u5373\u8986\u76D6\u90E8\u7F72\u5E76\u91CD\u542F\u8282\u70B9</button>
            </div>
        </div>
    </div>

    <div id="editModal" class="em-overlay" style="display:none;" role="dialog" aria-modal="true" aria-labelledby="emTitle" onclick="if(event.target===this) closeEditModal()">
        <div class="em-modal">
            <div class="em-modal-head">
                <h3 id="emTitle" style="margin:0; font-size:var(--text-xl);">\u7F16\u8F91\u8282\u70B9</h3>
                <button type="button" class="em-close" aria-label="\u5173\u95ED" onclick="closeEditModal()">
                    <svg viewBox="0 0 24 24" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div id="editModalBody" class="em-modal-body"></div>
        </div>
    </div>

    <!-- \u2318K \u547D\u4EE4\u9762\u677F -->
    <div id="cmdk" aria-hidden="true" role="dialog" aria-modal="true" aria-label="\u547D\u4EE4\u9762\u677F">
        <div class="cmdk-panel" role="document">
            <div class="cmdk-head">
                <svg class="cmdk-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input class="cmdk-input" type="text" placeholder="\u8DF3\u8F6C\u76EE\u7684\u5730\u3001\u8282\u70B9\uFF0C\u6216\u6267\u884C\u64CD\u4F5C\u2026" aria-label="\u547D\u4EE4\u641C\u7D22" autocomplete="off" spellcheck="false">
                <kbd class="cmdk-esc">ESC</kbd>
            </div>
            <div class="cmdk-list" role="listbox" aria-label="\u547D\u4EE4"></div>
        </div>
    </div>

    <div class="app-shell">
        <!-- ===== \u4FA7\u8FB9\u680F ===== -->
        <aside class="sidebar" id="appSidebar">
            <div class="sidebar-brand">
                <div class="sidebar-logo" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                </div>
                <div class="sidebar-brand-text">
                    <div class="sidebar-brand-title">\u53CD\u4EE3\u6838\u5FC3 \xB7 \u5B89\u5168\u4E2D\u5FC3</div>
                    <div class="sidebar-brand-sub">Emby \u53CD\u5411\u4EE3\u7406\u7BA1\u7406\u55B5\u677F</div>
                </div>
            </div>
            <nav class="sidebar-nav" aria-label="\u4E3B\u5BFC\u822A">
                <button type="button" class="nav-item dest-item is-active" data-dest="monitor" onclick="showDest('monitor')">
                    <svg viewBox="0 0 24 24"><path d="M3 12h4l3 8 4-16 3 8h4"/></svg>
                    <span>\u76D1\u63A7</span>
                </button>
                <button type="button" class="nav-item dest-item" data-dest="network" onclick="showDest('network')">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>
                    <span>\u7F51\u7EDC</span>
                </button>
                <button type="button" class="nav-item dest-item" data-dest="config" onclick="showDest('config')">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    <span>\u914D\u7F6E</span>
                </button>
            </nav>
            <div class="sidebar-foot">
                <button type="button" class="sidebar-collapse" id="sidebarCollapseBtn" onclick="toggleSidebar()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="15 18 9 12 15 6"/></svg>
                    <span>\u6536\u8D77\u4FA7\u680F</span>
                </button>
                <div class="sidebar-version">v${It}</div>
            </div>
        </aside>

        <div class="app-main">
            <!-- ===== \u9876\u90E8\u72B6\u6001\u680F (\u4FDD\u7559 #cf-trace-card \u4F9B JS \u4F7F\u7528) ===== -->
            <header id="cf-trace-card" class="topbar">
                <div class="tb-stat" title="\u4F60\u7684\u8BBE\u5907\u5230\u4E91\u7AEF\u8FB9\u7F18\u8282\u70B9\u7684\u771F\u5B9E\u5F80\u8FD4\u5EF6\u8FDF">
                    <span class="dot green" id="rttDot"></span>
                    <span class="lbl">\u8FD0\u884C</span>
                    <span class="val" id="rttValue">\u6D4B\u7B97\u4E2D</span>
                </div>
                <div class="tb-stat">
                    <span class="lbl">\u8282\u70B9</span>
                    <span class="val" id="tb-node-count">--</span>
                </div>
                <div class="tb-stat">
                    <span class="lbl">\u4ECA\u65E5\u6D41\u91CF</span>
                    <span class="val" id="tb-traffic-today">--</span>
                </div>
                <div class="tb-stat" id="tb-health">
                    <span class="dot green" id="tb-health-dot"></span>
                    <span class="lbl">\u5065\u5EB7\u5EA6</span>
                    <span class="val" id="tb-health-val">--</span>
                </div>
                <div class="tb-stat pill expandable is-clickable" id="placePill" onclick="togglePlacementDrawer()">
                    <span class="lbl">\u8C03\u5EA6</span>
                    <span id="placeModeLabel">\u667A\u80FD</span>
                    <span class="caret">\u25BE</span>
                </div>
                <span class="val" id="trace-entry" style="display:none;">--</span>
                <span class="val" id="trace-egress" style="display:none;">--</span>

                <div class="topbar-spacer"><span class="tb-section-title" id="tbSectionTitle"></span></div>

                <button class="tb-cmdk" onclick="openCmdK()" title="\u547D\u4EE4\u9762\u677F (\u2318K)" aria-label="\u6253\u5F00\u547D\u4EE4\u9762\u677F">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <span class="tb-cmdk-kbd">\u2318K</span>
                </button>
                <button class="tb-icon-btn" onclick="openWorkerUpdate()" title="\u66F4\u65B0 Worker \u6838\u5FC3\u4EE3\u7801" aria-label="\u66F4\u65B0 Worker \u6838\u5FC3\u4EE3\u7801">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </button>
                <button class="tb-icon-btn" id="themeToggle" onclick="toggleDarkMode()" data-theme="auto" title="\u5207\u6362\u4E3B\u9898" aria-label="\u5207\u6362\u4E3B\u9898">
                    <span class="ico ico-auto"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8a2.83 2.83 0 0 0 4 4 4 4 0 1 1-4-4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/></svg></span>
                    <span class="ico ico-light"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg></span>
                    <span class="ico ico-dark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></span>
                </button>
                <div class="topbar-user">
                    <span class="ava">A</span>
                    <span>admin</span>
                    <button class="tb-icon-btn danger is-sm" onclick="logout()" title="\u9000\u51FA\u7CFB\u7EDF" aria-label="\u9000\u51FA\u7CFB\u7EDF">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><path d="M12 2v10"/></svg>
                    </button>
                </div>
            </header>

            <!-- Slim, dismissable update banner -->
            <div id="updateAlert" class="tb-banner" style="display: none; margin: 14px 24px 0;">
                <span class="b-tag">NEW</span>
                <span class="b-msg" id="updateMsg">\u5F53\u524D\u7248\u672C: v1.0.0 | \u6700\u65B0\u7248\u672C: v?.?.?</span>
                <button class="b-cta" id="onlineUpdateBtn" onclick="doOnlineUpdate()">\u4E00\u952E\u5347\u7EA7</button>
                <button class="b-dismiss" onclick="document.getElementById('updateAlert').style.display='none'" title="\u5FFD\u7565">\u2715</button>
            </div>

            <!-- Placement drawer (collapsed by default) -->
            <div class="tb-drawer banner-spaced" id="placeDrawer" >
                <h3>Worker \u8C03\u5EA6\u6A21\u5F0F</h3>
                <div class="sub">\u63A7\u5236 Worker \u5B9E\u9645\u843D\u5730\u7684\u7269\u7406\u673A\u623F\uFF0C\u540E\u53F0\u5B89\u5168\u8C03\u5EA6\uFF0C\u4E0D\u66B4\u9732\u4EFB\u4F55\u79C1\u94A5</div>
                <div class="controls">
                    <select id="cf-mode-select" onchange="handleModeChange()">
                        <option value='{"mode":"smart"}'>\u667A\u80FD\u8C03\u5EA6 (Smart Placement)</option>
                        <option value='{"mode":"off"}'>\u8FB9\u7F18\u8282\u70B9 (Edge - \u9ED8\u8BA4\u79BB\u8BBF\u5BA2\u8FD1)</option>
                        <optgroup label="\u6307\u5B9A\u4E91\u5382\u5546\u7269\u7406\u673A\u623F\u843D\u5730">
                            <option value="aws">\u2601\uFE0F AWS (\u4E9A\u9A6C\u900A\u4E91)</option>
                            <option value="gcp">\u2601\uFE0F GCP (\u8C37\u6B4C\u4E91)</option>
                            <option value="azure">\u2601\uFE0F Azure (\u5FAE\u8F6F\u4E91)</option>
                        </optgroup>
                        <option value="custom">\u270F\uFE0F \u624B\u52A8\u8F93\u5165\u533A\u57DF\u4EE3\u7801...</option>
                    </select>
                    <select id="cf-region-select" style="display: none;"></select>
                    <input type="text" id="cf-custom-input" placeholder="\u8F93\u5165\u4E91\u4EE3\u7801 (\u5982 gcp:us-west1)" style="display: none;">
                    <button type="button" class="btn-tier is-primary" onclick="updatePlacement()">\u63D0\u4EA4\u4FEE\u6539</button>
                </div>
                <div class="status"><span id="place-status">\u540E\u53F0\u5168\u81EA\u52A8\u5B89\u5168\u8C03\u5EA6\uFF0C\u4E0D\u66B4\u9732\u4EFB\u4F55\u79C1\u94A5</span></div>
            </div>

        <div class="content">

            <!-- iOS-native sticky compact bar (visible after large title scrolls away) -->
            <div id="mobileTopbarCompact" aria-hidden="true"></div>

            <!-- Operations Cockpit: \u5F53\u524D\u76EE\u7684\u5730\u7684\u5185\u5C42 tab \u6761 (JS \u6309 DEST_MAP \u6E32\u67D3) -->
            <div class="subtab-bar" id="subtabBar" role="tablist" aria-label="\u5B50\u5206\u533A"></div>

            <!-- Mobile-only status pills (v5: 2\xD72 grid \u2014 RTT / \u5065\u5EB7 / \u6A21\u5F0F / \u4ECA\u65E5) -->
            <div class="m-pills" id="mobilePills" aria-label="\u79FB\u52A8\u7AEF\u72B6\u6001">
                <span class="m-pill"><span class="dot green" id="m-pill-rtt-dot"></span><span class="lbl">RTT</span><span class="val" id="m-pill-rtt">\u6D4B\u7B97\u4E2D</span></span>
                <span class="m-pill"><span class="dot green" id="m-pill-health-dot"></span><span class="lbl">\u5065\u5EB7</span><span class="val" id="m-pill-health">--</span></span>
                <span class="m-pill tappable" role="button" tabindex="0" onclick="openPlacementDrawerFromMobile()"><span class="lbl">\u6A21\u5F0F</span><span class="val" id="m-pill-mode">\u667A\u80FD</span><span class="caret" aria-hidden="true">\u25BE</span></span>
                <span class="m-pill strong"><span class="lbl">\u4ECA\u65E5</span><span class="val" id="m-pill-today">--</span></span>
            </div>

            <!-- ===== \u5206\u533A: \u6570\u636E\u7EDF\u8BA1 ===== -->
            <section id="sec-stats" class="app-section" data-section="stats" style="display:none;">
            <div class="card">
                <div class="stats-head">
                    <h2 class="section-title"><svg class="st-ico" aria-hidden="true"><use href="#i-zap"/></svg>\u6570\u636E\u7EDF\u8BA1<span class="stats-head-sub">\u7CBE\u786E\u8BBF\u5BA2\u753B\u50CF\u5206\u6790</span></h2>
                    <button type="button" class="btn-tier is-sm" onclick="loadDashboardData()" title="\u91CD\u65B0\u62C9\u53D6\u7EDF\u8BA1\u6570\u636E"><svg class="bt-ico" aria-hidden="true"><use href="#i-shuffle"/></svg>\u5237\u65B0</button>
                </div>

                <!-- \u6D41\u91CF\u6982\u89C8\uFF1A\u514B\u5236\u7684 instrument \u7EDF\u8BA1\u5E26\uFF0C\u7B49\u5BBD\u6570\u503C + hairline \u5206\u9694 -->
                <div class="stat-strip" role="group" aria-label="\u6D41\u91CF\u6982\u89C8">
                    <div class="stat-cell"><span class="stat-label">\u4ECA\u5929</span><span class="stat-value" id="trafficToday">\u52A0\u8F7D\u4E2D\u2026</span></div>
                    <div class="stat-cell"><span class="stat-label">\u8FD1 7 \u5929</span><span class="stat-value" id="traffic7d">\u52A0\u8F7D\u4E2D\u2026</span></div>
                    <div class="stat-cell"><span class="stat-label">\u8FD1 30 \u5929</span><span class="stat-value" id="traffic30d">\u52A0\u8F7D\u4E2D\u2026</span></div>
                </div>

                <div class="stats-charts">
                    <section class="stats-panel stats-panel-trend" aria-labelledby="trendTitle">
                        <h3 class="stats-panel-title" id="trendTitle"><svg class="sp-ico" aria-hidden="true"><use href="#i-zap"/></svg>\u8FD1 7 \u5929\u64AD\u653E\u8D8B\u52BF<span class="stats-panel-meta">\u6709\u6548\u64AD\u653E \xB7 \u6B21</span></h3>
                        <div class="chart-box"><canvas id="trendChart" role="img" aria-label="\u8FD1 7 \u5929\u6BCF\u65E5\u6709\u6548\u64AD\u653E\u6B21\u6570\u8D8B\u52BF"></canvas></div>
                        <div class="sr-only" id="trendTable"></div>
                    </section>
                    <section class="stats-panel stats-panel-loc" aria-labelledby="locTitle">
                        <h3 class="stats-panel-title" id="locTitle"><svg class="sp-ico" aria-hidden="true"><use href="#i-globe"/></svg>\u8BBF\u5BA2\u6765\u6E90\u5730<span class="stats-panel-meta">\u8FD1 7 \u5929</span></h3>
                        <div class="loc-body">
                            <div class="chart-box chart-box-doughnut"><canvas id="locationChart" role="img" aria-label="\u8BBF\u5BA2\u6765\u6E90\u5730\u5360\u6BD4"></canvas></div>
                            <div class="loc-legend" id="locLegend"></div>
                        </div>
                        <div class="sr-only" id="locTable"></div>
                    </section>
                </div>

                <section class="stats-panel" aria-labelledby="top5Title">
                    <h3 class="stats-panel-title" id="top5Title"><svg class="sp-ico" aria-hidden="true"><use href="#i-star"/></svg>\u4ECA\u65E5\u8282\u70B9\u6D41\u91CF\u6D88\u8017 \xB7 TOP 5</h3>
                    <div id="top5-simple-container"></div>
                </section>

                <section class="stats-panel" aria-labelledby="logTitle">
                    <h3 class="stats-panel-title" id="logTitle"><svg class="sp-ico" aria-hidden="true"><use href="#i-eye"/></svg>\u6700\u65B0\u72EC\u7ACB\u64AD\u653E\u8BB0\u5F55<span class="stats-panel-meta">\u4EC5 PlaybackInfo \u771F\u5B9E\u64AD\u653E</span></h3>
                    <div class="table-wrapper">
                        <table class="w-full stats-log-table">
                            <thead><tr>
                                <th id="logSortTh" class="log-th-sort" role="button" tabindex="0" aria-sort="descending" onclick="setLogSort('time')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();setLogSort('time');}" title="\u70B9\u51FB\u6309\u65F6\u95F4\u6392\u5E8F">\u8BBF\u95EE\u65F6\u95F4<span id="logSortInd" class="od-sort-ind" aria-hidden="true"></span></th>
                                <th>\u76EE\u6807\u8282\u70B9</th>
                                <th>\u771F\u5B9E IP \u5730\u5740</th>
                                <th>\u5F52\u5C5E\u5730</th>
                                <th>\u5BA2\u6237\u7AEF/\u8BBE\u5907\u6807\u8BC6 (User-Agent)</th>
                            </tr></thead>
                            <tbody id="logTableBody"><tr><td colspan="5" class="cell-loading">\u52A0\u8F7D\u6570\u636E\u4E2D...</td></tr></tbody>
                        </table>
                    </div>
                </section>
            </div>
            </section><!-- /sec-stats -->

            <!-- ===== \u5206\u533A: \u7EBF\u8DEF\u6D4B\u901F ===== -->
            <section id="sec-speed" class="app-section" data-section="speed" style="display:none;">

            <div class="net-panel" data-net-panel="speed">
            <!-- Mobile-only iOS large-title header (v2.6.0) -->
            <header class="ios-page-header sd-page-header" aria-hidden="false">
                <h1 class="ios-large-title">\u6D4B\u901F &amp; DNS</h1>
                <p class="sd-page-sub">\u8282\u70B9\u5EF6\u8FDF\u4E0E\u89E3\u6790\u63A2\u6D4B</p>
            </header>

            <div class="card" id="speed-anchor">
                <div class="section-header-row">
                    <h2 class="section-title"><svg class="st-ico" aria-hidden="true"><use href="#i-zap"/></svg>\u4E13\u5C5E\u7EBF\u8DEF\u6D4B\u901F &amp; \u52A8\u6001 DNS \u89E3\u6790</h2>
                </div>

                <div class="sd-dns-card" id="dnsStatusCard">
                    <div class="sd-dns-head">
                        <span class="sd-eyebrow"><svg class="eb-ico" aria-hidden="true"><use href="#i-globe"/></svg>\u5F53\u524D\u751F\u6548\u89E3\u6790</span>
                        <span class="sd-dns-tag" id="sd-dns-tag">DNS</span>
                    </div>
                    <div id="dnsStatus" class="flex-wrap-tight">
                        <span class="text-muted">\u52A0\u8F7D\u4E2D...</span>
                    </div>
                </div>

                <!-- Mobile-only ISP segmented control (v2.6.0) -->
                <nav class="sd-isp-seg" role="tablist" aria-label="ISP \u7B5B\u9009">
                    <button type="button" role="tab" data-value="all" aria-selected="true">\u7EFC\u5408</button>
                    <button type="button" role="tab" data-value="\u7535\u4FE1" aria-selected="false">\u7535\u4FE1</button>
                    <button type="button" role="tab" data-value="\u8054\u901A" aria-selected="false">\u8054\u901A</button>
                    <button type="button" role="tab" data-value="\u79FB\u52A8" aria-selected="false">\u79FB\u52A8</button>
                    <button type="button" role="tab" data-value="\u591A\u7EBF" aria-selected="false">\u591A\u7EBF</button>
                    <button type="button" role="tab" data-value="ipv6" aria-selected="false">IPv6</button>
                    <button type="button" role="tab" data-value="\u4F18\u9009" aria-selected="false">\u4F18\u9009</button>
                </nav>

                <div class="toolbar">
                    <select id="ipType" style="font-weight: 600; color: var(--primary); padding: 10px 14px; border: 1px solid var(--border); border-radius: var(--radius-md); background:var(--card);">
                        <option value="all">\u7EFC\u5408\u6DF7\u5408\u6E90</option>
                        <option value="\u7535\u4FE1">\u7535\u4FE1\u4E13\u5C5E</option>
                        <option value="\u8054\u901A">\u8054\u901A\u4E13\u5C5E</option>
                        <option value="\u79FB\u52A8">\u79FB\u52A8\u4E13\u5C5E</option>
                        <option value="\u591A\u7EBF">\u591A\u7EBF BGP</option>
                        <option value="ipv6">IPv6 \u8282\u70B9</option>
                        <option value="\u4F18\u9009">\u9876\u5C16\u4F18\u9009\u5E93</option>
                    </select>

                    <button type="button" class="btn-tier is-primary" id="btnFetchRemote" onclick="fetchRemoteAndTest()"><svg class="bt-ico" aria-hidden="true"><use href="#i-zap"/></svg>\u63D0\u53D6\u9884\u8BBE\u6E90\u5E76\u6D4B\u901F</button>
                    <button type="button" class="btn-tier" id="btnTestCustom" onclick="testCustomIPs()">\u6D4B\u8BD5\u7C98\u8D34\u8282\u70B9</button>
                    <button type="button" class="btn-tier" id="btnFetchCustomApi" onclick="fetchCustomApiAndTest()">\u62C9\u53D6 API</button>

                    <span class="v-sep"></span>

                    <button type="button" class="btn-tier is-success-line" id="btnSelectedDns" data-armed="0" onclick="updateSelectedToDns()"><svg class="bt-ico" aria-hidden="true"><use href="#i-upload"/></svg>\u63D0\u4EA4\u9009\u4E2D\u81F3 DNS <span class="sd-sel-pill" id="sdSelDeskCount" hidden>0</span></button>

                    <span class="v-sep"></span>

                    <div class="menu-wrap">
                        <button type="button" class="btn-tier" onclick="toggleMenu(this)">\u66F4\u591A <svg><use href="#i-chevron"/></svg></button>
                        <div class="menu">
                            <button type="button" onclick="batchTcpPing(); closeAllMenus();">\u590D\u5236\u53BB ITDog</button>
                            <button type="button" id="btnDirectCname" onclick="directSubmitCname(); closeAllMenus();">\u76F4\u63A8 CNAME (\u514D\u6D4B\u901F)</button>
                            <button type="button" id="btnTop3Dns" onclick="updateTop3ToDns(); closeAllMenus();">\u66F4\u65B0 TOP3 \u81F3 DNS</button>
                            <hr/>
                            <button type="button" class="danger" onclick="clearTest(); closeAllMenus();">\u6E05\u7A7A\u5217\u8868</button>
                        </div>
                    </div>
                </div>

                <!-- Mobile-only primary CTA stack + overflow trigger (v2.6.0) -->
                <div class="sd-action-stack" aria-hidden="false">
                    <button type="button" class="sd-cta-primary" onclick="fetchRemoteAndTest()">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                        <span>\u63D0\u53D6\u9884\u8BBE\u6E90\u5E76\u6D4B\u901F</span>
                    </button>
                    <div class="sd-action-row">
                        <button type="button" class="sd-cta-ghost" onclick="testCustomIPs()">\u6D4B\u8BD5\u7C98\u8D34</button>
                        <button type="button" class="sd-cta-ghost" onclick="fetchCustomApiAndTest()">\u62C9\u53D6 API</button>
                        <button type="button" class="sd-cta-more" onclick="openSdMoreSheet()" aria-label="\u66F4\u591A\u64CD\u4F5C">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>
                        </button>
                    </div>
                </div>

                <details class="sd-custom-fold">
                    <summary class="sd-custom-summary">
                        <span>\u81EA\u5B9A\u4E49\u6765\u6E90</span>
                        <svg class="sd-chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </summary>
                    <div class="sd-custom-body" style="background: rgba(120,120,120,0.05); padding: 14px; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 16px;">
                        <input type="text" id="customApiUrl" value="https://ip.v2too.top/api/nodes" placeholder="\u81EA\u5B9A\u4E49 JSON / \u6587\u672C API \u94FE\u63A5\uFF08\u4F9B\u300C\u62C9\u53D6 API\u300D\u4F7F\u7528\uFF09" style="width: 100%; padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--border); background:var(--card); margin-bottom: 10px;">
                        <textarea id="customIps" rows="2" placeholder="\u5728\u6B64\u7C98\u8D34\u81EA\u5B9A\u4E49 IPv4 / IPv6 / \u4F18\u9009\u57DF\u540D\uFF08\u4F9B\u300C\u6D4B\u8BD5\u7C98\u8D34\u8282\u70B9\u300D\u4F7F\u7528\uFF0C\u81EA\u52A8\u63D0\u53D6\uFF09" style="width: 100%; padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border); font-family: monospace; resize: vertical; background:var(--card);"></textarea>
                    </div>
                </details>
                
                <div id="statusText" class="sd-hint">
                    <svg class="sd-hint-ico" aria-hidden="true"><use href="#i-info"/></svg>
                    <span>\u6D4B\u901F\u5B8C\u6210\u540E\uFF0C\u52FE\u9009\u8282\u70B9\u81EA\u7531\u7EC4\u5408\uFF0C\u70B9\u51FB\u300C\u63D0\u4EA4\u9009\u4E2D\u81F3 DNS\u300D\u81EA\u52A8\u5206\u53D1\u3002</span>
                </div>

                <div class="table-wrapper">
                    <table class="w-full">
                        <thead>
                            <tr>
                                <th class="col-w40"><input type="checkbox" id="selectAll" class="ip-checkbox" onclick="toggleSelectAll()"></th>
                                <th>\u4E13\u5C5E\u8282\u70B9 (\u70B9\u51FB\u590D\u5236)</th>
                                <th>\u9884\u4F30\u5EF6\u8FDF</th>
                                <th>\u8FDE\u901A\u72B6\u6001</th>
                                <th>\u8BB0\u5F55\u7C7B\u578B/\u5F52\u5C5E\u5730</th>
                                <th>\u5355\u8282\u70B9\u64CD\u4F5C</th>
                            </tr>
                        </thead>
                        <tbody id="testTableBody">
                            <tr><td colspan="6" class="text-center-muted">\u6682\u65E0\u6570\u636E\uFF0C\u8BF7\u62C9\u53D6\u8282\u70B9\u6216\u8F93\u5165\u81EA\u5B9A\u4E49 IP/\u57DF\u540D \u6D4B\u8BD5</td></tr>
                        </tbody>
                    </table>
                </div>

                <!-- Mobile-only floating selection bar (v2.6.0) -->
                <div class="sd-selection-bar" id="sdSelectionBar" hidden>
                    <span class="sd-sel-label">\u5DF2\u9009 <strong id="sdSelCount">0</strong> \u4E2A</span>
                    <button type="button" class="sd-sel-btn" onclick="updateSelectedToDns()">\u63D0\u4EA4\u81F3 DNS
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                </div>
            </div>

            </div><!-- /net-panel speed -->

            <div class="net-panel" data-net-panel="cdn" style="display:none;">
            <!-- ===== F4: \u4F18\u9009 CDN \u57DF\u540D + \u4E00\u952E DNS CNAME ===== -->
            <div class="card mt-4" >
                <div style="display:flex; justify-content: space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
                    <h2 class="section-title"><svg class="st-ico" aria-hidden="true"><use href="#i-star"/></svg>\u4F18\u9009 CDN \u57DF\u540D \xB7 \u4E00\u952E DNS CNAME</h2>
                    <div class="flex-wrap-tight">
                        <button type="button" class="btn-tier is-primary" onclick="speedtestOptimizedDomains('client')">\u5168\u90E8\u6D4B\u901F (\u672C\u5730)</button>
                        <button type="button" class="btn-tier" onclick="speedtestOptimizedDomains('edge')" title="\u4ECE Worker \u673A\u623F\u6D4B\uFF0C\u4EC5\u4F9B\u53C2\u8003">Edge \u6D4B\u901F</button>
                        <button type="button" class="btn-tier" onclick="runDownloadSpeedtest()" title="\u6D4B\u5F53\u524D DNS \u8DEF\u5F84\u7684\u5B9E\u9645\u4E0B\u8F7D\u5E26\u5BBD"><svg class="bt-ico" aria-hidden="true"><use href="#i-download"/></svg>\u5F53\u524D\u8DEF\u5F84\u5E26\u5BBD</button>
                        <button type="button" class="btn-tier" onclick="addOptimizedDomain()">+ \u6DFB\u52A0\u81EA\u5B9A\u4E49</button>
                    </div>
                    <div id="downloadSpeedResult" style="margin-top:10px; font-size:var(--text-md); color:var(--text-sec);"></div>
                </div>
                <div class="table-wrapper">
                    <table class="w-full">
                        <thead>
                            <tr>
                                <th>\u57DF\u540D</th>
                                <th>\u5907\u6CE8</th>
                                <th class="col-w60 text-center">\u5185\u7F6E</th>
                                <th class="col-w60 text-center">\u542F\u7528</th>
                                <th id="odSortTh" class="od-th-sort" style="width:150px; text-align:right;" role="button" tabindex="0" aria-sort="ascending" onclick="setOdSort('ms')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();setOdSort('ms');}" title="\u70B9\u51FB\u6309\u5EF6\u8FDF\u6392\u5E8F">\u5EF6\u8FDF<span id="odSortInd" class="od-sort-ind" aria-hidden="true"></span></th>
                                <th style="width:150px;">\u64CD\u4F5C</th>
                            </tr>
                        </thead>
                        <tbody id="optimizedDomainsBody">
                            <tr><td colspan="6" class="text-center-muted">\u52A0\u8F7D\u4E2D...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div id="dnsReadyHint" style="margin-top:14px; padding:10px 14px; border-radius:var(--radius-md); font-size:var(--text-md);"></div>
            </div>
            </div><!-- /net-panel cdn -->

            <div class="net-panel" data-net-panel="redirect" style="display:none;">
            <!-- ===== F3: \u91CD\u5B9A\u5411\u767D\u540D\u5355 ===== -->
            <div class="card mt-4" >
                <h2 class="section-title" style="margin-bottom:10px;"><svg class="st-ico" aria-hidden="true"><use href="#i-shuffle"/></svg>3xx \u91CD\u5B9A\u5411\u76F4\u901A\u767D\u540D\u5355</h2>
                <div style="font-size:var(--text-md); color:var(--text-sec); margin-bottom:10px;">\u547D\u4E2D\u4EE5\u4E0B\u57DF\u540D\uFF08\u6216\u5176\u5B50\u57DF\u540D\uFF09\u7684 302/301 Location \u5C06\u76F4\u63A5\u900F\u4F20\u7ED9\u5BA2\u6237\u7AEF\uFF0C\u8DF3\u8FC7\u4EE3\u7406\u91CD\u5199\u3002\u6BCF\u884C\u4E00\u4E2A host\u3002</div>
                <textarea id="manualRedirectDomainsInput" rows="6" style="width:100%; padding:12px; border-radius:var(--radius-md); border:1px solid var(--border); background:var(--card); font-family:monospace;"></textarea>
                <div style="margin-top:10px;">
                    <button type="button" class="btn-tier is-primary" onclick="saveManualRedirectDomains()">\u4FDD\u5B58\u767D\u540D\u5355</button>
                </div>
            </div>
            </div><!-- /net-panel redirect -->

            <!-- \u5BA2\u6237\u7AEF\u811A\u672C\u5DF2\u62BD\u79BB\u4E3A\u5916\u90E8\u9759\u6001\u8D44\u6E90\uFF0C\u89C1 <head> \u7684 defer \u811A\u672C -->

            <!-- Mobile-only overflow action sheet for \u6D4B\u901F & DNS (v2.6.0) -->
            <div id="sdMoreSheet" class="sd-more-sheet" aria-hidden="true">
                <div class="more-sheet-card" role="dialog" aria-modal="true" aria-label="\u66F4\u591A\u64CD\u4F5C">
                    <span class="more-sheet-grip" aria-hidden="true"></span>
                    <p class="more-sheet-title">\u6D4B\u901F &amp; DNS \xB7 \u66F4\u591A\u64CD\u4F5C</p>
                    <div class="more-sheet-list">
                        <button type="button" class="more-sheet-row" onclick="closeSdMoreSheet(); batchTcpPing();">
                            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="9" height="9" rx="2"/><rect x="12" y="12" width="9" height="9" rx="2"/></svg>
                            <span>\u590D\u5236\u53BB ITDog</span>
                            <svg class="ms-chevron" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                        <button type="button" class="more-sheet-row" onclick="closeSdMoreSheet(); directSubmitCname();">
                            <svg viewBox="0 0 24 24"><polyline points="13 17 18 12 13 7"/><line x1="18" y1="12" x2="6" y2="12"/></svg>
                            <span>\u76F4\u63A8 CNAME (\u514D\u6D4B\u901F)</span>
                            <svg class="ms-chevron" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                        <button type="button" class="more-sheet-row" onclick="closeSdMoreSheet(); updateTop3ToDns();">
                            <svg viewBox="0 0 24 24"><polyline points="12 19 12 5"/><polyline points="6 11 12 5 18 11"/></svg>
                            <span>\u66F4\u65B0 TOP3 \u81F3 DNS</span>
                            <svg class="ms-chevron" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                        <button type="button" class="more-sheet-row is-danger" onclick="closeSdMoreSheet(); clearTest();">
                            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                            <span>\u6E05\u7A7A\u5217\u8868</span>
                            <svg class="ms-chevron" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                    </div>
                    <button type="button" class="sd-sheet-cancel" onclick="closeSdMoreSheet()">\u53D6\u6D88</button>
                </div>
            </div>

            </section><!-- /sec-speed -->

            <!-- ===== \u5206\u533A: \u7CFB\u7EDF\u8BBE\u7F6E ===== -->
            <section id="sec-settings" class="app-section" data-section="settings" style="display:none;">

            <div class="card" id="settings-anchor">
                <div style="display:flex; justify-content: space-between; align-items:flex-start; margin-bottom:18px; flex-wrap:wrap; gap:10px;">
                    <div>
                        <h2 style="margin:0; font-size:var(--text-2xl); letter-spacing:-0.01em;">\u90E8\u7F72\u53CD\u4EE3\u8282\u70B9</h2>
                        <div style="color:var(--text-sec); font-size:var(--text-md); margin-top:4px;">\u586B\u5199\u4E0B\u65B9\u4FE1\u606F\u540E\u4FDD\u5B58\u3002\u6BCF\u4E2A\u8282\u70B9\u5360\u7528\u4E00\u4E2A URL \u524D\u7F00\u3002</div>
                    </div>
                    <div class="menu-wrap">
                        <button type="button" class="btn-tier is-sm" onclick="toggleMenu(this)"><svg><use href="#i-more"/></svg>\u914D\u7F6E\u5DE5\u5177 <svg><use href="#i-chevron"/></svg></button>
                        <div class="menu">
                            <button type="button" onclick="exportConfig(); closeAllMenus();"><svg><use href="#i-download"/></svg>\u5BFC\u51FA\u5F53\u524D\u914D\u7F6E</button>
                            <button type="button" onclick="importConfig(); closeAllMenus();"><svg><use href="#i-upload"/></svg>\u5BFC\u5165\u914D\u7F6E</button>
                        </div>
                    </div>
                </div>

                <div id="formHost">
                <form id="addForm" class="a-form">
                    <input type="hidden" id="oldPrefix" value="">

                    <!-- 1. \u57FA\u7840\u4FE1\u606F -->
                    <div class="a-fieldset">
                        <div class="a-fieldset-head">
                            <span class="a-field-label">\u57FA\u7840\u4FE1\u606F</span>
                            <span class="a-field-aux">\u5907\u6CE8\u7528\u4E8E\u663E\u793A\uFF0C\u524D\u7F00\u51B3\u5B9A\u8BBF\u95EE\u8DEF\u5F84</span>
                        </div>
                        <div class="a-row">
                            <input class="a-input" type="text" id="remark" placeholder="\u8282\u70B9\u5907\u6CE8 (\u5982: Misaka\u670D)" required>
                            <input class="a-input" type="text" id="prefix" placeholder="\u77ED\u8DEF\u5F84\u540E\u7F00 (\u5982: misaka)" required>
                            <input class="a-input" type="text" id="groupName" placeholder="\u5206\u7EC4/\u6807\u7B7E (\u53EF\u9009, \u5982: \u5BB6\u5BBD)">
                            <select class="a-select" id="mode">
                                <option value="off">\u4FDD\u5B88 (\u62B9\u9664IP)</option>
                                <option value="realip_only">\u4E25\u683C (\u900F\u4F20IP)</option>
                                <option value="dual">\u517C\u5BB9 (\u53CC\u91CD\u900F\u4F20)</option>
                                <option value="strict">\u5F3A\u529B (\u9632403)</option>
                            </select>
                        </div>
                    </div>

                    <!-- 2. \u4E0A\u6E38\u7EBF\u8DEF -->
                    <div class="a-fieldset">
                        <div class="a-fieldset-head">
                            <span class="a-field-label">\u4E0A\u6E38\u7EBF\u8DEF</span>
                            <span class="a-field-aux">\u4E3B\u6E90\u5931\u8D25\u65F6\u6309\u987A\u5E8F\u56DE\u9000\u5230\u5907\u7528\uFF0C\u652F\u6301\u9B54\u6539\u5206\u79BB\u7248\u63A8\u6D41</span>
                        </div>
                        <div id="targetInputs" style="display:flex; flex-direction:column; gap:8px;">
                            <div class="a-upstream-row">
                                <span class="a-tag-pri">\u4E3B\u6E90</span>
                                <input type="url" class="a-input target-input" placeholder="\u4E3B\u7EBF\u8DEF\u5730\u5740 (\u5982: http://1.1.1.1:8096)" required oninput="handleTargetInputs()">
                            </div>
                            <div class="a-upstream-row">
                                <span class="a-tag-bk">\u5907 1</span>
                                <input type="url" class="a-input target-input" placeholder="\u5907\u7528\u7EBF\u8DEF 1 (\u9009\u586B\uFF0C\u4E3B\u6E90\u6302\u6389\u65F6\u89E6\u53D1)" oninput="handleTargetInputs()">
                            </div>
                        </div>
                        <button type="button" class="a-add-row" onclick="addBackupLine()"><svg><use href="#i-plus"/></svg>\u6DFB\u52A0\u5907\u7528\u7EBF\u8DEF</button>
                    </div>

                    <!-- 3. \u81EA\u5B9A\u4E49\u8BF7\u6C42\u5934 -->
                    <div class="a-fieldset">
                        <div class="a-fieldset-head">
                            <span class="a-field-label">\u81EA\u5B9A\u4E49\u8BF7\u6C42\u5934</span>
                            <span class="a-field-aux">\u8F6C\u53D1\u5230\u4E0A\u6E38\u65F6\u9644\u52A0\uFF0C<span id="hed-count">0</span> \u6761\u5DF2\u542F\u7528</span>
                        </div>
                        <div class="hed" id="hed-editor">
                            <div class="hed-head">
                                <span></span><span>Header</span><span>Value</span>
                                <span style="text-align:center">\u542F\u7528</span><span></span>
                            </div>
                            <div class="hed-list" id="hed-list"></div>
                            <div class="hed-footer">
                                <button type="button" class="a-add-row" onclick="HeadersEditor.addRow()"><svg><use href="#i-plus"/></svg>\u6DFB\u52A0\u8BF7\u6C42\u5934</button>
                                <div class="hed-meta"><span class="dot"></span><span>\u81EA\u52A8\u5FFD\u7565\u7A7A\u884C / \u6CE8\u91CA (#) / \u91CD\u590D\u952E</span></div>
                            </div>
                            <div class="templates">
                                <span class="templates-label">\u5E38\u7528\u6A21\u677F\uFF1A</span>
                                <button type="button" class="chip" onclick="HeadersEditor.insertTemplate('Authorization','Bearer ')">+ Authorization</button>
                                <button type="button" class="chip" onclick="HeadersEditor.insertTemplate('Cookie','')">+ Cookie</button>
                                <button type="button" class="chip" onclick="HeadersEditor.insertTemplate('X-Emby-Token','')">+ X-Emby-Token</button>
                                <button type="button" class="chip" onclick="HeadersEditor.insertTemplate('X-Forwarded-For','')">+ X-Forwarded-For</button>
                                <button type="button" class="chip" onclick="HeadersEditor.insertTemplate('User-Agent','')">+ User-Agent</button>
                                <button type="button" class="chip chip-import" onclick="HeadersEditor.openImportModal()"><svg><use href="#i-download"/></svg>\u4ECE\u8282\u70B9\u5BFC\u5165</button>
                                <button type="button" class="chip chip-curl" onclick="HeadersEditor.openCurlModal()">\u7C98\u8D34 cURL...</button>
                            </div>
                        </div>
                    </div>

                    <!-- \u4FDD\u53F7\u63D0\u9192 -->
                    <div class="a-fieldset">
                        <div class="a-fieldset-head">
                            <span class="a-field-label">\u4FDD\u53F7\u63D0\u9192</span>
                            <span class="a-field-aux">\u8D85\u8FC7 N \u5929\u672A\u89C2\u770B\u5C06\u901A\u8FC7 Telegram \u63D0\u9192\uFF080 = \u5173\u95ED\uFF09</span>
                        </div>
                        <div class="a-row">
                            <input type="number" id="keepaliveDays" class="a-input" min="0" max="365" placeholder="\u5929\u6570\uFF080 \u5173\u95ED\uFF09">
                        </div>
                    </div>

                    <!-- \u5A92\u4F53\u8BA1\u6570\u8D26\u53F7\uFF08\u672C\u8282\u70B9\u72EC\u7ACB Emby \u8D26\u53F7\uFF1B\u7559\u7A7A\u7528\u5168\u5C40\u5171\u4EAB\uFF09 -->
                    <div class="a-fieldset">
                        <div class="a-fieldset-head">
                            <span class="a-field-label">\u5A92\u4F53\u8BA1\u6570\u8D26\u53F7</span>
                            <span class="a-field-aux">\u4E3A\u672C\u8282\u70B9\u5355\u72EC\u6307\u5B9A Emby \u8D26\u53F7\u62C9\u53D6\u5A92\u4F53\u5E93\u8BA1\u6570\uFF1B\u7559\u7A7A\u5219\u4F7F\u7528\u5168\u5C40\u5171\u4EAB\u8D26\u53F7\u3002\u5BC6\u7801\u7559\u7A7A\u8868\u793A\u4E0D\u4FEE\u6539</span>
                        </div>
                        <div class="a-row two">
                            <input type="text" id="embyUsername" class="a-input" placeholder="\u72EC\u7ACB\u7528\u6237\u540D\uFF08\u53EF\u9009\uFF09" autocomplete="off">
                            <input type="password" id="embyPassword" class="a-input" placeholder="\u72EC\u7ACB\u5BC6\u7801\uFF08\u7559\u7A7A\u4E0D\u6539\uFF09" autocomplete="new-password">
                        </div>
                    </div>

                    <!-- 4. \u663E\u793A & \u7F13\u5B58 -->
                    <div class="a-fieldset">
                        <span class="a-field-label">\u663E\u793A &amp; \u7F13\u5B58</span>
                        <div class="a-row two">
                            <div class="pos-rel">
                                <div class="a-card-pick" onclick="toggleIconPicker(event)" id="iconSelectBtn">
                                    <img id="iconPreview" src="" style="width:32px;height:32px;display:none;border-radius:var(--radius-md);object-fit:cover;">
                                    <span id="iconDefault" style="font-size:var(--text-3xl);line-height:1;">\u{1F3AC}</span>
                                    <div class="flex-1-min0">
                                        <div class="label-bold">\u8282\u70B9\u56FE\u6807</div>
                                        <div id="iconSelectText" style="font-size:var(--text-xs); color:var(--text-sec); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">\u70B9\u51FB\u9009\u62E9 \xB7 \u6216\u7C98\u8D34 URL</div>
                                    </div>
                                    <input type="hidden" id="iconUrl" value="">
                                </div>
                                <div id="iconPickerPanel" style="display:none; position: absolute; top: 100%; left: 0; width: 100%; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); z-index: 100; margin-top: 8px; flex-direction: column; gap: 10px;">
                                    <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px;">
                                        <input type="text" id="customIconUrlInput" placeholder="\u8F93\u5165\u81EA\u5B9A\u4E49 JSON \u56FE\u6807\u5E93\u94FE\u63A5..." style="flex: 1; padding: 8px 10px; border: 1px solid var(--border); border-radius: var(--radius-md); background:var(--bg); font-size: var(--text-md); color: var(--text);">
                                        <button type="button" class="btn-tier is-primary is-sm" onclick="setCustomIconLibrary()">\u52A0\u8F7D</button>
                                        <button type="button" class="btn-tier is-sm" onclick="resetIconLibrary()">\u9ED8\u8BA4\u5E93</button>
                                    </div>
                                    <input type="text" id="iconSearch" placeholder="\u{1F50D} \u641C\u7D22\u56FE\u6807\u540D\u79F0..." style="padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius-md); background:var(--bg); width: 100%; font-size: var(--text-base); color: var(--text);" onkeyup="filterIcons()">
                                    <div id="iconGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); gap: 8px; overflow-y: auto; max-height: 240px; padding-right: 4px;">
                                        <div style="text-align:center; color:var(--text-sec); grid-column: 1 / -1; font-size: var(--text-md);">\u52A0\u8F7D\u56FE\u6807\u5E93\u4E2D...</div>
                                    </div>
                                </div>
                            </div>
                            <div class="a-toggle-row" id="cacheToggleRow" onclick="toggleCacheSwitch(this)">
                                <div class="ios-switch on"></div>
                                <div class="flex-1">
                                    <div class="label-bold">\u6D77\u62A5 &amp; \u9759\u6001\u8D44\u6E90\u7F13\u5B58</div>
                                    <div style="font-size:var(--text-xs); color:var(--text-sec);">\u964D\u4F4E\u4E0A\u6E38\u538B\u529B\uFF0C\u5EFA\u8BAE\u5F00\u542F</div>
                                </div>
                                <input type="checkbox" id="nodeCache" class="ip-checkbox" checked style="display:none;">
                            </div>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="a-footer">
                        <span class="a-footer-aux">\u6240\u6709\u66F4\u6539\u5B9E\u65F6\u4FDD\u5B58\u5230 Cloudflare D1</span>
                        <div class="a-footer-actions">
                            <button type="submit" id="submitBtn" class="btn-tier is-primary"><svg><use href="#i-save"/></svg>\u4FDD\u5B58\u5E76\u90E8\u7F72</button>
                        </div>
                    </div>
                </form>
                </div>
            </div>
            </section><!-- /sec-settings -->

            <!-- ===== \u5206\u533A: \u5DE5\u5177\u7BB1 ===== -->
            <section id="sec-tools" class="app-section" data-section="tools" style="display:none;">
            <div class="card">
                <h2 style="margin:0 0 6px; font-size:var(--text-2xl);">\u5DE5\u5177\u7BB1</h2>
                <div style="color:var(--text-sec); font-size:var(--text-md); margin-bottom:18px;">\u914D\u7F6E\u5BFC\u5165\u5BFC\u51FA\u3001cURL \u8BF7\u6C42\u5934\u89E3\u6790\u7B49\u5B9E\u7528\u5DE5\u5177\u3002</div>
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <button type="button" class="btn-tier" onclick="exportConfig()"><svg><use href="#i-download"/></svg>\u5BFC\u51FA\u5F53\u524D\u914D\u7F6E</button>
                    <button type="button" class="btn-tier" onclick="importConfig()"><svg><use href="#i-upload"/></svg>\u5BFC\u5165\u914D\u7F6E</button>
                    <button type="button" class="btn-tier" onclick="HeadersEditor.openCurlModal()"><svg><use href="#i-key"/></svg>cURL \u8BF7\u6C42\u5934\u89E3\u6790</button>
                    <button type="button" class="btn-tier" onclick="openWorkerUpdate()"><svg><use href="#i-save"/></svg>\u66F4\u65B0 Worker \u6838\u5FC3\u4EE3\u7801</button>
                </div>
                <div style="margin-top:16px; font-size:var(--text-sm); color:var(--text-sec); line-height:1.6;">
                    \u63D0\u793A\uFF1AcURL \u89E3\u6790\u4F1A\u628A\u7C98\u8D34\u7684\u8BF7\u6C42\u5934\u586B\u5165\u5F53\u524D\u90E8\u7F72\u8868\u5355\u7684\u300C\u81EA\u5B9A\u4E49\u8BF7\u6C42\u5934\u300D\u7F16\u8F91\u5668\uFF0C\u8BF7\u5148\u5728\u300C\u7CFB\u7EDF\u8BBE\u7F6E\u300D\u4E2D\u51C6\u5907\u597D\u8282\u70B9\u4FE1\u606F\u3002
                </div>
            </div>
            </section><!-- /sec-tools -->

            <!-- ===== \u5206\u533A: \u6982\u89C8 (\u8282\u70B9\u7BA1\u7406) ===== -->
            <section id="sec-overview" class="app-section is-active" data-section="overview">
            <!-- Operations Cockpit \xB7 \u8FD0\u7EF4\u770B\u677F\uFF1Averdict-first + Four Golden Signals -->
            <div class="cockpit-board" aria-label="\u8FD0\u7EF4\u770B\u677F">
                <div class="cockpit-verdict" id="cockpitVerdict">
                    <span class="cv-dot ok" id="cv-dot" aria-hidden="true"></span>
                    <div class="cv-text">
                        <span class="cv-headline" id="cv-headline">\u7CFB\u7EDF\u72B6\u6001\u8BFB\u53D6\u4E2D\u2026</span>
                        <span class="cv-sub" id="cv-sub">\u5B9E\u65F6\u53CD\u4EE3\u8282\u70B9\u6D3B\u8DC3\u5EA6</span>
                    </div>
                    <div class="cv-nodes"><b id="kpi-online-nodes">--</b> / <span id="kpi-total-nodes">--</span> <span class="cv-nodes-k">\u8282\u70B9\u5728\u7EBF</span></div>
                </div>
                <div class="signal-strip" role="group" aria-label="\u6838\u5FC3\u4FE1\u53F7 Golden Signals">
                    <div class="signal-cell">
                        <span class="sig-k">\u5EF6\u8FDF</span>
                        <span class="sig-v"><span id="kpi-rtt" class="skeleton">--</span><span class="sig-u">ms</span></span>
                        <span class="sig-sub">\u8FB9\u7F18 RTT</span>
                    </div>
                    <div class="signal-cell">
                        <span class="sig-k">\u6D41\u91CF</span>
                        <span class="sig-v"><span id="kpi-traffic" class="skeleton">--</span></span>
                        <span class="sig-sub">\u4ECA\u65E5\u7D2F\u79EF</span>
                    </div>
                    <div class="signal-cell">
                        <span class="sig-k">\u9519\u8BEF</span>
                        <span class="sig-v"><span id="kpi-errors" class="skeleton">--</span></span>
                        <span class="sig-sub">\u79BB\u7EBF\u8282\u70B9</span>
                    </div>
                    <div class="signal-cell">
                        <span class="sig-k">\u9971\u548C</span>
                        <span class="sig-v"><span id="kpi-health" class="skeleton">--</span><span class="sig-u">%</span></span>
                        <div class="kpi-health-bar"><span id="kpi-health-bar-fill"></span></div>
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="section-header-row">
                    <h2 class="section-title">\u5DF2\u53CD\u4EE3\u7684\u5A92\u4F53\u5E93</h2>
                    <div style="display: flex; gap: 8px; align-items:center; flex-wrap: wrap;">
                        <div class="view-toggle" role="group" aria-label="\u89C6\u56FE\u5207\u6362">
                            <button type="button" id="view-grid" class="view-toggle-btn is-active" onclick="setNodeView('grid')" title="\u5361\u7247\u89C6\u56FE" aria-label="\u5361\u7247\u89C6\u56FE" aria-pressed="true">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
                            </button>
                            <button type="button" id="view-list" class="view-toggle-btn" onclick="setNodeView('list')" title="\u5217\u8868\u89C6\u56FE" aria-label="\u5217\u8868\u89C6\u56FE" aria-pressed="false">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1.3"/><circle cx="3.5" cy="12" r="1.3"/><circle cx="3.5" cy="18" r="1.3"/></svg>
                            </button>
                        </div>
                        <div class="view-toggle" role="group" aria-label="\u524D\u7F00\u6253\u7801">
                            <button type="button" id="mask-prefix-btn" class="view-toggle-btn is-active" onclick="togglePrefixMask()" title="\u524D\u7F00\u5DF2\u6253\u7801 \xB7 \u70B9\u51FB\u663E\u793A\u660E\u6587" aria-label="\u5207\u6362\u524D\u7F00\u6253\u7801" aria-pressed="true">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/><line x1="3" y1="3" x2="21" y2="21"/></svg>
                            </button>
                        </div>
                        <button type="button" class="btn-tier is-sm" onclick="pingAllNodes()">\u5168\u5C40\u6D4B\u901F</button>
                        <button type="button" id="btnPurge" class="btn-tier is-sm is-danger" onclick="purgeCache()">\u5237\u65B0\u5168\u7AD9\u6D77\u62A5</button>
                        <input type="text" id="searchNode" class="search-input" placeholder="\u{1F50D} \u641C\u7D22\u5907\u6CE8\u6216\u540E\u7F00\u67E5\u627E..." onkeyup="filterNodesList()">
                    </div>
                </div>

                <!-- \u76D1\u63A7\u4E0E\u5A92\u4F53\u8BA1\u6570\uFF1A\u63A2\u9488\u544A\u8B66 + \u53CD\u4EE3\u767D\u540D\u5355 + \u5168\u5C40\u5171\u4EAB Emby \u8D26\u53F7 -->
                <details class="ov-monitor" id="ovMonitor">
                    <summary class="ov-monitor-summary">
                        <span class="ov-monitor-head">
                            <svg class="ov-monitor-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>
                            <span class="ov-monitor-title">\u76D1\u63A7\u4E0E\u5A92\u4F53\u8BA1\u6570</span>
                        </span>
                        <span class="ov-monitor-meta" id="ovMonitorMeta">\u5728\u7EBF \u2014/\u2014</span>
                        <svg class="ov-monitor-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
                    </summary>
                    <div class="ov-monitor-body">
                        <div class="ov-monitor-actions">
                            <span class="ov-monitor-fact"><span class="ov-monitor-fact-dot"></span>\u6BCF\u5206\u949F\u63A2\u6D4B \xB7 \u8FDE\u7EED 5 \u5206\u949F\u5931\u8D25\u544A\u8B66 \xB7 \u5168\u90E8\u8282\u70B9\u81EA\u52A8\u62C9\u53D6\u5A92\u4F53\u8BA1\u6570</span>
                        </div>
                        <div class="ns-controls">
                            <div class="ns-control-row">
                                <span class="ns-control-main">
                                    <span class="ns-control-title">\u4EE3\u7406\u56FD\u5BB6\u767D\u540D\u5355</span>
                                    <span class="ns-control-sub">\u4EC5\u5141\u8BB8\u8FD9\u4E9B\u56FD\u5BB6/\u5730\u533A\u7684\u5BA2\u6237\u7AEF\u8D70\u53CD\u4EE3\uFF1B\u7BA1\u7406\u7AEF\u70B9\u4E0D\u53D7\u5F71\u54CD\uFF0C\u7559\u7A7A\u5373\u5173\u95ED</span>
                                </span>
                                <span class="ns-control-field">
                                    <input type="text" id="proxyCountryAllowlist" class="ns-input" placeholder="\u4F8B\uFF1ACN,HK,TW">
                                    <button type="button" class="btn-tier is-sm" onclick="saveCountryAllowlist()">\u4FDD\u5B58</button>
                                </span>
                            </div>
                            <div class="ns-control-row">
                                <span class="ns-control-main">
                                    <span class="ns-control-title">\u9632\u76D7\u94FE Referer \u767D\u540D\u5355</span>
                                    <span class="ns-control-sub">\u5141\u8BB8\u5185\u5D4C\u7684\u6765\u6E90\u57DF\u540D\uFF08\u9017\u53F7\u5206\u9694\uFF09\uFF1B\u5E26 Referer \u4E14\u4E0D\u5728\u540D\u5355\u7684\u6D4F\u89C8\u5668\u8BF7\u6C42\u4F1A\u88AB\u62E6\u622A\uFF0C\u539F\u751F\u64AD\u653E\u5668\uFF08\u65E0 Referer\uFF09\u4E0D\u53D7\u5F71\u54CD\uFF0C\u7559\u7A7A\u5373\u5173\u95ED</span>
                                </span>
                                <span class="ns-control-field">
                                    <input type="text" id="hotlinkAllowHosts" class="ns-input" placeholder="\u4F8B\uFF1Aemby.example.com,my.site">
                                    <button type="button" class="btn-tier is-sm" onclick="saveHotlinkHosts()">\u4FDD\u5B58</button>
                                </span>
                            </div>
                            <div class="ns-control-row">
                                <span class="ns-control-main">
                                    <span class="ns-control-title">\u5168\u5C40\u5171\u4EAB Emby \u8D26\u53F7</span>
                                    <span class="ns-control-sub">\u5A92\u4F53\u8BA1\u6570\u7684\u9ED8\u8BA4\u767B\u5F55\u8D26\u53F7\uFF0C\u6240\u6709\u8282\u70B9\u5171\u7528\uFF1B\u53EF\u5728\u67D0\u4E2A\u8282\u70B9\u7684\u300C\u7F16\u8F91\u300D\u91CC\u5355\u72EC\u8986\u76D6\u3002\u9274\u6743 UA \u53D6\u81EA\u8BE5\u8282\u70B9\u8BBF\u95EE\u65E5\u5FD7\uFF0C\u65E5\u5FD7\u65E0 UA \u65F6\u4E0D\u53D1\u8D77\u8BF7\u6C42</span>
                                </span>
                                <span class="ns-control-field ns-control-field-creds">
                                    <input type="text" id="embySharedUser" class="ns-input" placeholder="\u5171\u4EAB\u7528\u6237\u540D" autocomplete="off">
                                    <input type="password" id="embySharedPass" class="ns-input" placeholder="\u5171\u4EAB\u5BC6\u7801\uFF08\u7559\u7A7A\u4E0D\u6539\uFF09" autocomplete="new-password">
                                    <button type="button" class="btn-tier is-sm" onclick="saveEmbySharedCreds()">\u4FDD\u5B58</button>
                                </span>
                            </div>
                        </div>
                    </div>
                </details>

                <div style="background: rgba(0, 122, 255, 0.05); padding: 12px 20px; border-radius: 12px; border: 1px dashed var(--primary); margin-bottom: 20px; margin-top: 20px; display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
            <label style="cursor: pointer; font-weight: bold; display: flex; align-items: center; gap: 6px;">
                <input type="checkbox" id="selectAllNodes" onchange="toggleSelectAll(this)" style="width: 18px; height: 18px; accent-color: var(--primary);"> 
                \u5168\u9009\u8282\u70B9
            </label>
            
            <div style="width: 2px; height: 20px; background: var(--border);"></div> <select id="batch-mode-select" style="padding: 8px 12px; border-radius: var(--radius-md); border: 1px solid var(--border); background: var(--bg); color: var(--text); font-weight: 600;">
                <option value="">\u8BFB\u53D6\u6A21\u5F0F\u4E2D...</option>
            </select>

            <button onclick="batchUpdateModes()" style="background: var(--primary); color: var(--bg); border: none; padding: 8px 16px; border-radius: var(--radius-md); cursor: pointer; font-weight: bold; transition: 0.2s; box-shadow: 0 4px 10px var(--primary-ring);">
                \u6279\u91CF\u5E94\u7528\u6A21\u5F0F
            </button>

            <span id="batch-status" class="label-bold"></span>
        </div>
                <div id="list-grid" class="node-grid">
                    <div style="text-align:center; color:var(--text-sec); grid-column: 1 / -1; padding: 40px;">\u8BFB\u53D6\u6570\u636E\u4E2D...</div>
                </div>
            </div>

            <div style="text-align: center; padding-top: 10px; padding-bottom: 20px;">
                <div style="margin-top: 20px; font-size: var(--text-sm); color: var(--text-sec); line-height: 1.6; max-width: 600px; margin-left: auto; margin-right: auto; padding: 0 15px;">
                    <strong>\u514D\u8D23\u58F0\u660E:</strong> \u672C\u9879\u76EE\u4EC5\u4F9B\u5B66\u4E60\u4E0E\u6280\u672F\u6D4B\u8BD5\u4F7F\u7528\uFF0C\u8BF7\u9075\u5B88\u5F53\u5730\u6CD5\u5F8B\u6CD5\u89C4\u3002\u4F7F\u7528\u8005\u5BF9\u914D\u7F6E\u3001\u8F6C\u53D1\u5185\u5BB9\u4E0E\u8BBF\u95EE\u884C\u4E3A\u627F\u62C5\u5168\u90E8\u8D23\u4EFB\uFF0C\u5F00\u53D1\u8005\u4E0D\u5BF9\u4EFB\u4F55\u76F4\u63A5\u6216\u95F4\u63A5\u635F\u5931\u8D1F\u8D23\u3002
                </div>
            </div>
            </section><!-- /sec-overview -->

            <!-- ===== \u5371\u9669\u533A (\u72EC\u7ACB\u5206\u533A, \u66FF\u6362\u539F\u5E95\u90E8\u5E38\u9A7B\u6761 v2.3.0) ===== -->
            <section id="sec-danger" class="app-section" data-section="danger" style="display:none;">
                <div class="danger-hero">
                    <div class="dh-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    </div>
                    <div class="dh-text">
                        <h2 class="dh-title">\u5371\u9669\u64CD\u4F5C\u533A</h2>
                        <div class="dh-sub">\u4EE5\u4E0B\u64CD\u4F5C\u4E0D\u53EF\u9006\uFF0C\u8BF7\u786E\u8BA4\u7406\u89E3\u6BCF\u9879\u5F71\u54CD\u540E\u518D\u6267\u884C\u3002</div>
                    </div>
                </div>
                <div class="ios-form-group danger-group" role="group" aria-label="\u5371\u9669\u64CD\u4F5C">
                    <div class="ios-form-row">
                        <div class="flex-1-min0">
                            <div class="ifr-label">\u5237\u65B0\u5168\u7AD9\u6D77\u62A5\u7F13\u5B58</div>
                            <div class="ifr-sub">\u5F3A\u5236\u6E05\u7A7A CDN \u6D77\u62A5\u7F13\u5B58\u3002\u5BA2\u6237\u7AEF\u9996\u6B21\u52A0\u8F7D\u5EF6\u8FDF\u4F1A\u4E0A\u5347 1\u20133 \u79D2\uFF0C\u76F4\u5230\u7F13\u5B58\u91CD\u5EFA\u3002\u65E0\u6CD5\u56DE\u6EDA\u3002</div>
                        </div>
                        <button type="button" class="btn-tier is-danger" onclick="purgeCache()">\u6267\u884C\u5237\u65B0</button>
                    </div>
                    <div class="ios-form-row">
                        <div class="flex-1-min0">
                            <div class="ifr-label">\u8986\u76D6\u90E8\u7F72 Worker</div>
                            <div class="ifr-sub">\u7528\u672C\u5730\u6E90\u7801\u8986\u76D6\u7EBF\u4E0A Worker \u5E76\u91CD\u542F\u8282\u70B9\u3002\u671F\u95F4\u6240\u6709\u53CD\u4EE3\u8BF7\u6C42\u4F1A\u51FA\u73B0 5\u201315 \u79D2\u7684\u8FDE\u63A5\u6296\u52A8\u3002</div>
                        </div>
                        <button type="button" class="btn-tier is-danger" onclick="openWorkerUpdate()">\u6253\u5F00\u90E8\u7F72\u9762\u677F</button>
                    </div>
                    <div class="ios-form-row">
                        <div class="flex-1-min0">
                            <div class="ifr-label">\u9000\u51FA\u767B\u5F55</div>
                            <div class="ifr-sub">\u6E05\u9664\u5F53\u524D\u4F1A\u8BDD\uFF0C\u65AD\u5F00\u7BA1\u7406\u9762\u677F\u8BBF\u95EE\u3002\u5176\u4ED6\u5BA2\u6237\u7AEF\u4E0D\u53D7\u5F71\u54CD\u3002\u53EF\u968F\u65F6\u901A\u8FC7\u767B\u5F55\u9875\u91CD\u65B0\u8FDB\u5165\u3002</div>
                        </div>
                        <button type="button" class="btn-tier is-danger" onclick="logout()">\u7ACB\u5373\u9000\u51FA</button>
                    </div>
                </div>
            </section><!-- /sec-danger -->

        </div><!-- /.content -->

        </div><!-- /.app-main -->
    </div><!-- /.app-shell -->

    <!-- cURL paste modal (UI Suggestions v2.0.7) -->
    <div class="curl-modal-bg" id="curlModal" onclick="if(event.target===this) HeadersEditor.closeCurlModal()">
        <div class="curl-modal">
            <h3>\u4ECE cURL \u547D\u4EE4\u5BFC\u5165</h3>
            <p>\u7C98\u8D34\u6D4F\u89C8\u5668 DevTools \u300CCopy as cURL\u300D \u51FA\u6765\u7684\u5185\u5BB9\uFF0C\u81EA\u52A8\u63D0\u53D6\u6240\u6709 <code style="background:rgba(120,120,120,0.1);padding:1px 4px;border-radius:3px;font-size:var(--text-xs);">-H</code> \u6807\u5934\uFF1A</p>
            <textarea id="curlInput" placeholder="curl 'https://example.com/api/users/AuthenticateByName' \\&#10;  -H 'authorization: MediaBrowser Token=&quot;xxx&quot;' \\&#10;  -H 'x-emby-token: abc123' \\&#10;  --compressed"></textarea>
            <div class="curl-modal-actions">
                <button class="btn-tier" onclick="HeadersEditor.closeCurlModal()">\u53D6\u6D88</button>
                <button class="btn-tier is-primary" onclick="HeadersEditor.parseCurl()">\u89E3\u6790\u5E76\u5BFC\u5165</button>
            </div>
        </div>
    </div>

    <!-- \u4ECE\u5DF2\u6709\u8282\u70B9\u5BFC\u5165\u8BF7\u6C42\u5934 modal -->
    <div class="curl-modal-bg" id="importHeadersModal" onclick="if(event.target===this) HeadersEditor.closeImportModal()">
        <div class="curl-modal">
            <h3>\u4ECE\u5DF2\u6709\u8282\u70B9\u5BFC\u5165\u8BF7\u6C42\u5934</h3>
            <p>\u9009\u62E9\u4E00\u4E2A\u6E90\u8282\u70B9\uFF0C\u628A\u5B83\u7684\u81EA\u5B9A\u4E49\u8BF7\u6C42\u5934\u5408\u5E76\u5230\u5F53\u524D\u7F16\u8F91\u5668\uFF08<strong>\u540C\u540D\u952E\u4EE5\u6E90\u8282\u70B9\u4E3A\u51C6</strong>\uFF0C\u5176\u4F59\u8FFD\u52A0\uFF09\uFF1A</p>
            <div class="import-node-list" id="importNodeList"></div>
            <div class="curl-modal-actions">
                <button class="btn-tier" onclick="HeadersEditor.closeImportModal()">\u53D6\u6D88</button>
            </div>
        </div>
    </div>

    <!-- \u79FB\u52A8\u7AEF\u5E95\u90E8\u5BFC\u822A Tab Bar \u2014 Operations Cockpit 3 \u76EE\u7684\u5730 (\u684C\u9762\u7AEF CSS \u9690\u85CF) -->
    <nav id="mobileTabBar" aria-label="\u5E95\u90E8\u5BFC\u822A">
        <button type="button" data-dest="monitor" class="active" aria-label="\u76D1\u63A7">
            <svg viewBox="0 0 24 24"><path d="M3 12h4l3 8 4-16 3 8h4"/></svg>
            <span>\u76D1\u63A7</span>
        </button>
        <button type="button" data-dest="network" aria-label="\u7F51\u7EDC">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>
            <span>\u7F51\u7EDC</span>
        </button>
        <button type="button" data-dest="config" aria-label="\u914D\u7F6E">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span>\u914D\u7F6E</span>
        </button>
    </nav>


</body>
</html>
`,ze=`W/"${It}-${$e.length.toString(36)}"`;function oa(t){let e=new URL(t);if(e.protocol==="https:")e.protocol="http:";else if(e.protocol==="http:")e.protocol="https:";else return null;return e}async function ra(t,e,s){let o=[525,526,530];if(!s)return await fetch(new Request(t,e));try{let a=await fetch(new Request(t,e));if(!o.includes(a.status))return a;let r=oa(t);if(!r)return a;try{return await fetch(new Request(r,e))}catch{return a}}catch(a){let r=oa(t);if(!r)throw a;return await fetch(new Request(r,e))}}async function na(t,e,s,o){let a=[];o!=="strict"&&a.push(i=>{i.set("Origin",t.origin),i.set("Referer",t.origin+"/")}),a.push(i=>{i.delete("Origin"),i.delete("Referer");for(let n of[...i.keys()])n.toLowerCase().startsWith("sec-fetch-")&&i.delete(n)}),a.push(i=>{let n=["user-agent","accept","host","x-emby-token","x-mediabrowser-token","x-emby-authorization","authorization","content-type","content-length"];for(let c of[...i.keys()])n.includes(c.toLowerCase())||i.delete(c)});let r=null;for(let i of a){let n=new Headers(e);i(n);try{let c=await fetch(new Request(t,{...s,headers:n}));if(c.status!==403)return c;r=c}catch{}}return r}var xt=new Map,Co=15e3,Do=3e5;function ee(t,e){let s=[],o=[];for(let a=0;a<t.length;a++){let r=xt.get(t[a]);r&&r.failUntil>e?o.push(a):s.push(a)}return s.concat(o)}function Rt(t,e){let s=xt.get(t)||{failUntil:0,consec:0};s.consec+=1;let o=Math.min(Co*2**(s.consec-1),Do);s.failUntil=e+o,xt.set(t,s)}function se(t){xt.has(t)&&xt.delete(t)}function ia(t,e){return(t||"_")+(e||"")}async function ca(t,e){if(!t.POSTER_CACHE)return null;try{let s=await t.POSTER_CACHE.get(e);if(!s||!s.body)return null;let o=new Headers;return typeof s.writeHttpMetadata=="function"&&s.writeHttpMetadata(o),o.set("Cache-Control","public, max-age=86400"),o.set("Access-Control-Allow-Origin","*"),o.set("X-R2-Cache","HIT"),new Response(s.body,{status:200,headers:o})}catch{return null}}function la(t,e,s,o){if(!t.POSTER_CACHE||!o||typeof o.waitUntil!="function"||!s||s.status!==200)return;let a=s.headers.get("content-type")||"";if(!/^image\//i.test(a)||parseInt(s.headers.get("content-length")||"0",10)>5242880)return;let i;try{i=s.clone()}catch{return}o.waitUntil((async()=>{try{let n=await i.arrayBuffer();if(n.byteLength===0||n.byteLength>5242880)return;await t.POSTER_CACHE.put(e,n,{httpMetadata:{contentType:a,cacheControl:"public, max-age=86400"}})}catch{}})())}function Ge(t){return new Response("Too Many Requests",{status:429,headers:{"Retry-After":String(Math.max(1,Math.ceil(t/1e3)))}})}async function ae(t,e,s,o){let{table:a,minuteLimit:r,hourlyLimit:i,banMs:n,reason:c}=o,l=await x(t,"SELECT until FROM ip_bans WHERE ip = ?",e);if(l&&l.until>s)return Ge(l.until-s);let d=Math.floor(s/6e4),u=await x(t,`INSERT INTO ${a} (ip, win, n) VALUES (?, ?, 1)
         ON CONFLICT(ip, win) DO UPDATE SET n = n + 1 RETURNING n`,e,d);if(!u||u.n<=r)return null;let p=await x(t,`SELECT SUM(n) AS s FROM ${a} WHERE ip = ? AND win > ?`,e,d-60);return p&&p.s>i?(await F(t,"INSERT OR REPLACE INTO ip_bans (ip, until, reason) VALUES (?, ?, ?)",e,s+n,c),Ge(n)):Ge(6e4)}var Mo=30,Oo=200,Lo=36e5;async function da(t,e,s){if(!t.DB||!e||e==="Unknown")return null;try{return await ae(t,e,s,{table:"scan_rl",minuteLimit:Mo,hourlyLimit:Oo,banMs:Lo,reason:"prefix-scan"})}catch{return null}}function No(t,e){if(!e)return null;let s=(t.headers.get("cf-ipcountry")||"").toUpperCase();return!s||s==="XX"||!e.has(s)?new Response("Forbidden: country not allowed",{status:403}):null}function Io(t,e){if(!e)return null;let s=t.headers.get("referer")||t.headers.get("referrer")||"";if(!s)return null;let o="";try{o=new URL(s).host.toLowerCase()}catch{}let a=new URL(t.url).host.toLowerCase();return o&&o!==a&&!Ct(o,e)?new Response("Forbidden: hotlink not allowed",{status:403}):null}async function ua(t,e,s=null){let o=s?s.countrySet:await qe(e),a=No(t,o);if(a)return a;let r=s?s.hotlinkSet:await ts(e);return Io(t,r)}var Uo=/\.(jpe?g|gif|png|svg|ico|webp|avif)$/i,Bo=/(\/Images\/|\/Icons\/|\/Branding\/|\/emby\/covers\/)/i;function Fo(t){return Uo.test(t)||Bo.test(t)}var pa=new Map,ma=new Map,Po=8*1024*1024,Ho=15e3;async function fa(t,e,s,o){let a=[],r="off",i=!0,n="",c="",l=decodeURIComponent(o.pathname),d=null,u=new URL(t.url).origin,p=null,m=!1,b=0,h=Date.now();if(l.startsWith("/http://")||l.startsWith("/https://"))a=[l.substring(1)],n="";else{let y=l.split("/"),E=y[1];if(!E)return new Response("Not Found",{status:404});try{if(!e.DB)return new Response("404: Node not found (DB not bound)",{status:404});let C=await ve(e);if(p=C.config,m=C.cacheHit,b=C.loadMs,!p.ok)throw p.error||new Error("config load failed");let w=p.routesMap.get(E);if(!w){let S=t.headers.get("cf-connecting-ip")||t.headers.get("x-real-ip")||"",it=await da(e,S,Date.now());return it||new Response("404: Node not found",{status:404})}if(r=w.mode||"off",i=w.cache_img!=="off",d=E,n="/"+y.slice(2).join("/"),a=w.target.split(",").map(S=>S.trim()).filter(Boolean),c=w.custom_headers||"",w.keepalive_days>0&&jo(n,t.method)&&s&&s.waitUntil){let S=Math.floor(Date.now()/1e3),it=pa.get(E)||0;S-it>600&&(pa.set(E,S),s.waitUntil(Ds(e,E,S)))}if($o(n,t.method)&&s&&s.waitUntil){let S=Math.floor(Date.now()/1e3),it=ma.get(E)||0;if(S-it>60){ma.set(E,S);let Ut=pt();s.waitUntil(Ms(e,E,Ut))}}(n.startsWith("/http://")||n.startsWith("/https://"))&&(a=[n.substring(1)],n="")}catch(C){return new Response("DB Error: "+C.message,{status:500})}}if(a.length===0)return new Response("404: Target empty",{status:404});if(!p&&e.DB){let y=await ve(e);p=y.config,m=y.cacheHit,b=y.loadMs}p||(p={routesMap:null,countrySet:null,hotlinkSet:null,manualRedirectSet:new Set,ok:!1});let A=await ua(t,e,p);if(A)return A;if((t.headers.get("Upgrade")||"").toLowerCase()==="websocket"){let y=null;for(let E of ee(a,Date.now())){let C=new URL(a[E]+n+o.search),w=Te(t,C,r,c);try{let S=await fetch(new Request(C,{headers:w}));if(S.webSocket)return se(a[E]),new Response(null,{status:101,webSocket:S.webSocket});Rt(a[E],Date.now()),y=new Error(`Node ${E+1}: upstream did not upgrade (status ${S.status})`)}catch(S){Rt(a[E],Date.now()),y=S}}return new Response("WebSocket upstream failed. Last Error: "+(y?.message||"Unknown Error"),{status:502})}if(/\/PlaybackInfo/i.test(o.pathname)&&d&&e.DB&&s&&s.waitUntil)try{let y=K(),E=[_(e,"INSERT INTO request_stats (prefix, date, count) VALUES (?, ?, 1) ON CONFLICT(prefix, date) DO UPDATE SET count = count + 1",d,y)],C=t.headers.get("cf-connecting-ip")||t.headers.get("x-real-ip")||"Unknown",w=t.headers.get("cf-ipcountry")||"Unknown",S=t.headers.get("User-Agent")||"Unknown";E.push(_(e,"INSERT INTO visitor_logs (prefix, ip, country, ua) VALUES (?, ?, ?, ?)",d,C,w,S)),s.waitUntil(N(e,E))}catch{}let k=t.method!=="GET"&&t.method!=="HEAD"&&!!t.body,g=null;if(k){let y=await t.clone().arrayBuffer();y.byteLength<=Po&&(g=y)}let L=!k||g!==null,X=d&&i&&e.POSTER_CACHE&&t.method==="GET"&&Fo(o.pathname)?ia(d,n+o.search):null;if(X){let y=await ca(e,X);if(y)return y}let v=null,Z=null,Y=-1,$=0,tt=Date.now();for(let y of ee(a,Date.now())){let E=a[y]+n+o.search,C=new URL(E),w=Te(t,C,r,c),S=/\.(jpg|jpeg|gif|png|svg|ico|webp|js|css|woff2?|ttf|otf|map|webmanifest|srt|ass|vtt|sub)$/i.test(C.pathname)||/(\/Images\/|\/Icons\/|\/Branding\/|\/emby\/covers\/)/i.test(C.pathname),it=new AbortController,Ut=setTimeout(()=>it.abort(),Ho),_t={method:t.method,headers:w,redirect:"manual",signal:it.signal};S&&i&&(_t.cf={cacheEverything:!0,cacheTtl:86400}),k&&(g!==null?_t.body=g:(_t.body=t.body,_t.duplex="half")),$++;try{let ct=await ra(C,_t,L);if(clearTimeout(Ut),ct.status===403&&L){let We=await na(C,w,_t,r);We&&(ct=We)}if(ct.status===502||ct.status===503||ct.status===504){Rt(a[y],Date.now()),Z=new Error(`Node ${y+1} returned HTTP ${ct.status}`);continue}se(a[y]),Y=y,v=ct;break}catch(ct){clearTimeout(Ut),Rt(a[y],Date.now()),Z=ct;continue}}let Q=Date.now()-tt;if(!v)return new Response("Worker Proxy Failover Exhausted. All nodes failed. Last Error: "+(Z?.message||"Unknown Error"),{status:502});let T=new Headers(v.headers);if(e.DEBUG_FAILOVER==="1"&&(T.set("X-Proxy-Upstream-Index",String(Y)),T.set("X-Proxy-Upstream-Tries",String($))),e.DEBUG_TIMING==="1"){let y=Date.now()-h,E=m?"hit":"miss";T.set("Server-Timing",`d1;dur=${b};desc="${E}", upstream;dur=${Q}, total;dur=${y}`)}let G=d?`/${d}`:"";if([301,302,303,307,308].includes(v.status)){let y=T.get("Location");if(y){let E=null;try{/^https?:\/\//i.test(y)?E=new URL(y).host.toLowerCase():y.startsWith("//")&&(E=new URL(new URL(t.url).protocol+y).host.toLowerCase())}catch{}let C=e?.MANUAL_REDIRECT_ALLOWLIST?await be(e):p&&p.manualRedirectSet||new Set;if(E&&Ct(E,C))return T.set("Access-Control-Allow-Origin","*"),new Response(null,{status:v.status,headers:T});if(/^https?:\/\//i.test(y))T.set("Location",`${G}/${encodeURIComponent(y)}`);else if(y.startsWith("//")){let w=new URL(t.url).protocol+y;T.set("Location",`${G}/${encodeURIComponent(w)}`)}else if(y.startsWith("/"))G&&T.set("Location",`${G}${y}`);else try{let w=new URL(y,a[0]+n).href;T.set("Location",`${G}/${encodeURIComponent(w)}`)}catch{}}}T.set("Access-Control-Allow-Origin","*");let ut="";try{ut=new URL(a[0]).origin}catch{}function I(y){return y.replace(/https?:\/\/[^\s"'`<>{}|\\^[\]#,;)]+/g,E=>{let C=E.match(/[.,;)]+$/)?.[0]||"",w=C?E.slice(0,-C.length):E;try{let S=new URL(w);if(S.origin!==ut&&S.origin!==u)return u+G+"/"+w+C}catch{}return E})}let U=T.get("content-type")||"",W=o.pathname.toLowerCase(),q=v.status===200&&U.includes("json")&&W.includes("playbackinfo"),z=v.status===200&&U.includes("json")&&/\/system\/info(\/public)?$/i.test(W),f=v.status===200&&(W.endsWith(".m3u8")||W.endsWith(".mpd")||U.includes("mpegurl")||U.includes("dash+xml")),B=v.status===200&&ut&&(U.includes("text/html")||U.includes("text/javascript")||U.includes("application/javascript"));if(q||z||f||B)try{let y=await v.text();if(q)try{let E=JSON.parse(y),C=!1;if(E&&E.MediaSources&&E.MediaSources.forEach(w=>{["DirectStreamUrl","TranscodingUrl"].forEach(S=>{w[S]&&w[S].startsWith("http")&&!w[S].startsWith(u)&&(w[S]=u+G+"/"+w[S],C=!0)})}),C)return T.delete("Content-Length"),new Response(JSON.stringify(E),{status:v.status,statusText:v.statusText,headers:T})}catch(E){console.log("PlaybackInfo \u91CD\u5199\u5931\u8D25:",E.message)}if(z)try{let E=JSON.parse(y),C=!1;if(["Address","LocalAddress"].forEach(w=>{E[w]&&E[w].startsWith("http")&&!E[w].startsWith(u)&&(E[w]=u+G,C=!0)}),C)return T.delete("Content-Length"),new Response(JSON.stringify(E),{status:v.status,statusText:v.statusText,headers:T})}catch(E){console.log("System/Info \u91CD\u5199\u5931\u8D25:",E.message)}if(f&&(y.includes("http://")||y.includes("https://"))){let E=I(y);return T.delete("Content-Length"),new Response(E,{status:v.status,statusText:v.statusText,headers:T})}if(B&&(y.match(/https?:\/\/[^\s"'`<>{}|\\^[\]#,;)]+/g)||[]).some(w=>{try{let S=new URL(w).origin;return S!==ut&&S!==u}catch{return!1}})){let w=I(y);return T.delete("Content-Length"),new Response(w,{status:v.status,statusText:v.statusText,headers:T})}return T.delete("Content-Length"),new Response(y,{status:v.status,statusText:v.statusText,headers:T})}catch(y){console.log("\u54CD\u5E94\u4F53\u91CD\u5199\u5F02\u5E38:",y.message)}return(/\.(jpg|jpeg|gif|png|svg|ico|webp|js|css|woff2?|ttf|otf|map|webmanifest|srt|ass|vtt|sub)$/i.test(o.pathname)||/(\/Images\/|\/Icons\/|\/Branding\/|\/emby\/covers\/)/i.test(o.pathname))&&i?(T.set("Cache-Control","public, max-age=86400"),T.delete("Expires"),T.delete("Pragma"),X&&la(e,X,v,s)):T.set("Cache-Control","no-store"),new Response(v.body,{status:v.status,statusText:v.statusText,headers:T})}function jo(t,e){return e==="POST"&&/^\/(?:emby\/)?Sessions\/Playing/i.test(t)?!0:e!=="GET"?!1:!!(/^\/(?:emby\/)?(?:Videos|Audio)\/[^/]+\/stream/i.test(t)||/^\/(?:emby\/)?Items\/[^/]+\/PlaybackInfo/i.test(t)||/^\/(?:emby\/)?Videos\/[^/]+\/(?:master|main|live|playlist)\.m3u8/i.test(t)||/^\/(?:emby\/)?Videos\/[^/]+\/hls\d*\//i.test(t)||/^\/(?:emby\/)?Videos\/[^/]+\/.+\.(?:m3u8|ts|m4s|mp4)$/i.test(t)||/^\/(?:emby\/)?(?:Videos|Audio)\/[^/]+\/(?:Subtitles|original)/i.test(t)||/^\/(?:emby\/)?Items\/[^/]+\/Download/i.test(t)||/^\/(?:emby\/)?Sync\//i.test(t))}function $o(t,e){return e==="POST"&&/^\/(?:emby\/)?Sessions\/Playing/i.test(t)?!0:e!=="GET"?!1:!!(/^\/(?:emby\/)?(?:Videos|Audio)\/[^/]+\/stream/i.test(t)||/^\/(?:emby\/)?Videos\/[^/]+\/(?:master|main|live|playlist)\.m3u8/i.test(t)||/^\/(?:emby\/)?Videos\/[^/]+\/hls\d*\//i.test(t)||/^\/(?:emby\/)?Videos\/[^/]+\/.+\.(?:ts|m4s|mp4)$/i.test(t))}var ha=`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>\u63A7\u5236\u53F0\u767B\u5F55</title>
    <link rel="stylesheet" href="${te}">
    <style>
        /* === Forge \xB7 Split-Screen Login ============================= */
        *, *::before, *::after { box-sizing: border-box; }
        body.login-body {
            display: flex; margin: 0; padding: 0;
            min-height: 100vh; min-height: 100dvh;
            background: var(--bg); overflow: hidden;
        }

        /* \u2500\u2500 Brand panel (left 42%) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
        .forge-brand {
            flex: 0 0 42%;
            position: relative;
            background: var(--sidebar-bg, oklch(15% 0.02 75));
            overflow: hidden;
            display: flex; align-items: flex-end;
            padding: 56px 52px;
            animation: brand-slide 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes brand-slide {
            from { transform: translateX(-100%); }
            to   { transform: translateX(0); }
        }

        /* Hairline divider */
        .forge-brand::after {
            content: ''; position: absolute;
            top: 0; right: 0; bottom: 0; width: 1px;
            background: color-mix(in oklch, var(--primary) 22%, transparent);
            z-index: 10;
        }

        /* Subtle grid pattern */
        .forge-brand::before {
            content: ''; position: absolute; inset: 0;
            background-image:
                linear-gradient(color-mix(in oklch, var(--primary) 5%, transparent) 1px, transparent 1px),
                linear-gradient(90deg, color-mix(in oklch, var(--primary) 5%, transparent) 1px, transparent 1px);
            background-size: 40px 40px;
            z-index: 0;
        }

        /* Noise texture overlay */
        .forge-noise {
            position: absolute; inset: 0; z-index: 1; pointer-events: none;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
            background-repeat: repeat; background-size: 200px 200px;
            opacity: 0.5;
        }

        /* Golden sweep line */
        .forge-sweep {
            position: absolute; z-index: 2; pointer-events: none;
            top: 50%; left: 0;
            width: 120px; height: 2px;
            background: linear-gradient(90deg, transparent, var(--primary), transparent);
            filter: blur(1px);
            transform-origin: left center;
            animation: forge-sweep 8s linear infinite;
        }
        @keyframes forge-sweep {
            0%   { transform: translateX(-200%) translateY(-50%) rotate(-35deg); }
            100% { transform: translateX(400%) translateY(-50%) rotate(-35deg); }
        }

        /* Brand wordmark */
        .forge-wordmark {
            position: relative; z-index: 3;
        }
        .forge-wordmark .wordmark-text {
            display: block;
            font-size: 96px; font-weight: 700;
            letter-spacing: 0.15em;
            color: var(--primary);
            line-height: 1;
            text-shadow: 0 0 60px color-mix(in oklch, var(--primary) 40%, transparent);
        }
        .forge-wordmark .wordmark-sub {
            display: block; margin-top: 12px;
            font-family: var(--font-mono); font-size: 11px;
            letter-spacing: 0.2em; text-transform: uppercase;
            color: color-mix(in oklch, var(--text-sec) 60%, transparent);
        }

        /* \u2500\u2500 Form panel (right 58%) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
        .forge-form-panel {
            flex: 1;
            display: flex; flex-direction: column;
            justify-content: center;
            padding: 56px 64px;
            background: var(--bg);
            animation: form-enter 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
        }
        @keyframes form-enter {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
        }

        .forge-inner {
            max-width: 340px;
        }

        .forge-title {
            margin: 0 0 6px;
            font-size: 24px; font-weight: 600;
            color: var(--text); letter-spacing: -0.01em;
        }
        .forge-sub {
            margin: 0 0 36px;
            font-size: var(--text-sm); color: var(--text-sec);
            line-height: 1.5;
        }

        /* Form */
        .forge-fields { display: flex; flex-direction: column; gap: var(--space-3); }

        .input-group {
            position: relative; display: flex; align-items: center;
        }
        .input-icon {
            position: absolute; left: var(--space-4); width: 18px; height: 18px;
            stroke: var(--text-sec); pointer-events: none;
            transition: stroke 0.25s ease;
        }
        .input-group:focus-within .input-icon { stroke: var(--primary); }

        .forge-fields input[type=password] {
            width: 100%; padding: 15px 16px 15px 48px;
            border: 1px solid var(--border); border-radius: var(--radius-lg);
            background: var(--surface); color: var(--text);
            font-family: var(--font-mono); font-size: var(--text-xl); letter-spacing: 0.08em;
            transition: border-color 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
        }
        .forge-fields input::placeholder {
            color: var(--text-sec); opacity: 0.5;
            letter-spacing: 0; font-family: var(--font-sans); font-size: var(--text-base);
        }
        .forge-fields input:focus {
            outline: none; border-color: var(--primary); background: var(--card);
            box-shadow: 0 0 0 3px var(--primary-ring), 0 0 20px var(--primary-glow);
        }

        .forge-btn {
            display: flex; align-items: center; justify-content: center; gap: var(--space-2);
            width: 100%; padding: 15px; min-height: var(--touch-min);
            background: linear-gradient(135deg, var(--btn-fill) 0%, color-mix(in oklch, var(--btn-fill) 85%, oklch(80% 0.12 55)) 100%);
            color: var(--on-primary); border: none; border-radius: 6px;
            cursor: pointer; font-weight: 650;
            font-size: var(--text-lg); font-family: var(--font-sans);
            transition: filter 0.2s ease, transform 0.15s ease, box-shadow 0.25s ease;
        }
        .forge-btn svg { width: 18px; height: 18px; transition: transform 0.2s ease; }
        .forge-btn:hover {
            filter: brightness(1.1);
            box-shadow: 0 6px 24px var(--primary-glow);
        }
        .forge-btn:hover svg { transform: translateX(3px); }
        .forge-btn:active { transform: scale(0.97); }
        .forge-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--primary-ring); }

        /* Footer */
        .forge-footer {
            display: flex; align-items: center; gap: var(--space-2);
            margin-top: 32px;
            font-family: var(--font-mono); font-size: var(--text-xs);
            color: var(--text-sec); opacity: 0.55;
            font-variant-numeric: tabular-nums;
        }
        .live-dot {
            width: 6px; height: 6px; border-radius: 50%;
            background: var(--ok); box-shadow: 0 0 6px var(--ok);
            animation: nx-breathe 3s ease-in-out infinite;
            flex-shrink: 0;
        }
        @keyframes nx-breathe {
            0%, 100% { transform: scale(1); opacity: 1; }
            50%       { transform: scale(1.5); opacity: 0.6; }
        }

        /* \u2500\u2500 Mobile (\u2264768px): brand becomes top strip \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
        @media (max-width: 768px) {
            body.login-body { flex-direction: column; overflow-y: auto; }

            .forge-brand {
                flex: 0 0 25vh; min-height: 160px;
                align-items: flex-end; padding: 24px 28px;
            }
            .forge-brand::after {
                top: auto; right: 0; bottom: 0; left: 0;
                width: auto; height: 1px;
            }
            .forge-wordmark .wordmark-text { font-size: 56px; }
            .forge-wordmark .wordmark-sub  { font-size: 10px; margin-top: 6px; }

            .forge-form-panel {
                flex: 1; padding: 36px 28px;
                justify-content: flex-start;
            }
            .forge-inner { max-width: 100%; }
        }

        /* \u2500\u2500 Reduced motion \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
        @media (prefers-reduced-motion: reduce) {
            .forge-brand    { animation: none; }
            .forge-form-panel { animation: none; opacity: 1; }
            .forge-sweep    { animation: none; display: none; }
            .live-dot       { animation: none; }
        }
    </style>
</head>
<body class="login-body">
    <script>/* dark-first: resolve saved/system theme before paint to match the console */
    (function(){try{var legacy=localStorage.getItem('emby_proxy_dark');if(legacy!==null&&!localStorage.getItem('emby_theme')){localStorage.setItem('emby_theme',legacy==='1'?'dark':'light');}var p=localStorage.getItem('emby_theme')||'auto';var d=p==='dark'||(p==='auto'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.body.classList.add('dark');}catch(e){}})();<\/script>
    <div id="toast"></div>

    <!-- Brand panel -->
    <aside class="forge-brand" aria-hidden="true">
        <div class="forge-noise"></div>
        <div class="forge-sweep"></div>
        <div class="forge-wordmark">
            <span class="wordmark-text">EMBY</span>
            <span class="wordmark-sub">\u53CD\u5411\u4EE3\u7406\u63A7\u5236\u53F0</span>
        </div>
    </aside>

    <!-- Form panel -->
    <main class="forge-form-panel">
        <div class="forge-inner">
            <h1 class="forge-title">\u8EAB\u4EFD\u9A8C\u8BC1</h1>
            <p class="forge-sub">\u8F93\u5165\u7BA1\u7406\u5458\u5BC6\u94A5\u4EE5\u9A8C\u8BC1\u8EAB\u4EFD</p>

            <form class="forge-fields" onsubmit="event.preventDefault(); login();">
                <div class="input-group">
                    <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>
                    <input type="password" id="tokenInput" autocomplete="current-password" placeholder="\u5BC6\u94A5" aria-label="\u7BA1\u7406\u5458\u5BC6\u94A5">
                </div>
                <button type="submit" class="forge-btn">
                    <span>\u8FDB\u5165</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </button>
            </form>

            <div class="forge-footer">
                <span class="live-dot" aria-hidden="true"></span>
                <span>TLS \xB7 v${It}</span>
                <span id="clock">--:--</span>
            </div>
        </div>
    </main>

    <script>
        function showToast(msg) {
            const t = document.getElementById('toast');
            t.textContent = msg; t.classList.add('show');
            setTimeout(() => t.classList.remove('show'), 2000);
        }
        function login() {
            const token = document.getElementById('tokenInput').value.trim();
            if(!token) return showToast('\u8BF7\u8F93\u5165\u7BA1\u7406\u5458\u5BC6\u94A5');
            document.cookie = 'admin_token=' + encodeURIComponent(token) + '; path=/; max-age=2592000;';
            window.location.reload();
        }
        (function clock(){
            const el = document.getElementById('clock');
            const tick = () => { const d = new Date();
                el.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()]
                    .map(n => String(n).padStart(2,'0')).join(':'); };
            tick(); setInterval(tick, 1000);
        })();
    <\/script>
</body>
</html>
`;var zo=12,Go=100,Wo=36e5;function Ko(t,e,s){return ae(t,e,s,{table:"auth_rl",minuteLimit:zo,hourlyLimit:Go,banMs:Wo,reason:"auth-bruteforce"})}async function ya(t,e,s){let o=e.ADMIN_TOKEN;if(!o)return new Response("\u8BF7\u5728 Worker \u53D8\u91CF\u4E2D\u914D\u7F6E ADMIN_TOKEN",{status:500});function a(n,c){let l=n.headers.get("Cookie");if(!l)return null;let d=l.match(new RegExp("(^| )"+c+"=([^;]+)"));return d?decodeURIComponent(d[2]):null}let r=s.pathname==="/"||s.pathname.startsWith("/api/"),i=s.pathname==="/api/tg-webhook"&&t.method==="POST";if(r&&!i&&a(t,"admin_token")!==o){if(e.DB)try{let c=t.headers.get("cf-connecting-ip")||t.headers.get("x-real-ip")||"unknown",l=await Ko(e,c,Date.now());if(l)return l}catch{}return s.pathname==="/"?new Response(ha,{headers:{"Content-Type":"text/html;charset=UTF-8"}}):new Response("Unauthorized",{status:401})}return null}function bt(t,e=200,s={}){return new Response(JSON.stringify(t),{status:e,headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*",...s}})}function ba(){let t=[];return t.push("\u{1F4D6} <b>\u547D\u4EE4\u5E2E\u52A9</b>"),t.push(""),t.push("\u2501\u2501\u2501 \u{1F4CA} <b>\u72B6\u6001\u76D1\u63A7</b> \u2501\u2501\u2501"),t.push("<code>/status</code> \u2014 \u8282\u70B9\u5728\u7EBF\u72B6\u6001\u901F\u89C8"),t.push("<code>/stats</code> \u2014 \u4ECA\u65E5\u64AD\u653E\u4E0E\u6D41\u91CF\u7EDF\u8BA1"),t.push("<code>/keepalive</code> \u2014 \u4FDD\u53F7\u5269\u4F59\u65F6\u95F4\u5217\u8868"),t.push(""),t.push("\u2501\u2501\u2501 \u{1F50D} <b>\u8282\u70B9</b> \u2501\u2501\u2501"),t.push("<code>/node &lt;\u540D\u79F0&gt;</code> \u2014 \u67E5\u8BE2\u8282\u70B9\u8BE6\u60C5"),t.push("  <i>\u4F8B\uFF1A</i><code>/node emby1</code>"),t.push("<code>/list</code> \u2014 \u6240\u6709\u8282\u70B9\u5217\u8868"),t.push(""),t.push("\u2501\u2501\u2501 \u{1F514} <b>\u544A\u8B66\u914D\u7F6E</b> \u2501\u2501\u2501"),t.push("<code>/mute &lt;\u65F6\u957F&gt;</code> \u2014 \u9759\u97F3\u544A\u8B66"),t.push("  <i>\u4F8B\uFF1A</i><code>/mute 30m</code>\u3000<code>/mute 2h</code>\u3000<code>/mute 1d</code>"),t.push("<code>/unmute</code> \u2014 \u6062\u590D\u544A\u8B66\u63A8\u9001"),t.push(""),t.push("\u2501\u2501\u2501 \u{1F4D6} <b>\u5E2E\u52A9</b> \u2501\u2501\u2501"),t.push("<code>/help</code> \u2014 \u663E\u793A\u6B64\u5E2E\u52A9"),t.push("<code>/start</code> \u2014 \u6B22\u8FCE\u9875"),t.join(`
`)}function _a(){let t=[];return t.push("\u{1F44B} <b>\u6B22\u8FCE\u4F7F\u7528 Emby \u8282\u70B9\u76D1\u63A7\u673A\u5668\u4EBA\uFF01</b>"),t.push(""),t.push("\u6211\u53EF\u4EE5\u5E2E\u4F60\u5B9E\u65F6\u76D1\u63A7\u8282\u70B9\u72B6\u6001\u3001\u67E5\u770B\u64AD\u653E\u7EDF\u8BA1\u3001\u7BA1\u7406\u4FDD\u53F7\u63D0\u9192\u548C\u544A\u8B66\u901A\u77E5\u3002"),t.push(""),t.push("\u8F93\u5165 <code>/help</code> \u67E5\u770B\u6240\u6709\u53EF\u7528\u547D\u4EE4\uFF0C"),t.push("\u6216\u70B9\u51FB\u5E95\u90E8\u83DC\u5355\u5FEB\u901F\u64CD\u4F5C\u3002"),t.join(`
`)}function Ea(t,e){if(!t||t.trim()==="")return[];let s=t.toLowerCase().trim(),o=[[],[],[],[],[]];for(let r of e){let i=(r.prefix||"").toLowerCase(),n=(r.public_alias||"").toLowerCase(),c=(r.remark||"").toLowerCase();i===s?o[0].push(r):i.startsWith(s)?o[1].push(r):n&&n.startsWith(s)||c&&c.startsWith(s)?o[2].push(r):i.includes(s)?o[3].push(r):(n&&n.includes(s)||c&&c.includes(s))&&o[4].push(r)}let a=[];for(let r of o){for(let i of r){if(a.length>=8)break;a.push(i)}if(a.length>=8)break}return a}function kt(t){return`${pt(t*1e3)} (UTC+8)`}var oe="\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501";async function re(t){let{results:e}=await R(t,`
        SELECT ${Rs("r",De)},
               s.alert_kind  AS alert_kind,
               s.first_fail_at AS first_fail_at
          FROM routes r
          LEFT JOIN emby_probe_state s ON s.prefix = r.prefix
    `),s=e||[],o=s.length,a=s.filter(c=>c.alert_kind==="offline"),r=o-a.length,i=Math.floor(Date.now()/1e3),n=[];if(n.push("\u{1F4CA} <b>\u8282\u70B9\u5728\u7EBF\u72B6\u6001</b>"),n.push(oe),n.push(`\u2705 <b>${r}/${o}</b> \u8282\u70B9\u5728\u7EBF`),a.length){n.push(""),n.push("\u{1F534} <b>\u79BB\u7EBF\u8282\u70B9</b>\uFF1A"),a.sort((c,l)=>(c.first_fail_at|0)-(l.first_fail_at|0));for(let c of a){let l=c.first_fail_at>0?i-(c.first_fail_at|0):0;n.push(`\u2022 ${O(J(c))} \u2014 \u5DF2\u79BB\u7EBF ${rt(l)}`)}}return n.push(""),n.push(`\u{1F552} ${kt(i)}`),{text:n.join(`
`),reply_markup:gt()}}async function ne(t){let{results:e}=await R(t,`
        SELECT ${Wt}
          FROM routes
         WHERE keepalive_days > 0
    `),s=e||[];if(!s.length)return{text:"\u6682\u65E0\u5F00\u542F\u4FDD\u53F7\u63D0\u9192\u7684\u8282\u70B9",reply_markup:Ae()};let o=Math.floor(Date.now()/1e3),a=s.map(i=>{let n=(i.keepalive_days|0)*86400,c=i.keepalive_last_played_at|0,l=c>0?c+n-o:n;return{r:i,remaining:l,hasBaseline:c>0}});a.sort((i,n)=>i.remaining-n.remaining);let r=[];r.push(`\u23F0 <b>\u4FDD\u53F7\u63D0\u9192\u72B6\u6001</b>\uFF08${a.length} \u4E2A\u8282\u70B9\uFF09`),r.push(oe);for(let{r:i,remaining:n,hasBaseline:c}of a){let l=O(J(i));if(!c)r.push(`\u2022 ${l} \u2014 \u672A\u64AD\u653E\uFF08\u7A97\u53E3 ${i.keepalive_days} \u5929\uFF09`);else if(n<=0){let d=Math.ceil(Math.abs(n)/86400);r.push(`\u2022 ${l} \u2014 \u26A0\uFE0F \u5DF2\u8D85\u671F ${d} \u5929`)}else r.push(`\u2022 ${l} \u2014 \u5269\u4F59 ${rt(n)}`)}return r.push(""),r.push(`\u{1F552} ${kt(o)}`),{text:r.join(`
`),reply_markup:Ae()}}async function ie(t,e){let s=await x(t,`SELECT ${xs}
           FROM routes WHERE prefix = ?`,e);if(!s){let{results:I}=await R(t,`
            SELECT ${Me} FROM routes LIMIT 200
        `),U=Ea(e,I||[]);if(!U.length)return{text:`\u26A0\uFE0F <b>\u672A\u627E\u5230\u8282\u70B9</b> <code>${O(e)}</code>

\u8F93\u5165 /list \u67E5\u770B\u5168\u90E8\u8282\u70B9\uFF0C\u6216 /node &lt;prefix&gt; \u7CBE\u786E\u67E5\u8BE2`,reply_markup:null};let W=[`\u26A0\uFE0F <b>\u672A\u627E\u5230\u8282\u70B9</b> <code>${O(e)}</code>`,"","\u{1F50D} \u4F60\u662F\u4E0D\u662F\u60F3\u627E\uFF1A"];for(let z of U){let f=O(J(z)),B=O(z.prefix);W.push(`\u2022 <code>${B}</code> \u2014 ${f}`)}let q=U.map(z=>({prefix:z.prefix,label:J(z)}));return{text:W.join(`
`),reply_markup:_s(q)}}let o=Math.floor(Date.now()/1e3),a=o-86400,[r,i,n,c]=await Promise.all([x(t,"SELECT alert_kind, first_fail_at FROM emby_probe_state WHERE prefix = ?",s.prefix),R(t,`SELECT ok_count, fail_count, p95_ms FROM emby_probe_hourly
              WHERE prefix = ? AND hour_ts >= ?`,s.prefix,a),x(t,`SELECT ${V.join(", ")} FROM emby_media_counts_live WHERE prefix = ?`,s.prefix),x(t,`SELECT timestamp, country FROM visitor_logs
              WHERE prefix = ? ORDER BY timestamp DESC LIMIT 1`,s.prefix)]),l=O(J(s)),d=r&&r.alert_kind==="offline",u;d?u=`\u{1F534} \u79BB\u7EBF \u5DF2 ${r.first_fail_at>0?rt(o-(r.first_fail_at|0)):"?"}`:u="\u2705 \u5728\u7EBF";let p=i&&i.results||[],m,b;if(!p.length)m="\u6682\u65E0\u63A2\u6D4B",b="\u6682\u65E0\u63A2\u6D4B";else{let I=p.reduce((z,f)=>z+(f.ok_count|0),0),U=p.reduce((z,f)=>z+(f.fail_count|0),0),W=I+U,q=p.reduce((z,f)=>Math.max(z,f.p95_ms|0),0);m=q>0?`${q.toLocaleString("en-US")}ms`:"0ms",b=W>0?`${(I/W*100).toFixed(1)}%`:"\u6682\u65E0\u63A2\u6D4B"}let{movies:h,series:A,episodes:D,artists:k,albums:g,songs:L,music_videos:X,box_sets:v,books:Z}=$t(n)||Object.fromEntries(V.map(I=>[I,0])),Y=I=>I.toLocaleString("en-US"),$=[];if(L>0||g>0||k>0){let I=[];k>0&&I.push(`\u{1F3A4} ${Y(k)} \u827A\u672F\u5BB6`),g>0&&I.push(`\u{1F4BF} ${Y(g)} \u4E13\u8F91`),L>0&&I.push(`\u{1F3B5} ${Y(L)} \u5355\u66F2`),$.push(`\u97F3\u4E50: ${I.join(" / ")}`)}let tt=[];X>0&&tt.push(`\u{1F39E}\uFE0F ${Y(X)} MV`),v>0&&tt.push(`\u{1F4E6} ${Y(v)} \u5408\u96C6`),Z>0&&tt.push(`\u{1F4DA} ${Y(Z)} \u6709\u58F0\u4E66`),tt.length&&$.push(tt.join("  \uFF5C  "));let Q,T=s.keepalive_days|0;if(T<=0)Q="\u672A\u5F00\u542F";else{let I=s.keepalive_last_played_at|0;if(!I)Q=`\u672A\u64AD\u653E\uFF08\u7A97\u53E3 ${T}d\uFF09`;else{let U=I+T*86400-o;U<=0?Q=`\u26A0\uFE0F \u5DF2\u8D85\u671F ${Math.ceil(Math.abs(U)/86400)} \u5929`:Q=`\u5269\u4F59 ${rt(U)}`}}let G;if(s.last_play&&s.last_play.trim())G=O(s.last_play.trim());else if(c&&c.timestamp){let I=c.country?` \u6765\u81EA \u{1F30D} ${O(c.country)}`:"",U=Date.parse(String(c.timestamp).replace(" ","T")+"Z");G=`${Number.isFinite(U)?kt(Math.floor(U/1e3)):O(String(c.timestamp))}${I}`}else G="\u6682\u65E0\u8BB0\u5F55";return{text:[`\u{1F680} <b>${l}</b> (<code>${O(s.prefix)}</code>)`,oe,`\u72B6\u6001: ${u}`,`\u5CF0\u503C\u5EF6\u8FDF(24h): ${m}  \uFF5C  24h \u6210\u529F\u7387: ${b}`,`\u5A92\u4F53: \u{1F3AC} ${h.toLocaleString("en-US")} \u90E8  \u{1F4FA} ${A.toLocaleString("en-US")} \u5267 / ${D.toLocaleString("en-US")} \u96C6`,...$,`\u4FDD\u53F7\u63D0\u9192: ${Q}`,`\u6700\u8FD1\u64AD\u653E: ${G}`,"",`\u{1F552} ${kt(o)}`].join(`
`),reply_markup:fs(s.prefix)}}async function ce(t){let{results:e}=await R(t,`
        SELECT ${Me}
          FROM routes
         ORDER BY prefix ASC
    `),s=e||[],o=[];if(o.push(`\u{1F4CB} <b>\u8282\u70B9\u5217\u8868</b>\uFF08\u5171 ${s.length} \u4E2A\uFF09`),o.push(oe),!s.length)o.push("\u6682\u65E0\u8282\u70B9");else for(let a of s){let r=O(a.public_alias||a.remark||""),i=O(a.prefix);o.push(r?`<code>${i}</code> \u2014 ${r}`:`<code>${i}</code>`)}return o.push(""),o.push(`\u{1F552} ${kt(Math.floor(Date.now()/1e3))}`),{text:o.join(`
`),reply_markup:gt()}}function ga(t){return{text:`\u26A0\uFE0F <b>\u672A\u77E5\u547D\u4EE4</b> <code>${O(t)}</code>
\u8F93\u5165 /help \u67E5\u770B\u53EF\u7528\u547D\u4EE4`,reply_markup:null}}function wa(){return{text:`\u7528\u6CD5: <code>/mute &lt;\u65F6\u957F&gt;</code>
\u4F8B\u5982: <code>/mute 30</code> (30\u5206\u949F), <code>/mute 2h</code>, <code>/mute 1d</code>
\u4E0A\u9650 24h`,reply_markup:bs()}}function le(t){return{text:`\u{1F507} \u5DF2\u9759\u97F3\u81F3 ${kt(t)}`,reply_markup:null}}function de(){return{text:"\u{1F514} \u5DF2\u6062\u590D\u544A\u8B66",reply_markup:null}}function Yo(t){let e=String(t||"").trim();if(!e)return null;let s=e.match(/^(\d+)\s*([mhd]?)$/i);if(!s)return null;let o=parseInt(s[1],10);if(!Number.isFinite(o)||o<=0)return null;let a=(s[2]||"m").toLowerCase(),r;if(a==="m")r=o;else if(a==="h")r=o*60;else if(a==="d")r=o*1440;else return null;return r>1440&&(r=1440),r}async function Ta(t,e){if(!(!t.DB||!t.TG_BOT_TOKEN))try{let s=await re(t);await P(t,{chat_id:e,...s})}catch(s){console.log("handleStatus error:",s.message);try{await P(t,{chat_id:e,text:"\u67E5\u8BE2\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5"})}catch{}}}async function xa(t,e){if(!(!t.DB||!t.TG_BOT_TOKEN))try{let s=await ne(t);await P(t,{chat_id:e,...s})}catch(s){console.log("handleKeepalive error:",s.message);try{await P(t,{chat_id:e,text:"\u67E5\u8BE2\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5"})}catch{}}}async function Ra(t,e,s){if(!t.DB||!t.TG_BOT_TOKEN)return;let o=String(s||"").trim();if(!o){await P(t,{chat_id:e,text:`\u7528\u6CD5: <code>/node &lt;prefix&gt;</code>
\u4F8B\u5982: <code>/node emby1</code>`});return}try{let a=await ie(t,o);await P(t,{chat_id:e,...a})}catch(a){console.log("handleNode error:",a.message);try{await P(t,{chat_id:e,text:"\u67E5\u8BE2\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5"})}catch{}}}async function ka(t,e){if(!(!t.DB||!t.TG_BOT_TOKEN))try{let s=await ce(t);await P(t,{chat_id:e,...s})}catch(s){console.log("handleList error:",s.message);try{await P(t,{chat_id:e,text:"\u67E5\u8BE2\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5"})}catch{}}}async function Sa(t,e,s){if(!(!t.DB||!t.TG_BOT_TOKEN))try{let o=Yo(s);if(o===null){let n=wa();await P(t,{chat_id:e,...n});return}let r=Math.floor(Date.now()/1e3)+o*60;await ot(t,at,r);let i=le(r);await P(t,{chat_id:e,...i})}catch(o){console.log("handleMute error:",o.message)}}async function Aa(t,e){if(!(!t.DB||!t.TG_BOT_TOKEN))try{await Ft(t,at);let s=de();await P(t,{chat_id:e,...s})}catch(s){console.log("handleUnmute error:",s.message)}}async function va(t,e,s){if(t.TG_BOT_TOKEN)try{let o=ga(s);await P(t,{chat_id:e,...o})}catch(o){console.log("handleUnknownCommand error:",o.message)}}var Qi=Object.freeze({STATUS:"s",KEEPALIVE:"k",NODE:"n",LIST:"l",MUTE:"m"}),qi=Object.freeze({REFRESH:"r",VIEW:"v",UNMUTE:"u"}),tc=Object.freeze({STATUS_REFRESH:"s:r",KEEPALIVE_REFRESH:"k:r",NODE_VIEW:"n:v",NODE_REFRESH:"n:r",LIST:"l:r",MUTE_30M:"m:30",MUTE_2H:"m:120",MUTE_1D:"m:1440",UNMUTE:"m:u"}),Xo=":";function Ca(t){if(typeof t!="string"||!t.trim())return null;let e=t.split(Xo);if(e.length<2)return null;let[s,o,...a]=e;return!s||!o?null:{module:s,action:o,params:a}}var Vo=/^[a-zA-Z0-9_-]+$/,Jo=new Set(["30","120","1440"]);function Da(t){if(!t||typeof t!="object")return!1;let{module:e,action:s,params:o}=t;switch(e){case"s":return s==="r"&&o.length===0;case"k":return s==="r"&&o.length===0;case"l":return s==="r"&&o.length===0;case"n":{if(s!=="r"&&s!=="v"||o.length!==1)return!1;let a=o[0];return typeof a=="string"&&Vo.test(a)}case"m":return s==="u"||Jo.has(s)?o.length===0:!1;default:return!1}}async function Ma(t,e,s){let{id:o,data:a,message:r,from:i}=s,n=r?.chat?.id;if(!n||n!==Number(t.TG_CHAT_ID)){console.warn("[callback-router] reject: chat_id mismatch",{got:n,expected:t.TG_CHAT_ID,from:i?.id});return}let c=r.message_id;e.waitUntil(ms(t,{callback_query_id:o,text:"\u5904\u7406\u4E2D\u2026"}));let l=Ca(a);if(!l||!Da(l))return;let{module:d,action:u,params:p}=l;try{let m;if(d==="s"&&u==="r")m=await re(t);else if(d==="k"&&u==="r")m=await ne(t);else if(d==="n"&&(u==="r"||u==="v")){let b=p[0];m=await ie(t,b)}else if(d==="l"&&u==="r")m=await ce(t);else if(d==="m"&&u==="u")await Ft(t,at),m=de();else if(d==="m"){let b=Number(u),h=Math.floor(Date.now()/1e3)+b*60;await ot(t,at,h),m=le(h)}else return;await ps(t,{chat_id:n,message_id:c,text:m.text,parse_mode:"HTML",...m.reply_markup!==void 0&&m.reply_markup!==null?{reply_markup:m.reply_markup}:{}})}catch(m){if(typeof m?.message=="string"&&m.message.includes("message is not modified"))return;console.log("[callback-router] error",d,u,p,m?.message??m)}}async function Oa(t,e,s,o,a={}){if(o.pathname==="/api/placement"&&t.method==="POST")try{let i=(await t.json()).placement;if(!e.CF_API_TOKEN||!e.CF_ACCOUNT_ID||!e.CF_WORKER_NAME)return bt({success:!1,msg:"\u540E\u53F0\u53D8\u91CF\u672A\u914D\u7F6E\u5168\uFF01\u8BF7\u68C0\u67E5 CF_API_TOKEN, CF_ACCOUNT_ID, CF_WORKER_NAME"});let n=a.cfApi||dt(e),c=new FormData;c.append("settings",new Blob([JSON.stringify({placement:i})],{type:"application/json"}));let l=await n.rest(`/accounts/${e.CF_ACCOUNT_ID}/workers/scripts/${e.CF_WORKER_NAME}/settings`,{method:"PATCH",body:c,isForm:!0});return l.ok?bt({success:!0,msg:"\u90E8\u7F72\u533A\u57DF\u4FEE\u6539\u6210\u529F\uFF01"}):bt({success:!1,msg:"CF\u62A5\u9519: "+(l.errors&&l.errors[0]?.message||l.error||"\u672A\u77E5\u9519\u8BEF")})}catch(r){return bt({success:!1,msg:r.message})}if(o.pathname==="/api/trace"){let r=t.cf||{},i="\u63A2\u6D4B\u4E2D...";try{let l=(await(await fetch("https://1.1.1.1/cdn-cgi/trace",{headers:{"User-Agent":"Mozilla/5.0 (CF-Worker-Trace)"}})).text()).match(/colo=([A-Z]+)/);l&&(i=l[1])}catch{i="\u83B7\u53D6\u5931\u8D25"}return bt({success:!0,entryCountry:r.country||"\u672A\u77E5",entryCity:r.city||"",entryColo:r.colo||"\u672A\u77E5",egressColo:i})}if(o.pathname==="/api/edge-info"){let r=t.cf||{},i="\u63A2\u6D4B\u4E2D...";try{let p=(await(await fetch("https://1.1.1.1/cdn-cgi/trace",{headers:{"User-Agent":"Mozilla/5.0 (CF-Worker-Trace)"}})).text()).match(/colo=([A-Z]+)/);p&&(i=p[1])}catch{i="\u83B7\u53D6\u5931\u8D25"}let n=r.colo||"\u672A\u77E5",c=Math.floor(Date.now()/3e5),l="";try{let d=new TextEncoder().encode(`${n}:${i}:${c}`),u=await crypto.subtle.digest("SHA-1",d);l=Array.from(new Uint8Array(u)).slice(0,8).map(p=>p.toString(16).padStart(2,"0")).join("")}catch{l=""}return bt({success:!0,entryCountry:r.country||"\u672A\u77E5",entryCity:r.city||"",entryColo:n,egressColo:i,cacheKey:l})}if(o.pathname==="/__client_rtt__")return new Response(null,{status:204,headers:{"Cache-Control":"no-store, no-cache, must-revalidate, max-age=0",Pragma:"no-cache",Expires:"0","Access-Control-Allow-Origin":"*"}});if(o.pathname==="/api/tg-webhook"&&t.method==="POST")try{if(!e.TG_WEBHOOK_SECRET)return new Response("Webhook secret not configured",{status:500});if(t.headers.get("x-telegram-bot-api-secret-token")!==e.TG_WEBHOOK_SECRET)return new Response("Unauthorized",{status:401});let r=Number(e.TG_CHAT_ID);if(!e.TG_CHAT_ID||!Number.isFinite(r))return new Response("Chat ID not configured",{status:500});let i=await t.json();if((i?.message?.chat?.id??i?.edited_message?.chat?.id??i?.channel_post?.chat?.id??i?.edited_channel_post?.chat?.id??i?.callback_query?.message?.chat?.id)!==r)return new Response("OK");if(i.callback_query)return s.waitUntil(Ma(e,s,i.callback_query)),new Response("OK");if(i.message&&typeof i.message.text=="string"){let c=i.message.text.trim(),l=c.indexOf(" "),d=l===-1?c:c.slice(0,l),u=l===-1?"":c.slice(l+1).trim(),p=d.split("@")[0];p==="/start"?e.TG_BOT_TOKEN&&s.waitUntil(P(e,{chat_id:r,text:_a(),parse_mode:"HTML"})):p==="/help"?e.TG_BOT_TOKEN&&s.waitUntil(P(e,{chat_id:r,text:ba(),parse_mode:"HTML"})):p==="/stats"?e.DB&&e.TG_BOT_TOKEN&&s.waitUntil(Nt(e,r)):p==="/status"?s.waitUntil(Ta(e,r)):p==="/keepalive"?s.waitUntil(xa(e,r)):p==="/mute"?s.waitUntil(Sa(e,r,u)):p==="/unmute"?s.waitUntil(Aa(e,r)):p==="/node"?s.waitUntil(Ra(e,r,u)):p==="/list"?s.waitUntil(ka(e,r)):p.startsWith("/")&&s.waitUntil(va(e,r,c))}return new Response("OK")}catch{return new Response("OK")}return t.method==="OPTIONS"?new Response(null,{headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET, POST, PUT, DELETE, OPTIONS","Access-Control-Allow-Headers":"*","Access-Control-Max-Age":"86400"}}):null}async function La(t,e,s,o,a={}){let r=a.cfApi||dt(e);if(o.pathname==="/api/analytics"&&t.method==="GET"){if(!e.DB)return Response.json({success:!1,error:"\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93"});try{let[i,n,c]=await Promise.all([ft(e,"today"),ft(e,7),ft(e,30)]),l=_(e,"SELECT date(timestamp, '+8 hours') as date, COUNT(*) as count FROM visitor_logs WHERE timestamp >= datetime('now', '-7 days') GROUP BY date(timestamp, '+8 hours') ORDER BY date ASC"),d=_(e,"SELECT country, COUNT(*) as count FROM visitor_logs WHERE timestamp >= datetime('now', '-7 days') GROUP BY country ORDER BY count DESC"),u=_(e,"SELECT prefix, datetime(timestamp, '+8 hours') as timestamp, ip, country, ua FROM visitor_logs ORDER BY timestamp DESC LIMIT 20"),[p,m,b]=await N(e,[l,d,u]);return Response.json({success:!0,trend:p.results,locations:m.results,recents:b.results,trafficToday:i,traffic7d:n,traffic30d:c})}catch(i){return Response.json({success:!1,error:i.message})}}if(o.pathname==="/api/route-trends"&&t.method==="GET"){let i=Math.max(1,Math.min(7,parseInt(o.searchParams.get("days")||"7",10)||7));if(!e.CF_API_TOKEN||!e.CF_ZONE_ID)return Response.json({ok:!1,reason:"no-cf-token",days:i,items:[]});if(!e.DB)return Response.json({ok:!1,reason:"no-db",days:i,items:[]});try{let n=Math.floor(Date.now()/36e5),c=`${e.CF_ZONE_ID}|${i}|${n}`;globalThis.__routeTrendCache=globalThis.__routeTrendCache||new Map;let l=globalThis.__routeTrendCache.get(c),d=Date.now();if(l&&l.expireAt>d)return Response.json(l.payload);let{results:u}=await R(e,`SELECT ${Tt} FROM routes`);if(!u||u.length===0)return Response.json({ok:!1,reason:"no-routes",days:i,items:[]});let p=new Date;p.setUTCHours(0,0,0,0);let m=[];for(let k=i-1;k>=0;k--){let g=new Date(p.getTime()-k*864e5);m.push(g.toISOString().split("T")[0])}let b=new Date(p.getTime()-(i-1)*864e5).toISOString(),h=new Date(p.getTime()+864e5-1).toISOString(),A=await Promise.all(u.map(async k=>{let g=m.map(()=>0);try{let L=`query {
                          viewer {
                            zones(filter: {zoneTag: "${e.CF_ZONE_ID}"}) {
                              httpRequestsAdaptiveGroups(
                                limit: ${i},
                                filter: {
                                  clientRequestPath_like: "/${k.prefix}%",
                                  datetime_geq: "${b}",
                                  datetime_leq: "${h}"
                                },
                                orderBy: [date_ASC]
                              ) {
                                dimensions { date }
                                sum { edgeResponseBytes }
                              }
                            }
                          }
                        }`,X=await r.graphql(L);if(!X.ok)return{prefix:k.prefix,bytes:g};let v=X.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups||[],Z=new Map;for(let $ of v)Z.set($.dimensions?.date,$.sum?.edgeResponseBytes||0);let Y=m.map($=>Z.get($)||0);return{prefix:k.prefix,bytes:Y}}catch{return{prefix:k.prefix,bytes:g}}})),D={ok:!0,days:i,generated_at:Math.floor(d/1e3),source:"cf-graphql",items:A};return globalThis.__routeTrendCache.set(c,{expireAt:d+1800*1e3,payload:D}),Response.json(D)}catch(n){return Response.json({ok:!1,reason:"graphql-failed",error:n.message,days:i,items:[]})}}if(o.pathname==="/api/deploy"&&t.method==="POST"){let i=e.CF_API_TOKEN,n=e.CF_ACCOUNT_ID,c=e.CF_WORKER_NAME;if(!i||!n||!c)return Response.json({success:!1,error:"\u7F3A\u5C11 CF_API_TOKEN, CF_ACCOUNT_ID \u6216 CF_WORKER_NAME \u73AF\u5883\u53D8\u91CF"});try{let l=await t.json();if(!l.newCode)return Response.json({success:!1,error:"\u4EE3\u7801\u5185\u5BB9\u4E3A\u7A7A\u3002"});let d=await r.rest(`/accounts/${n}/workers/services/${c}`),u="2024-01-01",p,m;if(d.ok&&d.result){let g=null;d.result.default_environment&&d.result.default_environment.script?g=d.result.default_environment.script:d.result.script&&(g=d.result.script),g&&(g.compatibility_date&&(u=g.compatibility_date),g.compatibility_flags&&(p=g.compatibility_flags),g.placement&&(m=g.placement))}let b=[];for(let g in e)typeof e[g]=="string"&&b.push({name:g,type:"plain_text",text:e[g]});let h=await r.rest(`/accounts/${n}/workers/scripts/${c}/bindings`);if(h.ok&&Array.isArray(h.result))for(let g of h.result)g.type!=="plain_text"&&g.type!=="secret_text"&&g.type!=="inherited"&&b.push(g);let A=new FormData,D={main_module:"worker.js",bindings:b,compatibility_date:u};p&&(D.compatibility_flags=p),m&&(D.placement=m),A.append("metadata",new Blob([JSON.stringify(D)],{type:"application/json"}),"metadata.json"),A.append("worker.js",new Blob([l.newCode],{type:"application/javascript+module"}),"worker.js");let k=await r.rest(`/accounts/${n}/workers/scripts/${c}`,{method:"PUT",body:A,isForm:!0,timeoutMs:3e4});if(k.ok)return Response.json({success:!0,msg:"\u4EE3\u7801\u66F4\u65B0\u6210\u529F\uFF0C\u5E76\u5DF2\u5B8C\u7F8E\u4FDD\u7559\u539F\u6709\u653E\u7F6E\u5730\u533A\u548C\u517C\u5BB9\u914D\u7F6E\uFF01"});throw new Error(k.errors?JSON.stringify(k.errors):k.error)}catch(l){return Response.json({success:!1,error:l.message})}}if(o.pathname==="/api/purge-cache"&&t.method==="POST"){let i=e.CF_ZONE_ID;if(!e.CF_API_TOKEN||!i)return Response.json({success:!1,error:"\u7F3A\u5C11 CF_API_TOKEN \u6216 CF_ZONE_ID \u53D8\u91CF"});try{let n=await r.rest(`/zones/${i}/purge_cache`,{method:"POST",body:{purge_everything:!0}});if(!n.ok)throw new Error(n.errors?JSON.stringify(n.errors):n.error);return Response.json({success:!0})}catch(n){return Response.json({success:!1,error:n.message})}}return null}async function Na(t,e,s,o){if(o.pathname==="/api/ping-node"){let a=o.searchParams.get("url");if(!a)return Response.json({ms:-1});let r=Date.now();try{let i=new AbortController,n=setTimeout(()=>i.abort(),2e3);return await fetch(a+"/",{method:"HEAD",signal:i.signal}),clearTimeout(n),Response.json({ms:Date.now()-r})}catch{return Response.json({ms:-1})}}if(o.pathname==="/api/_probe_now"){let a=o.searchParams.get("key")||"";if(!e.ADMIN_TOKEN||a!==e.ADMIN_TOKEN)return new Response("forbidden",{status:403});if(!e.DB)return new Response("no DB",{status:500});let r=Date.now();try{await M(e);let i=Math.floor(Date.now()/1e3),{results:n}=await R(e,"SELECT MAX(ts) AS t FROM emby_probes"),c=n&&n[0]&&n[0].t||0;if(c&&i-c<240)return Response.json({ok:!0,skipped:"fresh",age_s:i-c})}catch{}try{return await Yt(e),Response.json({ok:!0,ms:Date.now()-r})}catch(i){return Response.json({ok:!1,error:String(i&&i.message||i),ms:Date.now()-r},{status:500})}}if(o.pathname==="/api/_counts_now"){let a=o.searchParams.get("key")||"";if(!e.ADMIN_TOKEN||a!==e.ADMIN_TOKEN)return new Response("forbidden",{status:403});if(!e.DB)return new Response("no DB",{status:500});let r=Date.now();try{await M(e);let{results:i}=await R(e,`
                SELECT ${wt}
                  FROM routes WHERE monitor_enabled = 1
            `),n=Math.floor(Date.now()/1e3);return await Qt(e,i||[],n),Response.json({ok:!0,routes:(i||[]).length,ms:Date.now()-r})}catch(i){return Response.json({ok:!1,error:String(i&&i.message||i),ms:Date.now()-r},{status:500})}}if(o.pathname==="/api/tg-test"&&t.method==="POST"){if(!e.TG_BOT_TOKEN||!e.TG_CHAT_ID)return Response.json({ok:!1,error:"TG_BOT_TOKEN or TG_CHAT_ID not configured"},{status:400});try{let a=await mt(e,"tg-test");return Response.json({ok:!!(a&&a.ok)})}catch(a){return Response.json({ok:!1,error:String(a&&a.message||a)},{status:500})}}if(o.pathname==="/api/speedtest-down"){let a=Math.min(parseInt(o.searchParams.get("bytes")||"5242880",10)||5242880,52428800),r=65536,i=new Uint8Array(r),n=0,c=new ReadableStream({pull(l){if(n>=a){l.close();return}let d=a-n;d<r?(l.enqueue(i.subarray(0,d)),n+=d):(l.enqueue(i),n+=r)}});return new Response(c,{headers:{"Content-Type":"application/octet-stream","Content-Length":String(a),"Cache-Control":"no-store","Access-Control-Allow-Origin":"*"}})}if(o.pathname==="/api/manual-redirect-domains"){if(!e.DB)return Response.json({success:!1,error:"\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93"});if(await M(e),t.method==="GET"){let a=await jt(e);return Response.json({success:!0,domains:a})}if(t.method==="POST")try{let a=await t.json(),r=Array.isArray(a.domains)?a.domains:[],i=await ye(e,r);return yt(),Response.json({success:!0,domains:i})}catch(a){return Response.json({success:!1,error:a.message},{status:400})}return new Response("Method not allowed",{status:405})}return null}var Zo="https://vps789.com/openApi/cfIpTop20",Qo=720*60*1e3,qo=/^\d{1,3}(\.\d{1,3}){3}$/,tr=/^[a-z0-9.-]+$/;function er(t){let e=t&&t.data&&Array.isArray(t.data.good)?t.data.good:[],s=new Set,o=[];return e.forEach((a,r)=>{let i=r+1;if(!a)return;let n=String(a.ip??"").trim().toLowerCase();n&&(qo.test(n)||n.includes(":")||tr.test(n)&&(s.has(n)||(s.add(n),o.push({domain:n,note:`vps789\xB7\u7EFC\u5408\u6392\u540D${i}`,rank:i}))))}),o}async function sr(t,{fetchImpl:e=fetch,timeoutMs:s=8e3}={}){let o=new AbortController,a=setTimeout(()=>o.abort(),s);try{let r=await e(Zo,{signal:o.signal});if(!r||!r.ok)return null;let i;try{i=await r.json()}catch{return null}if(!i||i.code!==0)return null;let n=er(i);return n.length?n:null}catch{return null}finally{clearTimeout(a)}}async function ar(t,e){if(!t?.DB)return;let s=Array.isArray(e)?e:[];if(!s.length)return;let o=s.map(r=>_(t,"INSERT OR IGNORE INTO optimized_domains (domain, note, builtin, enabled) VALUES (?, ?, 1, 1)",r.domain,r.note)),a=s.map(()=>"?").join(",");o.push(_(t,`DELETE FROM optimized_domains WHERE builtin = 1 AND domain NOT IN (${a})`,...s.map(r=>r.domain))),o.push(At(t,me,Date.now())),await N(t,o)}async function Ia(t,e,s={}){if(!t?.DB)return;let o=s.now??Date.now(),a=s.ttlMs??Qo,r=await H(t,me),i=parseInt(r,10)||0,n=async()=>{let c=await sr(t,s.fetchImpl?{fetchImpl:s.fetchImpl}:{});c&&await ar(t,c)};if(!i){await n();return}if(o-i>a){e&&typeof e.waitUntil=="function"?e.waitUntil(n()):await n();return}}async function Ua(t,e,s,o){if(o.pathname==="/api/optimized-domains"&&t.method==="GET"){if(!e.DB)return Response.json({success:!1,error:"\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93"});await M(e);try{await Ia(e,s)}catch{}let{results:a}=await R(e,"SELECT id, domain, note, builtin, enabled, last_ms FROM optimized_domains ORDER BY builtin DESC, id ASC");return Response.json({success:!0,items:a||[]})}if(o.pathname==="/api/optimized-domains"&&t.method==="POST"){if(!e.DB)return Response.json({success:!1,error:"\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93"});await M(e);try{let{domain:a,note:r}=await t.json(),i=String(a||"").trim().toLowerCase();return!i||!/^[a-z0-9.-]+$/.test(i)?Response.json({success:!1,error:"\u57DF\u540D\u683C\u5F0F\u975E\u6CD5"},{status:400}):(await F(e,"INSERT OR IGNORE INTO optimized_domains (domain, note, builtin, enabled) VALUES (?, ?, 0, 1)",i,String(r||"")),Response.json({success:!0}))}catch(a){return Response.json({success:!1,error:a.message},{status:400})}}if(o.pathname.startsWith("/api/optimized-domains/")&&o.pathname!=="/api/optimized-domains/speedtest"){if(!e.DB)return Response.json({success:!1,error:"\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93"});await M(e);let a=parseInt(o.pathname.split("/").pop(),10);if(!a)return Response.json({success:!1,error:"invalid id"},{status:400});let r=await x(e,"SELECT * FROM optimized_domains WHERE id = ?",a);if(!r)return Response.json({success:!1,error:"\u8BB0\u5F55\u4E0D\u5B58\u5728"},{status:404});if(t.method==="PATCH")try{let i=await t.json(),n=i.enabled===void 0?r.enabled:i.enabled?1:0,c=i.note===void 0?r.note:String(i.note||"");return await F(e,"UPDATE optimized_domains SET enabled = ?, note = ? WHERE id = ?",n,c,a),Response.json({success:!0})}catch(i){return Response.json({success:!1,error:i.message},{status:400})}return t.method==="DELETE"?r.builtin?Response.json({success:!1,error:"\u5185\u7F6E\u57DF\u540D\u4E0D\u53EF\u5220\u9664\uFF08\u53EF\u7981\u7528\uFF09"},{status:400}):(await F(e,"DELETE FROM optimized_domains WHERE id = ?",a),Response.json({success:!0})):new Response("Method not allowed",{status:405})}if(o.pathname==="/api/optimized-domains/speedtest"&&t.method==="POST"){if(!e.DB)return Response.json({success:!1,error:"\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93"});await M(e);let{results:a}=await R(e,"SELECT id, domain FROM optimized_domains WHERE enabled = 1"),r=a||[],i=await Promise.all(r.map(async n=>{let c=await Qe(n.domain);return{id:n.id,domain:n.domain,ms:c.ms,ok:c.ok}}));try{let n=i.map(c=>_(e,"UPDATE optimized_domains SET last_ms = ? WHERE id = ?",c.ms,c.id));n.length&&await N(e,n)}catch{}return i.sort((n,c)=>!n.ok&&!c.ok?0:n.ok?c.ok?n.ms-c.ms:-1:1),Response.json({success:!0,items:i})}return null}async function Ba(t,e,s,o,a={}){let r=a.cfApi||dt(e);if(o.pathname==="/api/dns-ready"&&t.method==="GET"){let i=!!(e.CF_API_TOKEN&&e.CF_ZONE_ID&&e.CF_DOMAIN);return Response.json({success:!0,ready:i,domain:e.CF_DOMAIN||""})}if(o.pathname==="/api/dns/replace"&&t.method==="POST")try{let i=await t.json(),n=String(i.domain||"").trim().toLowerCase();if(!n)return Response.json({success:!1,error:"\u7F3A\u5C11\u76EE\u6807\u57DF\u540D"},{status:400});let c=e.CF_ZONE_ID,l=e.CF_DOMAIN;if(!e.CF_API_TOKEN||!c||!l)return Response.json({success:!1,error:"\u7F3A\u5C11\u73AF\u5883\u53D8\u91CF CF_API_TOKEN / CF_ZONE_ID / CF_DOMAIN"},{status:400});let d=await r.rest(`/zones/${c}/dns_records?name=${l}`);if(!d.ok)return Response.json({success:!1,error:"CF \u62C9\u53D6\u8BB0\u5F55\u5931\u8D25: "+(d.errors?JSON.stringify(d.errors):d.error)},{status:502});let u=(d.result||[]).filter(m=>m.type==="A"||m.type==="AAAA"||m.type==="CNAME");for(let m of u)await r.rest(`/zones/${c}/dns_records/${m.id}`,{method:"DELETE"});let p=await r.rest(`/zones/${c}/dns_records`,{method:"POST",body:{type:"CNAME",name:l,content:n,ttl:60,proxied:!1}});return p.ok?Response.json({success:!0,name:l,content:n,replaced:u.length}):Response.json({success:!1,error:"CF \u5199\u5165\u5931\u8D25: "+(p.errors?JSON.stringify(p.errors):p.error)},{status:502})}catch(i){return Response.json({success:!1,error:i.message},{status:500})}if(o.pathname==="/api/get-dns"){let i=e.CF_ZONE_ID,n=e.CF_DOMAIN;if(!e.CF_API_TOKEN||!i||!n)return Response.json({success:!1,error:"\u7F3A\u5C11 DNS \u73AF\u5883\u53D8\u91CF"});try{let c=await r.rest(`/zones/${i}/dns_records?name=${n}`);return c.ok?Response.json({success:!0,result:c.result}):Response.json({success:!1,error:"CF API \u62D2\u7EDD: "+(c.errors?JSON.stringify(c.errors):c.error)})}catch(c){return Response.json({success:!1,error:c.message})}}if(o.pathname==="/api/update-dns"&&t.method==="POST"){let n=(await t.json()).ips,c=e.CF_ZONE_ID,l=e.CF_DOMAIN;if(!e.CF_API_TOKEN||!c||!l)return Response.json({success:!1,error:"\u7F3A\u5C11 DNS \u73AF\u5883\u53D8\u91CF"});try{let d=await r.rest(`/zones/${c}/dns_records?name=${l}`);if(!d.ok)throw new Error("\u83B7\u53D6\u73B0\u6709 DNS \u8BB0\u5F55\u5931\u8D25");let u=d.result.filter(p=>p.type==="A"||p.type==="AAAA"||p.type==="CNAME");for(let p of u)await r.rest(`/zones/${c}/dns_records/${p.id}`,{method:"DELETE"});for(let p of n){let m=p.replace(/[\[\]]/g,""),b="A";m.includes(":")?b="AAAA":/[a-zA-Z]/.test(m)&&(b="CNAME");let h=await r.rest(`/zones/${c}/dns_records`,{method:"POST",body:{type:b,name:l,content:m,ttl:60,proxied:!1}});if(!h.ok)throw new Error("\u8BB0\u5F55\u63D0\u4EA4\u5931\u8D25: "+(h.errors?JSON.stringify(h.errors):h.error))}return Response.json({success:!0,message:"\u2705 \u6210\u529F\uFF01"})}catch(d){return Response.json({success:!1,error:d.message})}}if(o.pathname==="/api/get-custom-api-ips")try{let i=o.searchParams.get("url");if(!i)throw new Error("\u7F3A\u5C11 URL");let c=await(await fetch(i,{headers:{"User-Agent":"Mozilla/5.0"}})).text(),l=new Set;try{let u=JSON.parse(c);u&&u.data&&Array.isArray(u.data)&&u.data.forEach(p=>{if(p.ip){let m=p.ip;m.includes(":")&&!m.startsWith("[")&&(m=`[${m}]`),l.add(m)}})}catch{}if(l.size===0){let u=/\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;(c.match(u)||[]).forEach(h=>{!h.startsWith("10.")&&!h.startsWith("192.168.")&&!h.startsWith("127.")&&l.add(h)});let m=/(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}|(?:[A-F0-9]{1,4}:)*:[A-F0-9]{1,4}(?::[A-F0-9]{1,4})*/gi;(c.match(m)||[]).forEach(h=>{h.length>7&&h.includes(":")&&!h.startsWith("::1")&&l.add(h.startsWith("[")?h:`[${h}]`)})}let d=Array.from(l);for(let u=d.length-1;u>0;u--){let p=Math.floor(Math.random()*(u+1));[d[u],d[p]]=[d[p],d[u]]}return Response.json({success:!0,ips:d.slice(0,15),totalCount:d.length})}catch(i){return Response.json({success:!1,error:i.message},{status:500})}if(o.pathname==="/api/get-remote-ips")try{let i=(o.searchParams.get("type")||"all").toLowerCase(),n=new Set;if(["all","\u7535\u4FE1","\u8054\u901A","\u79FB\u52A8","\u591A\u7EBF","ipv6"].includes(i))try{let l=await fetch("https://api.uouin.com/cloudflare.html",{headers:{"User-Agent":"Mozilla/5.0"}});if(l.ok){let u=(await l.text()).replace(/<[^>]+>/g," "),p=/(电信|联通|移动|多线|ipv6)\s+((?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-fA-F0-9]{1,4}:)+[a-fA-F0-9]{1,4})/gi,m;for(;(m=p.exec(u))!==null;){let b=m[1].toLowerCase(),h=m[2];h.includes(":")&&!h.startsWith("[")&&(h=`[${h}]`),(i==="all"||i===b)&&n.add(h)}}}catch{}if(["all","\u4F18\u9009"].includes(i))try{let l=await fetch("https://raw.githubusercontent.com/ZhiXuanWang/cf-speed-dns/refs/heads/main/ipTop10.html",{headers:{"User-Agent":"Mozilla/5.0"}});if(l.ok){let d=await l.text(),u=/\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;(d.match(u)||[]).forEach(m=>{!m.startsWith("10.")&&!m.startsWith("192.168.")&&!m.startsWith("127.")&&n.add(m)})}}catch{}let c=Array.from(n);for(let l=c.length-1;l>0;l--){let d=Math.floor(Math.random()*(l+1));[c[l],c[d]]=[c[d],c[l]]}return Response.json({success:!0,ips:c.slice(0,10),totalCount:c.length})}catch(i){return Response.json({success:!1,error:i.message},{status:500})}return null}async function Fa(t,e,s,o){if(o.pathname==="/api/routes/reorder"&&t.method==="POST"){if(!e.DB)return Response.json({success:!1,error:"\u672A\u7ED1\u5B9A DB"});try{let a=await t.json();return await As(e,a),Response.json({success:!0})}catch(a){return Response.json({success:!1,error:a.message})}}if(o.pathname==="/api/routes/monitor"&&t.method==="POST"){if(!e.DB)return Response.json({success:!1,error:"\u672A\u7ED1\u5B9A DB"},{status:500});try{let{prefix:a,enabled:r}=await t.json();return a?(await nt(e,a,{monitor_enabled:r?1:0}),Response.json({success:!0})):Response.json({success:!1,error:"\u7F3A\u5C11 prefix"},{status:400})}catch(a){return Response.json({success:!1,error:String(a&&a.message||a)},{status:500})}}if(o.pathname==="/api/routes/import"&&t.method==="POST"){if(!e.DB)return Response.json({success:!1,error:"\u672A\u7ED1\u5B9A DB"});try{let a=await t.json(),r=[],i=0;for(let n of a){if(!n.prefix||!n.target){r.push({prefix:n.prefix||"(\u7A7A)",reason:"\u7F3A\u5C11 prefix \u6216 target"});continue}let c=Pt(n.prefix);if(c){r.push({prefix:n.prefix,reason:c});continue}let l={prefix:n.prefix,target:n.target,mode:n.mode||"off",remark:n.remark||"",group_name:n.group_name||"",last_play:n.last_play||"",icon:n.icon||"",cache_img:n.cache_img||"on",sort_order:n.sort_order||0,custom_headers:n.custom_headers||"",backend_url:n.backend_url||"",show_on_status:n.show_on_status?1:0,public_alias:n.public_alias||"",media_counts_auto_auth:n.media_counts_auto_auth?1:0,keepalive_days:n.keepalive_days||0,keepalive_last_played_at:n.keepalive_last_played_at||0,keepalive_last_reminded_at:n.keepalive_last_reminded_at||0};await Cs(e,l),i++}return Response.json({success:!0,imported:i,skipped:r})}catch(a){return Response.json({success:!1,error:a.message})}}if(o.pathname.startsWith("/api/routes")){if(!e.DB)return Response.json({error:"\u7531\u4E8E\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93\uFF0C\u53CD\u4EE3\u529F\u80FD\u4E0D\u53EF\u7528\u3002"},{status:500});if(t.method==="GET"){let a=K(),{results:r}=await R(e,`
                SELECT r.*,
                IFNULL(s.count, 0) as todayReqs,
                (SELECT SUM(count) FROM request_stats WHERE prefix = r.prefix) as totalReqs
                FROM routes r
                LEFT JOIN request_stats s ON r.prefix = s.prefix AND s.date = ?
                ORDER BY r.sort_order ASC, r.prefix ASC
            `,a);if(e.CF_API_TOKEN&&e.CF_ZONE_ID&&r&&r.length>0){let i=await R(e,"SELECT prefix, bytes FROM route_bandwidth_today WHERE day = ?",a),n=new Map((i.results||[]).map(c=>[c.prefix,c.bytes]));if(n.size===0)try{await je(e),i=await R(e,"SELECT prefix, bytes FROM route_bandwidth_today WHERE day = ?",a),n=new Map((i.results||[]).map(c=>[c.prefix,c.bytes]))}catch{}for(let c of r)n.has(c.prefix)?c.todayBandwidth=Lt(n.get(c.prefix)):c.todayBandwidth="\u83B7\u53D6\u5F02\u5E38"}for(let i of r||[])i.has_emby_password=i.emby_password_enc?1:0,delete i.emby_password_enc;return Response.json(r||[])}if(t.method==="POST"){let a=await t.json(),r=Pt(a.prefix);if(r)return Response.json({success:!1,error:`\u8DEF\u7531\u522B\u540D "${a.prefix}" \u4E0D\u53EF\u7528\uFF1A${r}`},{status:400});let i=0,n={show_on_status:0,public_alias:"",media_counts_auto_auth:0,monitor_enabled:1},c={last_play:"",emby_auth_cache:"",emby_auth_seen_at:0,emby_auth_used_at:0,keepalive_last_played_at:0,keepalive_last_reminded_at:0,emby_username:"",emby_password_enc:""},l=L=>{L&&(i=L.sort_order,n={show_on_status:L.show_on_status|0,public_alias:L.public_alias||"",media_counts_auto_auth:L.media_counts_auto_auth|0,monitor_enabled:L.monitor_enabled==null?1:L.monitor_enabled|0},c={last_play:L.last_play||"",emby_auth_cache:L.emby_auth_cache||"",emby_auth_seen_at:L.emby_auth_seen_at|0,emby_auth_used_at:L.emby_auth_used_at|0,keepalive_last_played_at:L.keepalive_last_played_at|0,keepalive_last_reminded_at:L.keepalive_last_reminded_at|0,emby_username:L.emby_username||"",emby_password_enc:L.emby_password_enc||""})};a.oldPrefix&&a.oldPrefix!==a.prefix?(l(await x(e,`SELECT ${Oe} FROM routes WHERE prefix = ?`,a.oldPrefix)),await Le(e,a.oldPrefix)):l(await x(e,`SELECT ${Oe} FROM routes WHERE prefix = ?`,a.prefix));let d=a.show_on_status===void 0?n.show_on_status:a.show_on_status?1:0,u=a.public_alias===void 0?n.public_alias:String(a.public_alias||"").trim(),p=a.media_counts_auto_auth===void 0?n.media_counts_auto_auth:a.media_counts_auto_auth?1:0,m=a.monitor_enabled===void 0?n.monitor_enabled:a.monitor_enabled?1:0,b=Math.min(365,Math.max(0,parseInt(a.keepalive_days,10)||0)),h=a.emby_username===void 0?c.emby_username:String(a.emby_username||"").trim(),A=c.emby_password_enc;h?typeof a.emby_password=="string"&&a.emby_password.length>0&&(A=await Ot(e,a.emby_password)):A="";let D=h!==c.emby_username||A!==c.emby_password_enc,k=D?"":c.emby_auth_cache,g=D?0:c.emby_auth_seen_at;return await vs(e,{prefix:a.prefix,target:a.target,mode:a.mode||"off",remark:a.remark||"",group_name:(a.group_name||"").trim(),icon:a.icon||"",cache_img:a.cache_img||"on",sort_order:i,custom_headers:a.custom_headers||"",backend_url:a.backend_url||"",show_on_status:d,public_alias:u,media_counts_auto_auth:p,monitor_enabled:m,last_play:c.last_play,emby_auth_cache:k,emby_auth_seen_at:g,emby_auth_used_at:c.emby_auth_used_at,keepalive_days:b,keepalive_last_played_at:c.keepalive_last_played_at,keepalive_last_reminded_at:c.keepalive_last_reminded_at,emby_username:h,emby_password_enc:A}),Response.json({success:!0})}if(t.method==="DELETE"){let a=o.searchParams.get("prefix");return await Le(e,a),Response.json({success:!0})}return new Response("Method not allowed",{status:405})}return null}function or(t,e){return t.map(s=>{let o=s.prefix,a=e.lastProbeBy.get(o)||null,r=e.ecgBy.get(o)||[],i=e.agg24By.get(o)||null,n=e.agg7dBy.get(o)||null,c=e.agg30dBy.get(o)||null,l=e.latestCountsBy.get(o)||null,d=l&&e.prevCountsBy.get(o)||null,u=(i&&i.total)|0,p=(i&&i.ok_count)|0,m=(n&&n.total)|0,b=(n&&n.ok_count)|0,h=(c&&c.total)|0,A=(c&&c.ok_count)|0,D=!!(a&&a.ok);return{prefix:o,name:J(s),icon:s.icon||"",ok:D,latest_ms:a?a.ms|0:0,latest_ts:a?a.ts|0:0,avail_24h:u>0?p/u:null,avail_7d:m>0?b/m:null,avail_30d:h>0?A/h:null,history:r.map(k=>({ok:k.ok,ms:k.ms|0})).reverse(),trend:(e.trendBy.get(o)||[]).slice().reverse(),counts:$t(l),counts_delta:is(l,d),show_counts:!0}})}async function Pa(t,e){e=e||{};let s=e.prefix||null,o=Math.floor(Date.now()/1e3),a=o-24*3600,r=o-7*86400,i=o-30*86400,n=o-3600,c=K(),l=s?"WHERE monitor_enabled = 1 AND prefix = ?":"WHERE monitor_enabled = 1",d=s?" AND prefix = ?":"",u=s?_(t,`SELECT ${Ce}
                          FROM routes ${l} ORDER BY sort_order ASC, prefix ASC`,s):_(t,`SELECT ${Ce}
                          FROM routes ${l} ORDER BY sort_order ASC, prefix ASC`),p=s?_(t,`SELECT prefix, ok, ms, status, ts,
                                 ROW_NUMBER() OVER (PARTITION BY prefix ORDER BY ts DESC) AS rn
                          FROM emby_probes WHERE ts >= ?${d}
                          ORDER BY prefix ASC, ts DESC`,n,s):_(t,`SELECT prefix, ok, ms, status, ts,
                                 ROW_NUMBER() OVER (PARTITION BY prefix ORDER BY ts DESC) AS rn
                          FROM emby_probes WHERE ts >= ?
                          ORDER BY prefix ASC, ts DESC`,n),m=s?_(t,`SELECT prefix, SUM(ok_count) AS ok_count, SUM(ok_count) + SUM(fail_count) AS total
                          FROM emby_probe_hourly WHERE hour_ts >= ?${d} GROUP BY prefix`,a,s):_(t,`SELECT prefix, SUM(ok_count) AS ok_count, SUM(ok_count) + SUM(fail_count) AS total
                          FROM emby_probe_hourly WHERE hour_ts >= ? GROUP BY prefix`,a),b=s?_(t,`SELECT prefix, SUM(ok_count) AS ok_count, SUM(ok_count) + SUM(fail_count) AS total
                          FROM emby_probe_hourly WHERE hour_ts >= ?${d} GROUP BY prefix`,r,s):_(t,`SELECT prefix, SUM(ok_count) AS ok_count, SUM(ok_count) + SUM(fail_count) AS total
                          FROM emby_probe_hourly WHERE hour_ts >= ? GROUP BY prefix`,r),h=s?_(t,`SELECT prefix, SUM(ok_count) AS ok_count, SUM(ok_count) + SUM(fail_count) AS total
                          FROM emby_probe_hourly WHERE hour_ts >= ?${d} GROUP BY prefix`,i,s):_(t,`SELECT prefix, SUM(ok_count) AS ok_count, SUM(ok_count) + SUM(fail_count) AS total
                          FROM emby_probe_hourly WHERE hour_ts >= ? GROUP BY prefix`,i),A=s?_(t,`SELECT prefix, day, movies, series, episodes, artists, albums, songs, music_videos, box_sets, books,
                                 ROW_NUMBER() OVER (PARTITION BY prefix ORDER BY day DESC) AS rn
                          FROM emby_media_counts WHERE day <= ?${d}`,c,s):_(t,`SELECT prefix, day, movies, series, episodes, artists, albums, songs, music_videos, box_sets, books,
                                 ROW_NUMBER() OVER (PARTITION BY prefix ORDER BY day DESC) AS rn
                          FROM emby_media_counts WHERE day <= ?`,c),D=s?_(t,"SELECT prefix, movies, series, episodes, artists, albums, songs, music_videos, box_sets, books, updated_at FROM emby_media_counts_live WHERE prefix = ?",s):_(t,"SELECT prefix, movies, series, episodes, artists, albums, songs, music_videos, box_sets, books, updated_at FROM emby_media_counts_live"),[k,g,L,X,v,Z,Y]=await N(t,[u,p,m,b,h,A,D]),$=k.results||[];if(!$.length)return{routes:[],cards:[]};let tt=new Map,Q=new Map;for(let f of g.results||[])if(f.rn===1&&tt.set(f.prefix,f),f.rn<=60){let B=Q.get(f.prefix);B||(B=[],Q.set(f.prefix,B)),B.push(f)}let T=new Map;for(let f of L.results||[])T.set(f.prefix,{ok_count:f.ok_count|0,total:f.total|0});let G=Math.floor(o/3600)*3600;for(let f of g.results||[]){if(f.ts<G)continue;let B=T.get(f.prefix);B||(B={ok_count:0,total:0},T.set(f.prefix,B)),B.total+=1,f.ok&&(B.ok_count+=1)}let ut=new Map;for(let f of X.results||[])ut.set(f.prefix,f);let I=new Map;for(let f of v?.results||[])I.set(f.prefix,f);let U=new Map,W=new Map,q=new Map;for(let f of Z.results||[])if(f.rn===1?U.set(f.prefix,f):f.rn===2&&W.set(f.prefix,f),f.rn<=14){let B=q.get(f.prefix);B||(B=[],q.set(f.prefix,B)),B.push(ns(f))}for(let f of Y?.results||[])U.set(f.prefix,{prefix:f.prefix,movies:f.movies,series:f.series,episodes:f.episodes,artists:f.artists,albums:f.albums,songs:f.songs,music_videos:f.music_videos,box_sets:f.box_sets,books:f.books,updated_at:f.updated_at});let z=or($,{lastProbeBy:tt,ecgBy:Q,agg24By:T,agg7dBy:ut,agg30dBy:I,latestCountsBy:U,prevCountsBy:W,trendBy:q});if(e.liveRefresh&&e.ctx&&e.ctx.waitUntil){let f=$.map(B=>B.prefix);f.length&&e.ctx.waitUntil(Vs(t,f))}return{routes:$,cards:z}}async function Ha(t,e,s,o){if(o.pathname==="/api/status/route-flags"&&t.method==="POST"){if(!e.DB)return Response.json({success:!1,error:"\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93"},{status:500});await M(e);try{let a=await t.json(),r=String(a.prefix||"").trim();if(!r)return Response.json({success:!1,error:"\u7F3A\u5C11 prefix"},{status:400});if(!await x(e,`SELECT ${Tt} FROM routes WHERE prefix = ?`,r))return Response.json({success:!1,error:"\u8282\u70B9\u4E0D\u5B58\u5728"},{status:404});let n={};return a.show_on_status!==void 0&&(n.show_on_status=a.show_on_status?1:0),a.public_alias!==void 0&&(n.public_alias=String(a.public_alias||"").trim()),a.media_counts_auto_auth!==void 0&&(n.media_counts_auto_auth=a.media_counts_auto_auth?1:0),Object.keys(n).length?(await nt(e,r,n),Response.json({success:!0})):Response.json({success:!1,error:"\u65E0\u5B57\u6BB5\u9700\u8981\u66F4\u65B0"},{status:400})}catch(a){return Response.json({success:!1,error:a.message},{status:400})}}if(o.pathname==="/api/status/revoke-auth"&&t.method==="POST"){if(!e.DB)return Response.json({success:!1,error:"\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93"},{status:500});await M(e);try{let a=await t.json(),r=String(a.prefix||"").trim();return r?(await Kt(e,r,{clearUsedAt:!0}),Ps.delete(r),Response.json({success:!0})):Response.json({success:!1,error:"\u7F3A\u5C11 prefix"},{status:400})}catch(a){return Response.json({success:!1,error:a.message},{status:400})}}if(o.pathname==="/api/status/probes"&&t.method==="GET"){if(!e.DB)return Response.json({success:!1,error:"\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93"},{status:500});try{let a=await Pa(e,{liveRefresh:!0,ctx:s});return Response.json({success:!0,cards:a.cards})}catch(a){return Response.json({success:!1,error:a.message},{status:500})}}if(o.pathname==="/api/status/auth-state"&&t.method==="GET"){if(!e.DB)return Response.json({success:!1,error:"\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93"},{status:500});await M(e);let{results:a}=await R(e,`
            SELECT prefix, show_on_status, public_alias, media_counts_auto_auth,
                   CASE WHEN emby_auth_cache = '' THEN 0 ELSE 1 END AS has_token,
                   emby_username,
                   CASE WHEN emby_password_enc = '' THEN 0 ELSE 1 END AS has_password,
                   emby_auth_seen_at, emby_auth_used_at
              FROM routes
        `);return Response.json({success:!0,items:a||[]})}if(o.pathname==="/api/status/global-flags"&&t.method==="GET"){if(!e.DB)return Response.json({success:!1,error:"\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93"},{status:500});await M(e);let a=await H(e,et),r=await H(e,st);return Response.json({success:!0,country_allowlist:a?[...a].join(","):"",hotlink_allow_hosts:r?[...r].join(","):""})}if(o.pathname==="/api/status/global-flags"&&t.method==="POST"){if(!e.DB)return Response.json({success:!1,error:"\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93"},{status:500});await M(e);try{let a=await t.json();return a.country_allowlist!==void 0&&await ot(e,et,a.country_allowlist),a.hotlink_allow_hosts!==void 0&&await ot(e,st,a.hotlink_allow_hosts),yt(),Response.json({success:!0})}catch(a){return Response.json({success:!1,error:a.message},{status:400})}}if(o.pathname==="/api/status/route-creds"&&t.method==="POST"){if(!e.DB)return Response.json({success:!1,error:"\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93"},{status:500});await M(e);try{let a=await t.json(),r=String(a.prefix||"").trim();if(!r)return Response.json({success:!1,error:"\u7F3A\u5C11 prefix"},{status:400});let i=await x(e,`SELECT ${Ss} FROM routes WHERE prefix = ?`,r);if(!i)return Response.json({success:!1,error:"\u8282\u70B9\u4E0D\u5B58\u5728"},{status:404});let n=String(a.emby_username||"").trim(),c=i.emby_password_enc||"";n?typeof a.emby_password=="string"&&a.emby_password.length>0&&(c=await Ot(e,a.emby_password)):c="";let l=n!==(i.emby_username||"")||c!==(i.emby_password_enc||""),d=l?"":i.emby_auth_cache||"",u={emby_username:n,emby_password_enc:c,emby_auth_cache:d};return l&&(u.emby_auth_seen_at=0),await nt(e,r,u),Response.json({success:!0})}catch(a){return Response.json({success:!1,error:a.message},{status:400})}}if(o.pathname==="/api/status/emby-creds"&&t.method==="GET"){if(!e.DB)return Response.json({success:!1,error:"\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93"},{status:500});await M(e);let a=await H(e,St),r=await H(e,Et);return Response.json({success:!0,username:a||"",has_password:r?1:0})}if(o.pathname==="/api/status/emby-creds"&&t.method==="POST"){if(!e.DB)return Response.json({success:!1,error:"\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93"},{status:500});await M(e);try{let a=await t.json(),r=String(a.username||"").trim();if(await ot(e,St,r),!r)await ot(e,Et,"");else if(typeof a.password=="string"&&a.password.length>0){let i=await Ot(e,a.password);await ot(e,Et,i)}return Response.json({success:!0})}catch(a){return Response.json({success:!1,error:a.message},{status:400})}}return null}async function ja(t,e,s){let o=new URL(t.url);e.DB&&await M(e);let a;if(a=await Oa(t,e,s,o))return a;let r=await ya(t,e,o);if(r)return r;if(o.pathname==="/"){let i={ETag:ze,"Cache-Control":"private, max-age=0, must-revalidate"};return t.headers.get("If-None-Match")===ze?new Response(null,{status:304,headers:i}):new Response($e,{headers:{"Content-Type":"text/html;charset=UTF-8",...i}})}return(a=await La(t,e,s,o))||(a=await Na(t,e,s,o))||(a=await Ua(t,e,s,o))||(a=await Ba(t,e,s,o))||(a=await Fa(t,e,s,o))||(a=await Ha(t,e,s,o))?a:fa(t,e,s,o)}var Tl={scheduled:(t,e,s)=>sa(t,e,s),fetch:(t,e,s)=>ja(t,e,s)};export{Tl as default};
