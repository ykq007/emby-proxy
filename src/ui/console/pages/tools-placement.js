// The Worker placement picker's data. GET /api/placement answers { region } or { mode }; POST takes
// { placement: { region } | { mode } }. The picker state is { mode, region, custom }, where mode is
// 'smart', 'off', a provider key, or 'custom'.
const regions = (provider, list) => list.map(([code, label]) => ({ value: provider + ':' + code, label }));

export const REGIONS = {
    aws: regions('aws', [
        ['ap-east-1', '中国香港'], ['ap-northeast-1', '日本（东京）'], ['ap-northeast-3', '日本（大阪）'],
        ['ap-southeast-1', '新加坡'], ['ap-northeast-2', '韩国（首尔）'], ['us-west-1', '美国西部（加州）'],
        ['us-west-2', '美国西部（俄勒冈）'], ['us-east-1', '美国东部（弗吉尼亚）'], ['ap-southeast-2', '澳大利亚（悉尼）'],
        ['ap-south-1', '印度（孟买）'], ['eu-west-2', '英国（伦敦）'], ['eu-central-1', '德国（法兰克福）'],
    ]),
    gcp: regions('gcp', [
        ['asia-east1', '中国台湾（彰化）'], ['asia-east2', '中国香港'], ['asia-northeast1', '日本（东京）'],
        ['asia-northeast2', '日本（大阪）'], ['asia-northeast3', '韩国（首尔）'], ['asia-southeast1', '新加坡'],
        ['us-west2', '美国西部（洛杉矶）'], ['us-west1', '美国西部（俄勒冈）'], ['us-east4', '美国东部（弗吉尼亚）'],
        ['australia-southeast1', '澳大利亚（悉尼）'], ['europe-west2', '英国（伦敦）'], ['europe-west3', '德国（法兰克福）'],
    ]),
    azure: regions('azure', [
        ['eastasia', '中国香港（East Asia）'], ['southeastasia', '新加坡（Southeast Asia）'], ['japaneast', '日本东部（东京）'],
        ['japanwest', '日本西部（大阪）'], ['koreacentral', '韩国中部（首尔）'], ['westus', '美国西部（West US）'],
        ['eastus', '美国东部（East US）'], ['uksouth', '英国南部（伦敦）'], ['westeurope', '西欧（荷兰）'],
    ]),
};

export const MODES = [
    { value: 'smart', label: '智能调度（Smart Placement）' },
    { value: 'off', label: '边缘节点（默认，离访客近）' },
    { value: 'aws', label: 'AWS 机房' },
    { value: 'gcp', label: 'GCP 机房' },
    { value: 'azure', label: 'Azure 机房' },
    { value: 'custom', label: '手动输入区域代码' },
];

export function formFromPlacement(p) {
    if (!p?.region) return { mode: p?.mode === 'smart' ? 'smart' : 'off', region: '', custom: '' };
    const provider = p.region.split(':')[0];
    return REGIONS[provider]?.some(r => r.value === p.region)
        ? { mode: provider, region: p.region, custom: '' }
        : { mode: 'custom', region: '', custom: p.region };
}

export function placementBody({ mode, region, custom }) {
    if (REGIONS[mode]) return { placement: { region: region || REGIONS[mode][0].value } };
    if (mode === 'custom') {
        const code = custom.trim();
        return code ? { placement: { region: code } } : { error: '请填写区域代码，例如 gcp:asia-east2' };
    }
    return { placement: { mode: mode === 'smart' ? 'smart' : 'off' } };
}

export function placementLabel(form) {
    if (REGIONS[form.mode]) return REGIONS[form.mode].find(r => r.value === form.region)?.label || form.region;
    if (form.mode === 'custom') return form.custom;
    return form.mode === 'smart' ? '智能调度' : '边缘节点';
}
