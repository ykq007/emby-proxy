// I8: /start /help first — users see these immediately when opening / menu
export const BOT_COMMANDS = [
    { command: 'start',     description: '👋 开始使用' },
    { command: 'help',      description: '📖 命令帮助' },
    { command: 'status',    description: '📊 节点在线状态速览' },
    { command: 'stats',     description: '📈 今日播放与流量统计' },
    { command: 'keepalive', description: '⏰ 保号剩余时间' },
    { command: 'node',      description: '🔍 查询节点详情（如 /node emby1）' },
    { command: 'list',      description: '📋 所有节点列表' },
    { command: 'mute',      description: '🔇 静音告警（如 /mute 30m）' },
    { command: 'unmute',    description: '🔔 恢复告警' },
];

export function renderHelp() {
    const lines = [];

    lines.push('📖 <b>命令帮助</b>');
    lines.push('');

    lines.push('━━━ 📊 <b>状态监控</b> ━━━');
    lines.push('<code>/status</code> — 节点在线状态速览');
    lines.push('<code>/stats</code> — 今日播放与流量统计');
    lines.push('<code>/keepalive</code> — 保号剩余时间列表');
    lines.push('');

    lines.push('━━━ 🔍 <b>节点</b> ━━━');
    lines.push('<code>/node &lt;名称&gt;</code> — 查询节点详情');
    lines.push('  <i>例：</i><code>/node emby1</code>');
    lines.push('<code>/list</code> — 所有节点列表');
    lines.push('');

    lines.push('━━━ 🔔 <b>告警配置</b> ━━━');
    lines.push('<code>/mute &lt;时长&gt;</code> — 静音告警');
    lines.push('  <i>例：</i><code>/mute 30m</code>　<code>/mute 2h</code>　<code>/mute 1d</code>');
    lines.push('<code>/unmute</code> — 恢复告警推送');
    lines.push('');

    lines.push('━━━ 📖 <b>帮助</b> ━━━');
    lines.push('<code>/help</code> — 显示此帮助');
    lines.push('<code>/start</code> — 欢迎页');

    return lines.join('\n');
}

export function renderStart() {
    const lines = [];

    lines.push('👋 <b>欢迎使用 Emby 节点监控机器人！</b>');
    lines.push('');
    lines.push('我可以帮你实时监控节点状态、查看播放统计、管理保号提醒和告警通知。');
    lines.push('');
    lines.push('输入 <code>/help</code> 查看所有可用命令，');
    lines.push('或点击底部菜单快速操作。');

    return lines.join('\n');
}
