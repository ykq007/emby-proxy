import { jsonResponse } from '../util/json.js';
import { createCfApi } from '../cf/api.js';

// 把 CF services 接口里的 script.placement 转成面板提交用的同一形状：{ region } / { mode }。
// settings 接口只给区域的数字 id，services 接口才带 region 字符串。
export function placementFromScript(script) {
    const p = script?.placement;
    const region = p?.region || p?.target?.find?.(t => t?.region)?.region;
    if (region) return { region };
    if (p?.mode === 'smart' || script?.placement_mode === 'smart') return { mode: 'smart' };
    return { mode: 'off' };
}

export async function handlePlacement(request, env, ctx, url, deps = {}) {
    if (url.pathname !== '/api/placement') return null;
    if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID || !env.CF_WORKER_NAME) {
        return jsonResponse({ success: false, msg: '后台变量未配置全！请检查 CF_API_TOKEN, CF_ACCOUNT_ID, CF_WORKER_NAME' });
    }
    const cfApi = deps.cfApi || createCfApi(env);

    if (request.method === 'GET') {
        const res = await cfApi.rest(`/accounts/${env.CF_ACCOUNT_ID}/workers/services/${env.CF_WORKER_NAME}`);
        if (!res.ok) return jsonResponse({ success: false, msg: 'CF报错: ' + ((res.errors && res.errors[0]?.message) || res.error || '未知错误') });
        const script = res.result?.default_environment?.script || res.result?.script;
        return jsonResponse({ success: true, placement: placementFromScript(script) });
    }

    if (request.method === 'POST') {
        try {
            const body = await request.json();
            const formData = new FormData();
            formData.append('settings', new Blob([JSON.stringify({ placement: body.placement })], { type: 'application/json' }));
            const cfRes = await cfApi.rest(`/accounts/${env.CF_ACCOUNT_ID}/workers/scripts/${env.CF_WORKER_NAME}/settings`, {
                method: 'PATCH',
                body: formData,
                isForm: true,
            });
            if (cfRes.ok) return jsonResponse({ success: true, msg: '部署区域修改成功！' });
            return jsonResponse({ success: false, msg: 'CF报错: ' + ((cfRes.errors && cfRes.errors[0]?.message) || cfRes.error || '未知错误') });
        } catch (e) {
            return jsonResponse({ success: false, msg: e.message });
        }
    }

    return new Response('Method not allowed', { status: 405 });
}
