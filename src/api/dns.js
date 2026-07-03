import { createCfApi } from '../cf/api.js';

export async function handleDns(request, env, ctx, url, deps = {}) {
    const cfApi = deps.cfApi || createCfApi(env);

    // 检查 DNS 替换前置条件（env 变量是否齐全）
    if (url.pathname === '/api/dns-ready' && request.method === 'GET') {
        const ok = !!(env.CF_API_TOKEN && env.CF_ZONE_ID && env.CF_DOMAIN);
        return Response.json({ success: true, ready: ok, domain: env.CF_DOMAIN || '' });
    }
    if (url.pathname === '/api/dns/replace' && request.method === 'POST') {
        try {
            const body = await request.json();
            const newDomain = String(body.domain || '').trim().toLowerCase();
            if (!newDomain) return Response.json({ success: false, error: '缺少目标域名' }, { status: 400 });
            const zoneId = env.CF_ZONE_ID; const domain = env.CF_DOMAIN;
            if (!env.CF_API_TOKEN || !zoneId || !domain) return Response.json({ success: false, error: '缺少环境变量 CF_API_TOKEN / CF_ZONE_ID / CF_DOMAIN' }, { status: 400 });

            // 拉取该域名下所有 A/AAAA/CNAME 记录
            const listRes = await cfApi.rest(`/zones/${zoneId}/dns_records?name=${domain}`);
            if (!listRes.ok) return Response.json({ success: false, error: 'CF 拉取记录失败: ' + (listRes.errors ? JSON.stringify(listRes.errors) : listRes.error) }, { status: 502 });

            const oldRecords = (listRes.result || []).filter(r => r.type === 'A' || r.type === 'AAAA' || r.type === 'CNAME');
            // 删除旧 A/AAAA/CNAME
            for (const r of oldRecords) {
                await cfApi.rest(`/zones/${zoneId}/dns_records/${r.id}`, { method: 'DELETE' });
            }
            // 写入新 CNAME
            const postRes = await cfApi.rest(`/zones/${zoneId}/dns_records`, {
                method: 'POST',
                body: { type: 'CNAME', name: domain, content: newDomain, ttl: 60, proxied: false }
            });
            if (!postRes.ok) return Response.json({ success: false, error: 'CF 写入失败: ' + (postRes.errors ? JSON.stringify(postRes.errors) : postRes.error) }, { status: 502 });
            return Response.json({ success: true, name: domain, content: newDomain, replaced: oldRecords.length });
        } catch (e) { return Response.json({ success: false, error: e.message }, { status: 500 }); }
    }

    if (url.pathname === '/api/get-dns') {
        const zoneId = env.CF_ZONE_ID; const domain = env.CF_DOMAIN;
        if (!env.CF_API_TOKEN || !zoneId || !domain) return Response.json({ success: false, error: '缺少 DNS 环境变量' });
        try {
            const getRes = await cfApi.rest(`/zones/${zoneId}/dns_records?name=${domain}`);
            if (!getRes.ok) return Response.json({ success: false, error: 'CF API 拒绝: ' + (getRes.errors ? JSON.stringify(getRes.errors) : getRes.error) });
            return Response.json({ success: true, result: getRes.result });
        } catch (error) { return Response.json({ success: false, error: error.message }); }
    }

    if (url.pathname === '/api/update-dns' && request.method === 'POST') {
        const body = await request.json(); const ips = body.ips;
        const zoneId = env.CF_ZONE_ID; const domain = env.CF_DOMAIN;

        if (!env.CF_API_TOKEN || !zoneId || !domain) return Response.json({ success: false, error: '缺少 DNS 环境变量' });
        try {
            const getRes = await cfApi.rest(`/zones/${zoneId}/dns_records?name=${domain}`);
            if (!getRes.ok) throw new Error('获取现有 DNS 记录失败');

            const oldRecords = getRes.result.filter(r => r.type === 'A' || r.type === 'AAAA' || r.type === 'CNAME');
            for (const record of oldRecords) {
                await cfApi.rest(`/zones/${zoneId}/dns_records/${record.id}`, { method: 'DELETE' });
            }

            for (const ip of ips) {
                const cleanItem = ip.replace(/[\[\]]/g, ''); let recordType = 'A';
                if (cleanItem.includes(':')) recordType = 'AAAA'; else if (/[a-zA-Z]/.test(cleanItem)) recordType = 'CNAME';

                const postRes = await cfApi.rest(`/zones/${zoneId}/dns_records`, {
                    method: 'POST',
                    body: { type: recordType, name: domain, content: cleanItem, ttl: 60, proxied: false }
                });
                if (!postRes.ok) throw new Error(`记录提交失败: ` + (postRes.errors ? JSON.stringify(postRes.errors) : postRes.error));
            }
            return Response.json({ success: true, message: `✅ 成功！` });
        } catch (error) { return Response.json({ success: false, error: error.message }); }
    }

    if (url.pathname === '/api/get-custom-api-ips') {
        try {
            const apiUrl = url.searchParams.get('url');
            if (!apiUrl) throw new Error("缺少 URL");
            const response = await fetch(apiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const text = await response.text(); let validIPs = new Set();
            try {
                const jsonObj = JSON.parse(text);
                if (jsonObj && jsonObj.data && Array.isArray(jsonObj.data)) {
                    jsonObj.data.forEach(item => { if (item.ip) { let ip = item.ip; if (ip.includes(':') && !ip.startsWith('[')) ip = `[${ip}]`; validIPs.add(ip); } });
                }
            } catch (e) { }

            if (validIPs.size === 0) {
                const ipv4Regex = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;
                const matchedIPv4 = text.match(ipv4Regex) || [];
                matchedIPv4.forEach(ip => { if (!ip.startsWith('10.') && !ip.startsWith('192.168.') && !ip.startsWith('127.')) validIPs.add(ip); });

                const ipv6Regex = /(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}|(?:[A-F0-9]{1,4}:)*:[A-F0-9]{1,4}(?::[A-F0-9]{1,4})*/gi;
                const matchedIPv6 = text.match(ipv6Regex) || [];
                matchedIPv6.forEach(ip => { if (ip.length > 7 && ip.includes(':') && !ip.startsWith('::1')) validIPs.add(ip.startsWith('[') ? ip : `[${ip}]`); });
            }
            const uniqueIPArray = Array.from(validIPs);
            for (let i = uniqueIPArray.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[uniqueIPArray[i], uniqueIPArray[j]] = [uniqueIPArray[j], uniqueIPArray[i]]; }
            return Response.json({ success: true, ips: uniqueIPArray.slice(0, 15), totalCount: uniqueIPArray.length });
        } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500 }); }
    }

    if (url.pathname === '/api/get-remote-ips') {
        try {
            const reqType = (url.searchParams.get('type') || 'all').toLowerCase();
            const validIPs = new Set();

            if (['all', '电信', '联通', '移动', '多线', 'ipv6'].includes(reqType)) {
                try {
                    const res1 = await fetch('https://api.uouin.com/cloudflare.html', { headers: { 'User-Agent': 'Mozilla/5.0' } });
                    if (res1.ok) {
                        const text1 = await res1.text(); const cleanText = text1.replace(/<[^>]+>/g, ' ');
                        const regex = /(电信|联通|移动|多线|ipv6)\s+((?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-fA-F0-9]{1,4}:)+[a-fA-F0-9]{1,4})/gi;
                        let match; while ((match = regex.exec(cleanText)) !== null) {
                            const lineType = match[1].toLowerCase(); let ip = match[2];
                            if (ip.includes(':') && !ip.startsWith('[')) ip = `[${ip}]`;
                            if (reqType === 'all' || reqType === lineType) validIPs.add(ip);
                        }
                    }
                } catch (e) { }
            }

            if (['all', '优选'].includes(reqType)) {
                try {
                    const res2 = await fetch('https://raw.githubusercontent.com/ZhiXuanWang/cf-speed-dns/refs/heads/main/ipTop10.html', { headers: { 'User-Agent': 'Mozilla/5.0' } });
                    if (res2.ok) {
                        const text2 = await res2.text(); const ipv4Regex = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;
                        const matched = text2.match(ipv4Regex) || []; matched.forEach(ip => { if (!ip.startsWith('10.') && !ip.startsWith('192.168.') && !ip.startsWith('127.')) validIPs.add(ip); });
                    }
                } catch (e) { }
            }
            const uniqueIPArray = Array.from(validIPs);
            for (let i = uniqueIPArray.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[uniqueIPArray[i], uniqueIPArray[j]] = [uniqueIPArray[j], uniqueIPArray[i]]; }
            return Response.json({ success: true, ips: uniqueIPArray.slice(0, 10), totalCount: uniqueIPArray.length });
        } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500 }); }
    }

    return null;
}
