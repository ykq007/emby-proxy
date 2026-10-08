// The page list. Imported by the server shell (to render the sidebar) and by the client router,
// so it must stay plain data with no imports.
export const NAV = [
    { group: '监控', pages: [
        { key: 'overview', label: '看板', phone: '看板' },
        { key: 'stats', label: '统计', phone: '统计' },
    ] },
    { group: '网络', pages: [
        { key: 'speed', label: '测速 & DNS', phone: '网络' },
        { key: 'cdn', label: '优选 CDN' },
        { key: 'redirect', label: '重定向白名单' },
    ] },
    { group: '配置', pages: [
        { key: 'nodes', label: '部署节点' },
        { key: 'global', label: '全局设置' },
        { key: 'viewers', label: '观看账号' },
        { key: 'tools', label: '工具箱' },
        { key: 'danger', label: '危险区', danger: true },
    ] },
];

export const PAGE_LIST = NAV.flatMap(g => g.pages.map(p => ({ ...p, group: g.group })));
export const DEFAULT_PAGE = 'overview';

// Hashes from the old console (#dest/tab) so bookmarks keep working.
const LEGACY = {
    monitor: 'overview', network: 'speed', config: 'nodes',
    'monitor/overview': 'overview', 'monitor/stats': 'stats',
    'network/speed': 'speed', 'network/cdn': 'cdn', 'network/redirect': 'redirect',
    'config/settings': 'nodes', 'config/global': 'global', 'config/viewers': 'viewers',
    'config/tools': 'tools', 'config/danger': 'danger',
};

// '#nodes/hk1' → { key: 'nodes', arg: 'hk1' }. Unknown keys fall back to the default page.
export function parseHash(hash) {
    const h = decodeURIComponent(String(hash || '').replace(/^#/, ''));
    if (LEGACY[h]) return { key: LEGACY[h], arg: '' };
    const [key, ...rest] = h.split('/');
    return PAGE_LIST.some(p => p.key === key) ? { key, arg: rest.join('/') } : { key: DEFAULT_PAGE, arg: '' };
}

export const pageFromHash = hash => parseHash(hash).key;

export const pageHash = (key, arg = '') => '#' + key + (arg ? '/' + encodeURIComponent(arg) : '');
