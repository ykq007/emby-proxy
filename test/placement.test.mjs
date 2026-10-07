import { test } from 'node:test';
import assert from 'node:assert/strict';

import { handlePlacement } from '../src/api/placement.js';
import { handleRequest } from '../src/router.js';
import { createFakeCfApi } from '../src/cf/fakeApi.js';

const env = { CF_API_TOKEN: 'tok', CF_ACCOUNT_ID: 'acc', CF_WORKER_NAME: 'emby', ADMIN_TOKEN: 'secret' };
const url = new URL('https://proxy.test/api/placement');
const getWith = (placement) => {
    const cfApi = createFakeCfApi({ rest: () => ({ ok: true, result: { default_environment: { script: { placement } } } }) });
    return handlePlacement(new Request(url), env, {}, url, { cfApi }).then(r => r.json());
};

test('GET reads the pinned region from the services endpoint', async () => {
    const body = await getWith({ mode: 'targeted', target: [{ id: 30, region: 'aws:ap-southeast-1', type: 'region' }] });
    assert.deepEqual(body, { success: true, placement: { region: 'aws:ap-southeast-1' } });
});

test('GET maps smart and unset placement to the panel modes', async () => {
    assert.deepEqual((await getWith({ mode: 'smart' })).placement, { mode: 'smart' });
    assert.deepEqual((await getWith(undefined)).placement, { mode: 'off' });
});

test('POST /api/placement without the admin cookie is refused before reaching Cloudflare', async () => {
    let cfCalls = 0;
    const restoreFetch = globalThis.fetch;
    globalThis.fetch = async () => { cfCalls++; return Response.json({ success: true, result: {} }); };
    try {
        const req = new Request(url, { method: 'POST', body: JSON.stringify({ placement: { mode: 'off' } }) });
        const res = await handleRequest(req, env, { waitUntil() {} });
        assert.notEqual(res.status, 200);
        assert.equal(cfCalls, 0);
    } finally {
        globalThis.fetch = restoreFetch;
    }
});
