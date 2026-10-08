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

export function pageFromHash(hash) {
    const h = String(hash || '').replace(/^#/, '');
    if (PAGE_LIST.some(p => p.key === h)) return h;
    return LEGACY[h] || DEFAULT_PAGE;
}
