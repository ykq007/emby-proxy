// 聚合 Worker 的响应小工具（api.js / playback.js 共用）。
export const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
};
export const json = (data, status = 200) => Response.json(data, { status, headers: CORS });
export const empty = (status = 204) => new Response(null, { status, headers: CORS });

export function param(url, name) {
    const want = name.toLowerCase();
    for (const [k, v] of url.searchParams) if (k.toLowerCase() === want) return v;
    return null;
}
