// Tagged template that escapes every interpolated value. Nested html`` results and raw() pass
// through untouched; arrays are joined; null, undefined and false render as nothing.
class Safe {
    constructor(s) { this.s = s; }
    toString() { return this.s; }
}

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ENTITIES[c]);

const part = v => v instanceof Safe ? v.s
    : Array.isArray(v) ? v.map(part).join('')
        : v == null || v === false ? '' : esc(v);

export const html = (strings, ...values) =>
    new Safe(strings.reduce((out, s, i) => out + s + (i < values.length ? part(values[i]) : ''), ''));

export const raw = s => new Safe(String(s));

// Sets el's content from an html`` result, an array of them, or plain text (escaped).
export const render = (el, value) => { el.innerHTML = part(value); };
