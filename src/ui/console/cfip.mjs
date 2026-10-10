function word_to_u32(w) {
  let x = 0;
  for (let i = 0; w.$ === "WCon"; i++) {
    x |= Number(w.head) << i;
    w = w.tail;
  }
  return x >>> 0;
}

function u32_to_word(x) {
  let w = {$: "WNil"};
  for (let i = 31; i >= 0; i--) {
    w = {$: "WCon", head: ((x >>> i) & 1) === 1, tail: w};
  }
  return w;
}

function cmp_new(a, b) {
  return {$: a < b ? "LT"
    : a === b ? "EQ" : "GT"};
}

function nat_divmod(a, b) {
  return b === 0 ? {$: "Tuple", fst: 0, snd: a}
    : {$: "Tuple", fst: Math.trunc(a / b), snd: a % b};
}

function nat_chk(n) {
  if (n > 281474976710655) {
    throw "bend: a Nat past the largest immediate 2^48-1";
  }
  return n;
}

function nat_host(n) {
  const int = typeof n === "bigint" || Number.isInteger(n);
  if (int && n >= 0 && n <= 2 ** 53) {
    return Number(n);
  }
  return { [Symbol.toPrimitive]() { throw "bend: a Nat past the largest immediate 2^48-1"; } };
}

function f32_show(x) {
  if (x !== x) {
    return "nan";
  }
  if (!Number.isFinite(x) || Object.is(x, -0)) {
    return x < 0 ? "-inf"
      : x === 0 ? "-0" : "inf";
  }
  let s = "x";
  for (let p = 1; p <= 9 && f32_round(s) !== x; p += 1) {
    s = String(Number(x.toExponential(p - 1)));
  }
  return s;
}

function f32_bits(x) {
  return new Uint32Array(new Float32Array([x]).buffer)[0];
}

function f32_from_bits(u) {
  return new Float32Array(new Uint32Array([u]).buffer)[0];
}

function f32_read(s) {
  const re = /^[\t\n\v\f\r ]*[+-]?((\d+\.?\d*|\.\d+)(e[+-]?\d+)?|inf(inity)?|nan)$/i;
  const v = f32_round(s.replace(/inf\w*/i, "Infinity"));
  return re.test(s) ? {$: "Some", value: v} : {$: "None"};
}

const f32_round = function f32_round(s) {
  const d = Number(s);
  const a = Math.abs(d);
  const f = Math.fround(a);
  const g = 2 * a - Math.min(f, 2 ** 128);
  if (g === f || Math.fround(g) !== g || g === Infinity) {
    return Math.sign(d) * f;
  }
  let k = 0;
  while (a * 2 ** k % 1 !== 0) {
    k += 1;
  }
  const [, i, r, e] = /(\d*)\.?(\d*)(?:e([+-]?\d+))?$/i.exec(s);
  const n = Number(e ?? 0) - r.length;
  const x = BigInt(i + r) * 2n ** BigInt(k) * 10n ** BigInt(Math.max(n, 0));
  const y = BigInt(a * 2 ** k) * 10n ** BigInt(Math.max(-n, 0));
  return Math.sign(d) * (x === y || x > y !== g > f ? f : g);
};

function char_new(code) {
  if (code > 0x10FFFF || (code >= 0xD800 && code <= 0xDFFF)) {
    throw "bend: " + code + " is not a Unicode scalar value";
  }
  return String.fromCodePoint(code);
}

// Array
// =====

function array_new(d, v) {
  if (d > 31) {
    throw "bend: an array past the deepest block class 31";
  }
  return Array(2 ** d).fill(v);
}

function array_node(a, b) {
  if (a.length !== b.length) {
    throw "bend: runtime fail-stop";
  }
  return a.concat(b);
}

function array_rmw(a, i, f) {
  const at = i % a.length;
  const old = a[at];
  a[at] = f(old);
  return {$: "Tuple", fst: a, snd: old};
}

// Run
// ===

function run_tail(f, x) {
  return {$: "$JMP", f: f.j?.f === f ? f.j : f, x};
}

function run_clo(j) {
  const f = (x) => run_loop(j(x));
  f.j = j;
  j.f = f;
  return f;
}

function run_loop(r) {
  while (r !== null && typeof r === "object" && r.$ === "$JMP") {
    r = r.f(r.x);
  }
  return r;
}

function run_lib(f, n) {
  return (...a) => a.length < n ? run_lib((...b) => f(...a, ...b), n - a.length)
    : f(...a);
}

// Effect
// ======

const $0eff = Object.create(null);

function io_eff(k, run) {
  if (arguments.length > 2) {
    throw new Error("bend: " + k + " takes no need: an effect that waits parks itself");
  }
  if (k in $0eff) {
    throw new Error("bend: two effects register " + k);
  }
  $0eff[k] = run;
}
// Program
// =======

function $bits$(_w_0, _x_0) {
  if (_w_0 === 0) {
    return {$: "Nil"};
  } else {
    const _p_0 = (_w_0 - 1);
    const _x_1 = (_p_0 >= 32 ? 0 : (_x_0 >>> _p_0) >>> 0);
    const _x_2 = ((_x_1 & 1) >>> 0);
    return {$: "Con", "head": (_x_2 === 1), "tail": ($bits$(_p_0, _x_0))};
  }
}

function $addr_bits$(_ip_0) {
  if (_ip_0.$ === "V4") {
    const _a_0 = _ip_0["a"];
    const _b_0 = _ip_0["b"];
    const _c_0 = _ip_0["c"];
    const _d_0 = _ip_0["d"];
    return $List$concat$({$: "Con", "head": {$: "Con", "head": false, "tail": {$: "Nil"}}, "tail": {$: "Con", "head": ($bits$(8, _a_0)), "tail": {$: "Con", "head": ($bits$(8, _b_0)), "tail": {$: "Con", "head": ($bits$(8, _c_0)), "tail": {$: "Con", "head": ($bits$(8, _d_0)), "tail": {$: "Nil"}}}}}});
  } else {
    const _a_1 = _ip_0["a"];
    const _b_1 = _ip_0["b"];
    const _c_1 = _ip_0["c"];
    const _d_1 = _ip_0["d"];
    const _e_0 = _ip_0["e"];
    const _f_0 = _ip_0["f"];
    const _g_0 = _ip_0["g"];
    const _h_0 = _ip_0["h"];
    return $List$concat$({$: "Con", "head": {$: "Con", "head": true, "tail": {$: "Nil"}}, "tail": {$: "Con", "head": ($bits$(16, _a_1)), "tail": {$: "Con", "head": ($bits$(16, _b_1)), "tail": {$: "Con", "head": ($bits$(16, _c_1)), "tail": {$: "Con", "head": ($bits$(16, _d_1)), "tail": {$: "Con", "head": ($bits$(16, _e_0)), "tail": {$: "Con", "head": ($bits$(16, _f_0)), "tail": {$: "Con", "head": ($bits$(16, _g_0)), "tail": {$: "Con", "head": ($bits$(16, _h_0)), "tail": {$: "Nil"}}}}}}}}}});
  }
}

function $same$(_a_0, _b_0) {
  if (_a_0) {
    if (_b_0) {
      return true;
    } else {
      return false;
    }
  } else {
    if (!_b_0) {
      return true;
    } else {
      return false;
    }
  }
}

function $prefix_eq$(_n_0, _xs_0, _ys_0) {
  if (_n_0 === 0) {
    return true;
  } else {
    const _p_0 = (_n_0 - 1);
    if (_xs_0.$ === "Con") {
      const _x_0 = _xs_0["head"];
      const _xt_0 = _xs_0["tail"];
      if (_ys_0.$ === "Con") {
        const _y_0 = _ys_0["head"];
        const _yt_0 = _ys_0["tail"];
        return $Bool$and$(($same$(_x_0, _y_0)), ($prefix_eq$(_p_0, _xt_0, _yt_0)));
      } else {
        return false;
      }
    } else {
      return false;
    }
  }
}

function $in_range$(_r_0, _ip_0) {
  const _base_0 = _r_0["base"];
  const _len_0 = _r_0["len"];
  return $prefix_eq$(nat_chk(_len_0 + 1), ($addr_bits$(_base_0)), ($addr_bits$(_ip_0)));
}

function $ranges$() {
  return {$: "Con", "head": {$: "Range", "base": {$: "V4", "a": 173, "b": 245, "c": 48, "d": 0}, "len": 20}, "tail": {$: "Con", "head": {$: "Range", "base": {$: "V4", "a": 103, "b": 21, "c": 244, "d": 0}, "len": 22}, "tail": {$: "Con", "head": {$: "Range", "base": {$: "V4", "a": 103, "b": 22, "c": 200, "d": 0}, "len": 22}, "tail": {$: "Con", "head": {$: "Range", "base": {$: "V4", "a": 103, "b": 31, "c": 4, "d": 0}, "len": 22}, "tail": {$: "Con", "head": {$: "Range", "base": {$: "V4", "a": 141, "b": 101, "c": 64, "d": 0}, "len": 18}, "tail": {$: "Con", "head": {$: "Range", "base": {$: "V4", "a": 108, "b": 162, "c": 192, "d": 0}, "len": 18}, "tail": {$: "Con", "head": {$: "Range", "base": {$: "V4", "a": 190, "b": 93, "c": 240, "d": 0}, "len": 20}, "tail": {$: "Con", "head": {$: "Range", "base": {$: "V4", "a": 188, "b": 114, "c": 96, "d": 0}, "len": 20}, "tail": {$: "Con", "head": {$: "Range", "base": {$: "V4", "a": 197, "b": 234, "c": 240, "d": 0}, "len": 22}, "tail": {$: "Con", "head": {$: "Range", "base": {$: "V4", "a": 198, "b": 41, "c": 128, "d": 0}, "len": 17}, "tail": {$: "Con", "head": {$: "Range", "base": {$: "V4", "a": 162, "b": 158, "c": 0, "d": 0}, "len": 15}, "tail": {$: "Con", "head": {$: "Range", "base": {$: "V4", "a": 104, "b": 16, "c": 0, "d": 0}, "len": 13}, "tail": {$: "Con", "head": {$: "Range", "base": {$: "V4", "a": 104, "b": 24, "c": 0, "d": 0}, "len": 14}, "tail": {$: "Con", "head": {$: "Range", "base": {$: "V4", "a": 172, "b": 64, "c": 0, "d": 0}, "len": 13}, "tail": {$: "Con", "head": {$: "Range", "base": {$: "V4", "a": 131, "b": 0, "c": 72, "d": 0}, "len": 22}, "tail": {$: "Con", "head": {$: "Range", "base": {$: "V6", "a": 9216, "b": 51968, "c": 0, "d": 0, "e": 0, "f": 0, "g": 0, "h": 0}, "len": 32}, "tail": {$: "Con", "head": {$: "Range", "base": {$: "V6", "a": 9734, "b": 18176, "c": 0, "d": 0, "e": 0, "f": 0, "g": 0, "h": 0}, "len": 32}, "tail": {$: "Con", "head": {$: "Range", "base": {$: "V6", "a": 10243, "b": 63488, "c": 0, "d": 0, "e": 0, "f": 0, "g": 0, "h": 0}, "len": 32}, "tail": {$: "Con", "head": {$: "Range", "base": {$: "V6", "a": 9221, "b": 46336, "c": 0, "d": 0, "e": 0, "f": 0, "g": 0, "h": 0}, "len": 32}, "tail": {$: "Con", "head": {$: "Range", "base": {$: "V6", "a": 9221, "b": 33024, "c": 0, "d": 0, "e": 0, "f": 0, "g": 0, "h": 0}, "len": 32}, "tail": {$: "Con", "head": {$: "Range", "base": {$: "V6", "a": 10758, "b": 39104, "c": 0, "d": 0, "e": 0, "f": 0, "g": 0, "h": 0}, "len": 29}, "tail": {$: "Con", "head": {$: "Range", "base": {$: "V6", "a": 11279, "b": 62024, "c": 0, "d": 0, "e": 0, "f": 0, "g": 0, "h": 0}, "len": 32}, "tail": {$: "Nil"}}}}}}}}}}}}}}}}}}}}}}};
}

function $in_any$(_rs_0, _ip_0) {
  if (_rs_0.$ === "Nil") {
    return false;
  } else {
    const _r_0 = _rs_0["head"];
    const _rt_0 = _rs_0["tail"];
    const _x_0 = ($in_range$(_r_0, _ip_0));
    const _x_1 = ($in_any$(_rt_0, _ip_0));
    return (_x_0 || _x_1);
  }
}

function $is_cf$(_ip_0) {
  return $in_any$(($ranges$()), _ip_0);
}

function $all_cf$(_ips_0) {
  if (_ips_0.$ === "Nil") {
    return true;
  } else {
    const _h_0 = _ips_0["head"];
    const _t_0 = _ips_0["tail"];
    return $Bool$and$(($is_cf$(_h_0)), ($all_cf$(_t_0)));
  }
}

function $pick$(_on_0) {
  if (_on_0) {
    return {$: "OnCloudflare"};
  } else {
    return {$: "OffCloudflare"};
  }
}

function $verdict$(_ips_0) {
  if (_ips_0.$ === "Nil") {
    return {$: "Unresolved"};
  } else {
    const __0 = _ips_0["head"];
    const __1 = _ips_0["tail"];
    return $pick$(($all_cf$({$: "Con", "head": __0, "tail": __1})));
  }
}

function $List$concat$(_xss_0) {
  if (_xss_0.$ === "Nil") {
    return {$: "Nil"};
  } else {
    const _h_0 = _xss_0["head"];
    const _t_0 = _xss_0["tail"];
    return $List$append$(_h_0, ($List$concat$(_t_0)));
  }
}

function $Bool$and$(_a_0, _b_0) {
  if (!_a_0) {
    return false;
  } else {
    return _b_0;
  }
}

function $List$append$(_xs_0, _ys_0) {
  if (_xs_0.$ === "Nil") {
    return _ys_0;
  } else {
    const _h_0 = _xs_0["head"];
    const _t_0 = _xs_0["tail"];
    return {$: "Con", "head": _h_0, "tail": ($List$append$(_t_0, _ys_0))};
  }
}

function $0m0(v) {
  const top = [v];
  for (let at = top, key = 0;;) {
    switch (v.$) {
      case "Range": at = at[key] = {...v, "len": nat_host(v["len"])}; return top[0];
      default: throw "bend: Range has no tag " + v?.$ + " (its tags: Range); a tag names its constructor as the"
      + " loading file sees it, which a later version will make the same"
      + " everywhere (#1105)";
    }
  }
}

function $0m1(v) {
  const top = [v];
  for (let at = top, key = 0;;) {
    switch (v.$) {
      case "Range": at = at[key] = {...v, "len": BigInt(v["len"])}; return top[0];
      default: throw "bend: Range has no tag " + v?.$ + " (its tags: Range); a tag names its constructor as the"
      + " loading file sees it, which a later version will make the same"
      + " everywhere (#1105)";
    }
  }
}

function $0m2(v) {
  const top = [v];
  for (let at = top, key = 0;;) {
    switch (v.$) {
      case "Nil": at[key] = v; return top[0];
      case "Con": at = at[key] = {...v, "head": $0m1(v["head"])}; key = "tail"; v = v[key]; continue;
      default: throw "bend: List has no tag " + v?.$ + " (its tags: Nil, Con); a tag names its constructor as the"
      + " loading file sees it, which a later version will make the same"
      + " everywhere (#1105)";
    }
  }
}

function $0m3(v) {
  const top = [v];
  for (let at = top, key = 0;;) {
    switch (v.$) {
      case "Nil": at[key] = v; return top[0];
      case "Con": at = at[key] = {...v, "head": $0m0(v["head"])}; key = "tail"; v = v[key]; continue;
      default: throw "bend: List has no tag " + v?.$ + " (its tags: Nil, Con); a tag names its constructor as the"
      + " loading file sees it, which a later version will make the same"
      + " everywhere (#1105)";
    }
  }
}
export default {
  "bits": run_lib((a0, a1) => { const r = (run_loop($bits$(nat_host(a0), (a1)))); BigInt(a0); (a1); return r; }, 2),
  "addr_bits": run_lib((a0) => { const r = (run_loop($addr_bits$((a0)))); (a0); return r; }, 1),
  "same": run_lib((a0, a1) => { const r = (run_loop($same$((a0), (a1)))); (a0); (a1); return r; }, 2),
  "prefix_eq": run_lib((a0, a1, a2) => { const r = (run_loop($prefix_eq$(nat_host(a0), (a1), (a2)))); BigInt(a0); (a1); (a2); return r; }, 3),
  "in_range": run_lib((a0, a1) => { const r = (run_loop($in_range$($0m0(a0), (a1)))); $0m1(a0); (a1); return r; }, 2),
  "ranges": run_lib(() => { const r = $0m2(run_loop($ranges$()));  return r; }, 0),
  "in_any": run_lib((a0, a1) => { const r = (run_loop($in_any$($0m3(a0), (a1)))); $0m2(a0); (a1); return r; }, 2),
  "is_cf": run_lib((a0) => { const r = (run_loop($is_cf$((a0)))); (a0); return r; }, 1),
  "all_cf": run_lib((a0) => { const r = (run_loop($all_cf$((a0)))); (a0); return r; }, 1),
  "pick": run_lib((a0) => { const r = (run_loop($pick$((a0)))); (a0); return r; }, 1),
  "verdict": run_lib((a0) => { const r = (run_loop($verdict$((a0)))); (a0); return r; }, 1),
};
