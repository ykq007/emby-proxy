// Page key to module. A page module exports mount(root, page) and may return a cleanup function.
// page is the NAV entry plus arg, the part after the slash in '#nodes/hk1'.
// Pages not listed here render the placeholder.
import * as placeholder from './pages/placeholder.js';

const PAGES = {};

export const pageModule = key => PAGES[key] || placeholder;
