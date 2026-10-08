// Page key to module. A page module exports mount(root, page) and may return a cleanup function.
// Pages not listed here render the placeholder.
import * as placeholder from './pages/placeholder.js';

const PAGES = {};

export const pageModule = key => PAGES[key] || placeholder;
