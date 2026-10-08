// Page key to module. A page module exports mount(root, page) and may return a cleanup function.
// page is the NAV entry plus arg, the part after the slash in '#nodes/hk1'.
// Pages not listed here render the placeholder.
import * as placeholder from './pages/placeholder.js';
import * as cdn from './pages/cdn.js';
import * as danger from './pages/danger.js';
import * as global from './pages/global.js';
import * as nodes from './pages/nodes.js';
import * as overview from './pages/overview.js';
import * as redirect from './pages/redirect.js';
import * as speed from './pages/speed.js';
import * as stats from './pages/stats.js';
import * as tools from './pages/tools.js';
import * as viewers from './pages/viewers.js';

const PAGES = {
    cdn,
    danger,
    global,
    nodes,
    overview,
    redirect,
    speed,
    stats,
    tools,
    viewers,
};

export const pageModule = key => PAGES[key] || placeholder;
