// Page key to module. A page module exports mount(root, page) and may return a cleanup function.
// page is the NAV entry plus arg, the part after the slash in '#nodes/hk1'.
// Pages not listed here render the placeholder.
import * as placeholder from './pages/placeholder.js';
import * as danger from './pages/danger.js';
import * as global from './pages/global.js';
import * as nodes from './pages/nodes.js';
import * as overview from './pages/overview.js';
import * as stats from './pages/stats.js';
import * as tools from './pages/tools.js';
import * as viewers from './pages/viewers.js';

const PAGES = {
    danger,
    global,
    nodes,
    overview,
    stats,
    tools,
    viewers,
};

export const pageModule = key => PAGES[key] || placeholder;
