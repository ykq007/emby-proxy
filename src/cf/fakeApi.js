// 内存假适配器：与 createCfApi() 同形状（{ rest, graphql }），供测试注入，
// 不发起任何真实网络请求。用法：
//
//   const cfApi = createFakeCfApi({
//     rest: (path, init) => path.endsWith('/dns_records') && init.method === 'POST'
//       ? { ok: true, status: 200, result: { id: 'new-1' } }
//       : { ok: true, status: 200, result: [] },
//     graphql: (query) => ({ ok: true, status: 200, data: { viewer: { zones: [] } } }),
//   });
//   handleDns(request, env, ctx, url, { cfApi });
//
// calls.rest / calls.graphql 记录每次调用，便于断言"确实经过了 cfApi"。
export function createFakeCfApi(handlers = {}) {
    const calls = { rest: [], graphql: [] };

    async function rest(path, init = {}) {
        calls.rest.push({ path, init });
        if (typeof handlers.rest === 'function') {
            return handlers.rest(path, init, calls.rest.length - 1);
        }
        return { ok: true, status: 200, result: null };
    }

    async function graphql(query, variables, init = {}) {
        calls.graphql.push({ query, variables, init });
        if (typeof handlers.graphql === 'function') {
            return handlers.graphql(query, variables, calls.graphql.length - 1);
        }
        return { ok: true, status: 200, data: null };
    }

    return { rest, graphql, calls };
}
