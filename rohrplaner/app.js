/* Rohrplaner – Hauptlogik (kein Build-Schritt, reines JS) */
(function () {
'use strict';
const { CATEGORIES, PARTS, ZOLL } = window.RP_DATA;
const DEF = Object.fromEntries(PARTS.map((p) => [p.id, p]));
const C = 40;              // Pixel je Rasterfeld
const CM = 10;             // cm je Rasterfeld
const OUT = '#2b3340';
const MAT = {
  mv: { fill: '#f3f5f8', hl: '#ffffff' }, cu: { fill: '#d27b40', hl: '#f3b384' },
  st: { fill: '#aeb6bf', hl: '#e2e6ea' }, ms: { fill: '#e6c14a', hl: '#fbeaa6' },
  mvp: { fill: '#e6c14a', hl: '#fbeaa6' }, cup: { fill: '#c9743c', hl: '#eeaa78' },
  tg: { fill: '#b8c0c8', hl: '#e6e9ed' }, vc: { fill: '#dfe4ea', hl: '#ffffff' }, es: { fill: '#d5dae0', hl: '#f4f6f8' },
  wh: { fill: '#f6f7f9', hl: '#ffffff' }, rd: { fill: '#d6402f', hl: '#f08a80' },
};

/* ------------------------------------------------------------------ i18n */
const I18N = window.RP_I18N;
let lang = localStorage.getItem('rp_lang') || 'de';
const t = (k, v) => { let s = (I18N[lang][k] ?? I18N.de[k] ?? k); if (v) for (const x in v) s = s.split('{' + x + '}').join(v[x]); return s; };
const nm = (def) => def[lang] || def.de;
const tx = (o) => (o ? (o[lang] || o.de) : '');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ------------------------------------------------------------------ Geometrie */
const tf = (x, y, rot, flip) => { if (flip) y = -y; for (let i = 0; i < rot; i++) [x, y] = [-y, x]; return [x + 0, y + 0]; };
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const snap5 = (v) => Math.round(v * 2) / 2;
const sysName = (s) => (/^(MV|CU|ES)/.test(s) ? s.slice(0, 2) + ' ' + s.slice(2) : s);
const zoll = (s) => ZOLL[s] || s;
function fmtPort(tp) {
  if (tp.k === 'pipe') return (lang === 'de' ? 'Rohr ' : 'pipe ') + sysName(tp.s);
  if (tp.k === 'sock') return sysName(tp.s) + ' ' + ({ Press: 'Press', Schraub: lang === 'de' ? 'Schraub' : 'compr.', Klemm: lang === 'de' ? 'Klemm' : 'compr.', 'Löt': lang === 'de' ? 'Löt' : 'solder', Steck: lang === 'de' ? 'Steck' : 'push-fit' }[tp.tech] || tp.tech);
  return zoll(tp.s) + ' ' + (tp.k === 'ig' ? (lang === 'de' ? 'IG' : 'F') : (lang === 'de' ? 'AG' : 'M'));
}
function portsOf(o) {
  const def = DEF[o.pid];
  if (o.type === 'pipe') {
    const L = dist(o.a, o.b) || 1e-9, u = [(o.b[0] - o.a[0]) / L, (o.b[1] - o.a[1]) / L];
    return [{ obj: o, idx: 0, pos: o.a.slice(), d: [-u[0], -u[1]], t: def.ports[0].t },
            { obj: o, idx: 1, pos: o.b.slice(), d: u, t: def.ports[1].t }];
  }
  return def.ports.map((p, i) => {
    const [x, y] = tf(p.x, p.y, o.rot, o.flip), d = tf(p.d[0], p.d[1], o.rot, o.flip);
    return { obj: o, idx: i, pos: [o.x + x, o.y + y], d, t: p.t, n: p.n };
  });
}
function compat(a, b) {
  const bad = (k, v) => ({ ok: false, msg: t(k, v) });
  const thr = (k) => k === 'ig' || k === 'ag';
  if (a.k === 'pipe' && b.k === 'pipe') return bad('pipePipe');
  if (a.k === 'sock' && b.k === 'sock') return bad('sockSock');
  if ((a.k === 'pipe' && b.k === 'sock') || (a.k === 'sock' && b.k === 'pipe')) {
    const p = a.k === 'pipe' ? a : b, s = a.k === 'pipe' ? b : a;
    if (p.s === s.s) return { ok: true };
    const v = { a: fmtPort(p), b: fmtPort(s) };
    return p.s.slice(0, 2) !== s.s.slice(0, 2) ? bad('sysMismatch', v) : bad('sizeMismatch', v);
  }
  if (thr(a.k) && thr(b.k)) {
    if (a.k === b.k) return bad(a.k === 'ag' ? 'agag' : 'igig', { s: a.s === b.s ? zoll(a.s) : zoll(a.s) + ' / ' + zoll(b.s) });
    const m = a.k === 'ag' ? a : b, f = a.k === 'ag' ? b : a;
    if (m.s !== f.s) return bad('thrSize', { a: zoll(m.s), b: zoll(f.s) });
    return { ok: true };
  }
  return bad('thrPipe', { a: fmtPort(thr(a.k) ? b : a) });
}
const key = (p) => Math.round(p[0] * 200) + ',' + Math.round(p[1] * 200);
function analyze(items, excludeId) {
  const all = [], buckets = new Map();
  items.forEach((o) => { if (o.id === excludeId) return; portsOf(o).forEach((p) => { all.push(p); const k = key(p.pos); (buckets.get(k) || buckets.set(k, []).get(k)).push(p); }); });
  const status = new Map(), conns = [];
  for (const arr of buckets.values()) {
    if (arr.length === 1) { status.set(arr[0].obj.id + ':' + arr[0].idx, { s: 'free' }); continue; }
    if (arr.length > 2) { arr.forEach((p) => status.set(p.obj.id + ':' + p.idx, { s: 'bad', msg: t('multi') })); conns.push({ p1: arr[0], p2: arr[1], ok: false, msg: t('multi') }); continue; }
    const [p1, p2] = arr;
    let r = compat(p1.t, p2.t);
    if (r.ok && p1.d[0] * p2.d[0] + p1.d[1] * p2.d[1] > -0.98) r = { ok: false, msg: t('dirMismatch') };
    conns.push({ p1, p2, ok: r.ok, msg: r.msg });
    [p1, p2].forEach((p) => status.set(p.obj.id + ':' + p.idx, { s: r.ok ? 'ok' : 'bad', msg: r.msg, other: p === p1 ? p2 : p1 }));
  }
  const free = all.filter((p) => status.get(p.obj.id + ':' + p.idx).s === 'free');
  return { all, status, conns, free };
}

/* ------------------------------------------------------------------ Piktogramme */
const BW = { MV16: 10, MV20: 12, MV26: 15, MV32: 18, CU15: 9, CU18: 11, CU22: 13, CU28: 16, ES15: 9, ES18: 11, ES22: 13, ES28: 16, '3/8': 8, '1/2': 12, '3/4': 15, '1': 18 };
const bw = (s) => BW[s] || 12;
const f1 = (n) => +n.toFixed(2);
const rect = (x, y, w, h, fill, rx = 2, extra = '') => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${rx}" fill="${fill}" stroke="${OUT}" stroke-width="2" ${extra}/>`;
const ln = (x1, y1, x2, y2, col, w, extra = '') => `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${col}" stroke-width="${f1(w)}" ${extra}/>`;
function tubes(segs, M, hubR) {
  let o = '', f = '', h = '';
  segs.forEach((s) => {
    o += ln(s[0], s[1], s[2], s[3], OUT, s[4] + 4);
    f += ln(s[0], s[1], s[2], s[3], M.fill, s[4]);
    const L = Math.hypot(s[2] - s[0], s[3] - s[1]); if (L < 6) return;
    const ux = (s[2] - s[0]) / L, uy = (s[3] - s[1]) / L, off = -s[4] * 0.22;
    h += ln(s[0] + ux * 3 - uy * off, s[1] + uy * 3 + ux * off, s[2] - ux * 3 - uy * off, s[3] - uy * 3 + ux * off, M.hl, Math.max(1.4, s[4] * 0.2), 'stroke-linecap="round" opacity=".75"');
  });
  if (hubR) { o += `<circle r="${hubR / 2 + 2}" fill="${OUT}"/>`; f += `<circle r="${hubR / 2}" fill="${M.fill}"/>`; }
  return o + f + h;
}
function deco(tp, matKey) {
  const w = bw(tp.s), M = MAT[matKey] || MAT.ms;
  if (tp.k === 'sock') {
    if (tp.tech === 'Löt') return rect(-8, -(w / 2 + 2.5), 8, w + 5, M.fill, 1.5);
    if (tp.tech === 'Steck') return rect(-12, -(w / 2 + 5), 12, w + 10, MAT.ms.fill, 2) + rect(-5, -(w / 2 + 6), 5, w + 12, '#3b4652', 1.5);
    if (tp.tech === 'Press' && matKey === 'es') return rect(-10, -(w / 2 + 3), 10, w + 6, M.fill) + ln(-5, -(w / 2 + 3), -5, w / 2 + 3, '#6b7480', 2.2);
    if (tp.tech === 'Press' && matKey === 'cup') return rect(-10, -(w / 2 + 3), 10, w + 6, M.fill) + ln(-5, -(w / 2 + 3), -5, w / 2 + 3, '#7b3f17', 2.2);
    if (tp.tech === 'Press') return rect(-11, -(w / 2 + 5), 11, w + 10, '#cdd3da') + rect(-7.5, -2.5, 3.5, 5, '#5b6675', 1, 'stroke-width="0"');
    return rect(-13, -(w / 2 + 6), 13, w + 12, MAT.ms.fill, 3) + ln(-9, -(w / 2 + 5), -9, w / 2 + 5, OUT, 1, 'opacity=".45"') + ln(-4, -(w / 2 + 5), -4, w / 2 + 5, OUT, 1, 'opacity=".45"');
  }
  if (tp.k === 'ig') {
    // Innengewinde: breiter Kragen, dunkle Stirnfläche, Gewindegänge innen
    let s = rect(-8, -(w / 2 + 5), 8, w + 10, M.fill, 2, 'stroke-width="2.2"') + ln(-1.5, -(w / 2 + 3.5), -1.5, w / 2 + 3.5, OUT, 2.4);
    s += ln(-5, -(w / 2 + 2), -5, w / 2 + 2, OUT, 1.1, 'opacity=".6" stroke-dasharray="2 1.6"');
    return s;
  }
  if (tp.k === 'ag') {
    // Außengewinde: schmaler Zapfen mit kräftiger Schraffur
    let s = rect(-8, -(w / 2 - 1), 8, w - 2, M.hl, 1, 'stroke-width="1.8"');
    for (let x = -6.5; x <= 0; x += 2.6) s += ln(x + 1.6, -(w / 2 - 0.8), x - 1.2, w / 2 - 0.8, OUT, 1.3, 'opacity=".8"');
    return s;
  }
  return '';
}
const decoAt = (p, matKey) => `<g transform="translate(${f1(p.x * C)},${f1(p.y * C)}) rotate(${f1(Math.atan2(p.d[1], p.d[0]) * 180 / Math.PI)})">${deco(p.t, matKey)}</g>`;
/* Fittinge (Winkel, Bögen, T-Stücke, Nippel, Muffen, Übergänge, Reduzierungen) – deutlich, nicht maßstäblich */
const FW = (s) => bw(s) + 3;
function tubePath(d, w, M, join = 'miter') {
  return { o: `<path d="${d}" fill="none" stroke="${OUT}" stroke-width="${f1(w + 5)}" stroke-linejoin="${join}" stroke-miterlimit="4"/>`,
    f: `<path d="${d}" fill="none" stroke="${M.fill}" stroke-width="${f1(w)}" stroke-linejoin="${join}" stroke-miterlimit="4"/>`,
    h: `<path d="${d}" fill="none" stroke="${M.hl}" stroke-width="${f1(Math.max(2, w * 0.22))}" stroke-linejoin="${join}" opacity=".85" transform="translate(${f1(-w * 0.18)},${f1(-w * 0.18)})"/>` };
}
function hexNut(x, h, M) {
  // Sechskant in Seitenansicht: angefaste Kontur + zwei Kanten
  const a = 6.5, c = 2.2, y = h / 2;
  return `<path d="M${x - a} ${-y + c}L${x - a + c} ${-y}H${x + a - c}L${x + a} ${-y + c}V${y - c}L${x + a - c} ${y}H${x - a + c}L${x - a} ${y - c}Z" fill="${M.fill}" stroke="${OUT}" stroke-width="2.4"/>`
    + ln(x - 3, -y + 1, x - 3, y - 1, OUT, 1.4, 'opacity=".7"') + ln(x + 3, -y + 1, x + 3, y - 1, OUT, 1.4, 'opacity=".7"')
    + ln(x - a + 2, -y + 3, x - 3.8, -y + 3, M.hl, 2, 'opacity=".9"');
}
function drawFit(def, M) {
  const ps = def.ports, n = ps.length, P = (p) => [f1(p.x * C), f1(p.y * C)];
  const ws = ps.map((p) => FW(p.t.s)), wmax = Math.max(...ws);
  const thrd = (p) => p.t.k === 'ig' || p.t.k === 'ag';
  let s = '';
  if (n === 2 && Math.abs(ps[0].d[0] * ps[1].d[0] + ps[0].d[1] * ps[1].d[1] + 1) < 0.02) {
    // gerade Teile (liegen immer waagrecht -x … +x)
    const [l, r] = ps[0].x < ps[1].x ? [0, 1] : [1, 0], xl = ps[l].x * C, xr = ps[r].x * C;
    const a = ws[l] / 2, b = ws[r] / 2;
    if (a !== b) {
      // Reduzierung: sichtbarer Konus zwischen zwei Größen
      s += `<path d="M${xl} ${-a}H-5L5 ${-b}H${xr}V${b}H5L-5 ${a}H${xl}Z" fill="${M.fill}" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/>`
        + `<path d="M${xl + 2} ${-a + 2.5}H-5.5L4.5 ${-b + 2.5}H${xr - 2}" fill="none" stroke="${M.hl}" stroke-width="2" opacity=".9"/>`
        + ln(-5, -a + 1, -5, a - 1, OUT, 1.2, 'opacity=".5"') + ln(5, -b + 1, 5, b - 1, OUT, 1.2, 'opacity=".5"');
    } else {
      s += rect(xl, -a, xr - xl, 2 * a, M.fill, 1.5, 'stroke-width="2.4"') + ln(xl + 2, -a + 2.5, xr - 2, -a + 2.5, M.hl, 2, 'opacity=".9"');
      if (!def.hex && !/-ln-/.test(def.id) && !(thrd(ps[0]) !== thrd(ps[1]))) s += rect(-3, -a - 2.5, 6, 2 * a + 5, M.fill, 1.5, 'stroke-width="2"'); // Muffe/Kupplung: Mittelwulst
    }
    if (def.hex || thrd(ps[0]) !== thrd(ps[1]) || ps.some((p) => p.t.k === 'sock') && ps.some(thrd)) s += hexNut(0, wmax + 8, M);
    if (/-ln-/.test(def.id)) s += ln(-6, 0, 6, 0, OUT, 1.4, 'opacity=".6"') + `<path d="M-6 -3L-9 0L-6 3M6 -3L9 0L6 3" fill="none" stroke="${OUT}" stroke-width="1.4" opacity=".6"/>`;
    return s;
  }
  // Winkel / Bögen / T-Stücke: kräftiger gebogener bzw. T-förmiger Körper
  const segs = ps.map((p) => `M${P(p).join(' ')}L0 0`);
  if (n === 2) {
    const bend45 = Math.abs(ps[0].d[0] * ps[1].d[0] + ps[0].d[1] * ps[1].d[1]) > 0.3, r = bend45 ? 6 : 11;
    const [ax, ay] = P(ps[0]), [bx, by] = P(ps[1]);
    const d = `M${ax} ${ay}L${f1(ps[0].d[0] * r)} ${f1(ps[0].d[1] * r)}Q0 0 ${f1(ps[1].d[0] * r)} ${f1(ps[1].d[1] * r)}L${bx} ${by}`;
    const T = tubePath(d, wmax, M, 'round');
    s += T.o + T.f + T.h;
  } else {
    const parts = segs.map((d, i) => tubePath(d, ws[i], M, 'miter'));
    s += parts.map((x) => x.o).join('') + `<rect x="${-wmax / 2 - 2.5}" y="${-wmax / 2 - 2.5}" width="${wmax + 5}" height="${wmax + 5}" fill="${OUT}"/>`
      + parts.map((x) => x.f).join('') + `<rect x="${-wmax / 2}" y="${-wmax / 2}" width="${wmax}" height="${wmax}" fill="${M.fill}"/>` + parts.map((x) => x.h).join('');
  }
  return s;
}
function drawPart(def) {
  const M = MAT[def.mat] || MAT.ms, ps = def.ports, sh = def.shape;
  const wmax = Math.max(...ps.map((p) => bw(p.t.s))) + 2;
  const decoMat = sh === 'hose' ? 'ms' : def.mat;
  const decos = () => ps.map((p) => decoAt(p, decoMat)).join('');
  const arms = () => ps.map((p) => [0, 0, p.x * C, p.y * C, bw(p.t.s) + 2]);
  let s = '';
  switch (sh) {
    case 'fit': if (!def.hexOld) { s += drawFit(def, M) + decos(); break; } // falls through
    case 'wall': {
      if (sh === 'wall') s += rect(-17, -17, 34, 34, '#e9edf2', 5) + [[11, 11], [11, -11], [-11, 11]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#fff" stroke="${OUT}" stroke-width="1.5"/>`).join('');
      const bent = ps.length > 2 || ps.some((p) => Math.abs(p.d[0]) < 0.99);
      s += tubes(arms(), M, bent ? wmax : 0);
      const mixed = ps.some((p) => p.t.k === 'sock') && ps.some((p) => p.t.k === 'ig' || p.t.k === 'ag');
      if (def.hex || (mixed && sh === 'fit')) s += rect(-6, -(wmax / 2 + 5), 12, wmax + 10, M.fill, 2) + ln(0, -(wmax / 2 + 4), 0, wmax / 2 + 4, OUT, 1, 'opacity=".4"');
      s += decos(); break;
    }
    case 'plug': { const w = bw(ps[0].t.s); s += tubes([[-20, 0, 2, 0, w]], M) + rect(0, -(w / 2 + 3), 11, w + 6, '#9aa3ad', 2) + decos(); break; }
    case 'cap': { const w = bw(ps[0].t.s); s += rect(-14, -(w / 2 + 5), 26, w + 10, M.fill, 8) + decos(); break; }
    case 'valve': {
      const w = bw(ps[0].t.s);
      s += tubes([[-40, 0, 40, 0, w + 2]], M) + decos() + rect(-17, -(w / 2 + 8), 34, w + 16, M.fill, 8)
        + `<circle r="${w / 2 + 1}" fill="none" stroke="${OUT}" stroke-width="1.2" opacity=".45"/>`
        + rect(-3, -(w / 2 + 15), 6, 8, '#9aa3ad', 1) + rect(-9, -(w / 2 + 23), 42, 9, '#d33a2c', 4.5)
        + (def.rv ? `<path d="M-30 ${w / 2 + 12}H-18M-22 ${w / 2 + 8}L-17 ${w / 2 + 12}L-22 ${w / 2 + 16}" fill="none" stroke="${OUT}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` + rect(20, -(w / 2 + 5), 9, w + 10, M.fill, 4) : ''); break;
    }
    case 'check': {
      const w = bw(ps[0].t.s);
      s += tubes([[-20, 0, 20, 0, w + 2]], M) + decos() + rect(-12, -(w / 2 + 6), 24, w + 12, M.fill, 9)
        + `<path d="M-7 0H5M0-4.5L6 0L0 4.5" fill="none" stroke="${OUT}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`; break;
    }
    case 'kfe': {
      const w = bw(ps[0].t.s);
      s += tubes([[-20, 0, 4, 0, w]], M) + decos()
        + `<path d="M8 ${-w / 2 + 1}L24 ${-w / 2 + 3}V${w / 2 - 3}L8 ${w / 2 - 1}Z" fill="${M.fill}" stroke="${OUT}" stroke-width="2"/>`
        + ln(13, -w / 2 + 1, 13, w / 2 - 1, OUT, 1.2, 'opacity=".5"') + ln(18, -w / 2 + 2, 18, w / 2 - 2, OUT, 1.2, 'opacity=".5"')
        + rect(-7, -(w / 2 + 5), 16, w + 10, M.fill, 4) + rect(-5, -(w / 2 + 14), 12, 9, '#2f6fd1', 2); break;
    }
    case 'wmv': case 'eckv': {
      s += tubes(arms(), M, 14) + decos();
      if (sh === 'eckv') s += rect(-20, -15, 5, 30, MAT.vc.fill, 2);
      s += `<circle r="11" fill="${M.fill}" stroke="${OUT}" stroke-width="2"/>` + rect(-4, -24, 8, 13, M.fill, 1);
      s += sh === 'wmv' ? rect(-12, -31, 24, 8, '#2f6fd1', 4) + rect(10, -9, 8, 9, M.fill, 1)
                        : `<circle cy="-27" r="8" fill="${M.fill}" stroke="${OUT}" stroke-width="2"/><path d="M-5-27H5M0-32V-22" stroke="${OUT}" stroke-width="1.4"/>`;
      break;
    }
    case 'sg': {
      const w = bw('3/4') + 2;
      s += tubes([[-40, 20, 0, 20, w], [0, 20, 0, -40, w], [0, -12, 16, -12, 10], [0, 20, 0, 30, 8]], M, w);
      s += `<path d="M-10 29H10L4 43H-4Z" fill="#c4cad1" stroke="${OUT}" stroke-width="2"/>` + decos();
      s += rect(-31, 8, 17, 24, M.fill, 5) + rect(-24.5, -2, 4, 11, '#9aa3ad', 1) + `<circle cx="-22.5" cy="-4" r="7" fill="#24497a" stroke="${OUT}" stroke-width="2"/>`;
      s += rect(-8, -2, 16, 16, M.fill, 4) + `<path d="M-3 9V1M-6 4L0-1L6 4" fill="none" stroke="${OUT}" stroke-width="1.8"/>`;
      s += rect(12, -22, 14, 20, M.fill, 4) + rect(10, -35, 18, 13, '#2f6fd1', 3); break;
    }
    case 'sv': s += tubes(arms(), M, 16) + decos() + `<circle cy="-1" r="12" fill="${M.fill}" stroke="${OUT}" stroke-width="2"/>` + rect(-9, -27, 18, 15, '#d33a2c', 4); break;
    case 'union': {
      const w = bw(ps[0].t.s);
      s += tubes(arms(), M) + decos() + rect(-15, -(w / 2 + 7), 13, w + 14, M.fill, 2) + ln(-8.5, -(w / 2 + 6), -8.5, w / 2 + 6, OUT, 1, 'opacity=".45"')
        + rect(-2, -(w / 2 + 4), 12, w + 8, M.fill, 2) + ln(-2, -(w / 2 + 9), -2, w / 2 + 9, OUT, 1.6); break;
    }
    case 'ssv': case 'srv': {
      const w = bw(ps[0].t.s), L = Math.abs(ps[0].x * C), b = sh === 'ssv' ? 30 : 22;
      s += tubes([[-L, 0, L, 0, w + 2]], M) + decos();
      s += ln(0, 0, -b, -b, OUT, w + 6, 'stroke-linecap="round"') + ln(0, 0, -b, -b, M.fill, w + 2, 'stroke-linecap="round"');
      s += `<ellipse rx="${sh === 'ssv' ? 20 : 15}" ry="${w / 2 + 8}" fill="${M.fill}" stroke="${OUT}" stroke-width="2"/>`;
      s += `<path d="M-8 2H6M1-2.5L6 2L1 6.5" fill="none" stroke="${OUT}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
      if (sh === 'ssv') {
        s += `<g transform="translate(${-b},${-b}) rotate(-45)">` + rect(-7, -6, 8, 12, M.fill, 2) + '</g>' + ln(-b - 3, -b - 3, -b - 12, -b - 12, '#8c939b', 3.5);
        s += `<g transform="translate(${-b - 14},${-b - 14}) rotate(45)"><rect x="-4" y="-15" width="8" height="30" rx="3.5" fill="#2e8b3e" stroke="${OUT}" stroke-width="2"/><path d="M0-11V11" stroke="#bfe3c4" stroke-width="1.2"/></g>`;
      } else {
        s += `<g transform="translate(${-b - 2},${-b - 2}) rotate(-45)">` + rect(-6, -7, 9, 14, M.fill, 2) + ln(-3, -7, -3, 7, OUT, 1, 'opacity=".4"') + '</g>';
      }
      break;
    }
    case 'tap': {
      const w = bw(ps[0].t.s);
      s += tubes([[0, -20, 0, -4, w]], M) + decos();
      s += `<path d="M-3 6V20Q-3 27 -10 27" fill="none" stroke="${OUT}" stroke-width="11" stroke-linecap="round"/><path d="M-3 6V20Q-3 27 -10 27" fill="none" stroke="${M.fill}" stroke-width="7" stroke-linecap="round"/>`;
      s += `<circle r="11" fill="${M.fill}" stroke="${OUT}" stroke-width="2"/>` + rect(9, -3.5, 10, 7, M.fill, 2) + rect(17, -11, 5, 22, '#dfe4ea', 2) + `<circle cx="-10" cy="27" r="3" fill="${OUT}"/>`;
      break;
    }
    case 'gauge': {
      s += tubes([[0, 20, 0, 4, bw('1/2')]], M) + decos() + rect(-7, 4, 14, 8, M.fill, 2);
      s += `<circle cy="-10" r="16" fill="${M.fill}" stroke="${OUT}" stroke-width="2"/><circle cy="-10" r="12" fill="#fff" stroke="${OUT}" stroke-width="1"/>`
        + (def.therm ? ln(0, -10, -7, -16, '#1f6feb', 2, 'stroke-linecap="round"') + '<text x="0" y="-1" text-anchor="middle" style="font:700 6px sans-serif" fill="#d33a2c">°C</text>' : ln(0, -10, 7, -17, '#d33a2c', 2, 'stroke-linecap="round"')) + `<path d="M-8-16A10 10 0 0 1 8-16" fill="none" stroke="${OUT}" stroke-width="1" opacity=".5"/><circle cy="-10" r="1.8" fill="${OUT}"/>`;
      break;
    }
    case 'svtw': {
      s += tubes(arms(), M, 14) + decos() + rect(-10, -12, 20, 22, M.fill, 5) + ln(-10, -4, 10, -4, OUT, 1, 'opacity=".4"')
        + rect(-6, -18, 12, 7, '#c9a43a', 1) + rect(-9, -30, 18, 13, '#2e8b3e', 4); break;
    }
    case 'vessel': {
      s += tubes([[0, 20, 0, -8, bw('3/4')]], MAT.wh) + decos();
      s += `<path d="M-80-60V-118H80V-60A80 52 0 0 1 -80-60Z" fill="${M.fill}" stroke="${OUT}" stroke-width="2"/>`
        + `<ellipse cx="28" cy="-52" rx="9" ry="5" fill="#fff" opacity=".9"/><path d="M-70-62A70 44 0 0 0 -20-16" fill="none" stroke="#dde1e6" stroke-width="5"/>`;
      break;
    }
    case 'hose': {
      const L = Math.abs(ps[0].x * C), w = bw(ps[0].t.s) - 1;
      s += ln(-L, 0, L, 0, OUT, w + 4) + ln(-L, 0, L, 0, 'url(#braid)', w) + decos(); break;
    }
    case 'pipe': s += pipeSVG(def, [-1, 0], [1, 0]); break;
    case 'arm': s += armSVG(def, M, ps, decos, arms); break;
  }
  return s;
}
/* Generische Armaturen-Piktogramme (sym aus parts.js) */
const ARROW = (y) => `<path d="M-8 ${y}H6M1 ${y - 4.5}L6 ${y}L1 ${y + 4.5}" fill="none" stroke="${OUT}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
const circ = (cx, cy, r, fill, extra = '') => `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" fill="${fill}" stroke="${OUT}" stroke-width="2" ${extra}/>`;
const miniGauge = (cx, cy, r = 9) => ln(cx, cy + r, cx, cy + r + 6, OUT, 4) + circ(cx, cy, r, '#fff') + ln(cx, cy, cx + r * 0.55, cy - r * 0.55, '#d33a2c', 1.8, 'stroke-linecap="round"');
function armSVG(def, M, ps, decos, arms) {
  const w = Math.max(...ps.map((p) => bw(p.t.s))) + 2, h = w / 2;
  const straight = ps.length === 2 && ps.every((p) => Math.abs(p.d[1]) < 0.01);
  const xL = straight ? Math.abs(ps[0].x * C) : 0;
  let s = straight ? tubes([[-xL, 0, xL, 0, w]], M) : tubes(arms(), M, ps.length > 1 ? w + 4 : 0);
  s += decos();
  const body = (bwid, fill = M.fill, rx = 6) => rect(-bwid / 2, -(h + 7), bwid, w + 14, fill, rx);
  switch (def.sym) {
    case 'dm':
      s += body(30) + rect(-12, -(h + 30), 24, 25, M.fill, 8) + rect(-4, -(h + 37), 8, 8, '#2f6fd1', 2) + ARROW(h + 15);
      if (def.gauge) s += miniGauge(24, -(h + 20)); break;
    case 'ffil': case 'rsf':
      s += body(30) + `<rect x="-11" y="${h + 6}" width="22" height="30" rx="8" fill="#d6ecf8" stroke="${OUT}" stroke-width="2"/><rect x="-5" y="${h + 10}" width="10" height="22" rx="3" fill="#ece3c4" stroke="${OUT}" stroke-width="1"/>`;
      if (def.sym === 'rsf') s += rect(-5, h + 36, 10, 7, '#d33a2c', 2) + rect(-9, -(h + 18), 18, 11, '#2f6fd1', 3); break;
    case 'hws':
      s += body(34) + `<rect x="-11" y="${h + 6}" width="22" height="30" rx="8" fill="#d6ecf8" stroke="${OUT}" stroke-width="2"/><rect x="-5" y="${h + 10}" width="10" height="22" rx="3" fill="#ece3c4" stroke="${OUT}" stroke-width="1"/>`
        + rect(-12, -(h + 30), 24, 25, M.fill, 8) + rect(-4, -(h + 37), 8, 8, '#2f6fd1', 2) + miniGauge(25, -(h + 20)) + rect(-5, h + 36, 10, 7, '#d33a2c', 2); break;
    case 'leak':
      s += body(30) + rect(-15, -(h + 34), 30, 26, '#2f6fd1', 5) + `<path d="M0 ${-(h + 29)}C-6 ${-(h + 20)} -6 ${-(h + 14)} 0 ${-(h + 13)}C6 ${-(h + 14)} 6 ${-(h + 20)} 0 ${-(h + 29)}Z" fill="#fff"/>`; break;
    case 'ba':
      s += rect(-26, -(h + 7), 52, w + 14, '#3e78c9', 7) + [-14, 0, 14].map((x) => circ(x, -(h + 11), 4, '#e6c14a')).join('')
        + `<path d="M-9 ${h + 9}H9L4 ${h + 22}H-4Z" fill="#c4cad1" stroke="${OUT}" stroke-width="2"/>` + ARROW(0); break;
    case 'rb':
      s += body(24) + rect(-9, -(h + 22), 18, 16, '#2f6fd1', 5) + ln(-6, -(h + 14), 6, -(h + 14), '#fff', 1.4); break;
    case 'tmix':
      s += circ(0, 0, h + 8, M.fill) + rect(-4, -(h + 16), 8, 9, '#9aa3ad', 1) + circ(0, -(h + 24), 10, '#fff')
        + `<path d="M0 ${-(h + 34)}A10 10 0 0 1 0 ${-(h + 14)}Z" fill="#d6402f"/><path d="M0 ${-(h + 34)}A10 10 0 0 0 0 ${-(h + 14)}Z" fill="#2f6fd1"/>` + circ(0, -(h + 24), 4, '#fff'); break;
    case 'wz':
      s += body(30) + circ(0, -(h + 16), 15, '#fff', 'stroke-width="2.5"') + circ(0, -(h + 16), 11, '#e8f1fd', 'stroke-width="1"')
        + `<text x="0" y="${-(h + 13)}" text-anchor="middle" style="font:700 8px sans-serif" fill="#1f4fa8">m³</text>` + ARROW(h + 14); break;
    case 'wzb':
      s += rect(-20, -(h + 10), 40, w + 20, 'none', 4, 'stroke-dasharray="4 3" opacity=".6"') + rect(-46, -(h + 5), 18, w + 10, M.fill, 4) + rect(28, -(h + 5), 18, w + 10, M.fill, 4)
        + rect(-41, -(h + 14), 8, 9, '#2f6fd1', 2) + rect(33, -(h + 14), 8, 9, '#2f6fd1', 2) + rect(-50, h + 8, 100, 6, '#9aa3ad', 2); break;
    case 'wsd':
      s = tubes([[0, 20, 0, -4, bw('1/2')]], M) + decos() + rect(-11, -34, 22, 32, M.fill, 6) + ln(-11, -24, 11, -24, OUT, 1, 'opacity=".4"'); break;
    case 'fj':
      s += body(30) + rect(-12, -(h + 12), 24, 7, '#2e8b3e', 3) + ARROW(0); break;
    case 'vt': {
      const xs = ps.map((p) => p.x * C), x0 = Math.min(...xs), x1 = Math.max(...xs);
      s = tubes([[x0, 0, x1, 0, 22]], M) + ps.slice(2).map((p) => tubes([[p.x * C, 0, p.x * C, p.y * C, bw(p.t.s)]], M)).join('') + decos()
        + ps.slice(2).map((p) => rect(p.x * C - 5, -18, 10, 7, '#2f6fd1', 2)).join(''); break;
    }
    case 'pump':
      s += circ(0, 0, 20, M.fill) + rect(-13, -50, 26, 30, '#3b4652', 5) + rect(-8, -45, 16, 9, '#7fd18b', 2, 'stroke-width="1"') + ARROW(0); break;
    case 'mix3':
      s += circ(0, 0, h + 9, M.fill) + circ(0, -(h + 20), 11, '#3b4652') + ln(0, -(h + 20), 0, -(h + 29), '#fff', 2.4, 'stroke-linecap="round"')
        + `<path d="M-15 ${-(h + 28)}A17 17 0 0 1 15 ${-(h + 28)}" fill="none" stroke="${OUT}" stroke-width="1" stroke-dasharray="2 3"/>`; break;
    case 'sla':
      s += body(30) + rect(-12, h + 5, 24, 34, '#4a5360', 6) + rect(-12, h + 25, 24, 6, '#9aa3ad', 1) + rect(-4, -(h + 16), 8, 9, '#d33a2c', 2); break;
    case 'kv':
      s += body(28) + rect(-7, -(h + 20), 14, 13, '#d33a2c', 3) + ln(-7, -(h + 14), 7, -(h + 14), '#fff', 1.2); break;
    case 'dfb':
      s += body(24) + `<rect x="-7" y="${-(h + 42)}" width="14" height="36" rx="5" fill="#d6ecf8" stroke="${OUT}" stroke-width="2"/>` + rect(-5, -(h + 28), 10, 5, '#d33a2c', 1, 'stroke-width="1"') + rect(-9, -(h + 48), 18, 7, M.fill, 2); break;
    case 'strv':
      s += `<ellipse rx="17" ry="${h + 8}" fill="${M.fill}" stroke="${OUT}" stroke-width="2"/>` + rect(-3, -(h + 18), 6, 11, '#9aa3ad', 1) + rect(-14, -(h + 28), 28, 11, '#2f6fd1', 5)
        + circ(-9, h + 10, 3.5, '#d33a2c') + circ(9, h + 10, 3.5, '#2f6fd1') + ARROW(0); break;
    case 'sf':
      s += ln(0, 0, 16, 20, OUT, w + 6, 'stroke-linecap="round"') + ln(0, 0, 16, 20, M.fill, w + 2, 'stroke-linecap="round"') + `<ellipse rx="15" ry="${h + 6}" fill="${M.fill}" stroke="${OUT}" stroke-width="2"/>`
        + `<g transform="translate(18,23) rotate(-38)">${rect(-7, -5, 14, 10, M.fill, 2)}</g>` + ARROW(0); break;
    case 'usv':
      s += body(24) + rect(-7, -(h + 30), 14, 24, '#9aa3ad', 3) + `<path d="M-5 ${-(h + 26)}L5 ${-(h + 22)}L-5 ${-(h + 18)}L5 ${-(h + 14)}" fill="none" stroke="${OUT}" stroke-width="1.2"/>` + rect(-9, -(h + 36), 18, 7, '#d33a2c', 3) + ARROW(0); break;
    case 'tv': case 'rlv':
      s += circ(0, 0, h + 7, M.fill);
      s += def.sym === 'tv' ? rect(-3, -(h + 13), 6, 7, '#9aa3ad', 1) + rect(-12, -(h + 46), 24, 34, '#fbfbfc', 10) + [-6, 0, 6].map((x) => ln(x, -(h + 42), x, -(h + 16), '#c9d0d8', 1.5)).join('')
        : rect(-6, -(h + 16), 12, 10, M.fill, 2) + rect(-4, -(h + 20), 8, 5, '#9aa3ad', 1); break;
    case 'hblk':
      s = ps.map((p) => tubes([[p.x * C, 0, p.x * C, p.y * C, bw(p.t.s)]], M)).join('') + decos() + rect(-22, -10, 44, 20, M.fill, 5) + rect(-28, -6, 7, 12, '#9aa3ad', 2) + rect(21, -6, 7, 12, '#9aa3ad', 2); break;
    case 'sent':
      s = tubes([[0, 20, 0, -2, w]], M) + decos() + rect(-11, -36, 22, 34, M.fill, 5) + ln(-11, -26, 11, -26, OUT, 1, 'opacity=".4"') + rect(-4, -44, 8, 8, '#d33a2c', 2); break;
    case 'ment':
      s = tubes([[0, 20, 0, -2, w]], M) + decos() + rect(-9, -14, 18, 12, M.fill, 2) + rect(-4, -22, 8, 8, '#9aa3ad', 1) + ln(-6, -10, 6, -10, OUT, 1, 'opacity=".4"'); break;
    case 'ksg':
      s = tubes([[0, 20, 0, -12, w], [-30, -12, 30, -12, 14]], M) + decos() + rect(-38, -26, 16, 22, M.fill, 4) + rect(-38, -36, 16, 11, '#d33a2c', 3)
        + rect(-8, -46, 16, 30, M.fill, 4) + rect(-4, -52, 8, 7, '#d33a2c', 2) + miniGauge(30, -34, 10); break;
  }
  return s;
}
const ARM_BB = { dm: [0, -48, 14, 4], ffil: [0, -6, 0, 30], rsf: [0, -10, 0, 38], hws: [0, -48, 16, 38], leak: [0, -46, 0, 0], ba: [-6, -14, 6, 16], rb: [0, -30, 0, 0],
  tmix: [-4, -50, 4, 0], wz: [0, -42, 0, 8], wzb: [-6, -10, 6, 10], wsd: [0, -28, 0, 0], fj: [0, -4, 0, 4], vt: [0, -14, 0, 0], pump: [0, -46, 0, 8], mix3: [-4, -46, 4, 0],
  sla: [0, -14, 0, 36], kv: [0, -24, 0, 0], dfb: [0, -54, 0, 0], strv: [0, -34, 0, 10], sf: [0, -4, 14, 22], usv: [0, -42, 0, 0], tv: [0, -54, 0, 0], rlv: [0, -24, 0, 0],
  hblk: [-12, 0, 12, 0], sent: [0, -40, 0, 0], ment: [0, -16, 0, 0], ksg: [-24, -46, 22, 0] };
function pipeSVG(def, a, b) {
  const M = MAT[def.mat], w = bw(def.ports[0].t.s);
  const ax = a[0] * C, ay = a[1] * C, bx = b[0] * C, by = b[1] * C;
  let out = tubes([[ax, ay, bx, by, w]], M);
  if (def.mat === 'mv') out += ln(ax, ay, bx, by, '#9aa5b4', 1.3, 'stroke-dasharray="9 6" opacity=".9"');
  if (def.ports[0].t.k === 'ag') {
    const L = dist(a, b) || 1, u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    out += decoAt({ x: a[0], y: a[1], d: [-u[0], -u[1]], t: def.ports[0].t }, def.mat) + decoAt({ x: b[0], y: b[1], d: u, t: def.ports[0].t }, def.mat);
  }
  return out;
}
const BBOX = {};
function bboxOf(def) {
  if (BBOX[def.id]) return BBOX[def.id];
  let x0 = -16, y0 = -16, x1 = 16, y1 = 16;
  if (def.shape === 'pipe') { x0 = -44; x1 = 44; }
  def.ports.forEach((p) => { x0 = Math.min(x0, p.x * C - 8); x1 = Math.max(x1, p.x * C + 8); y0 = Math.min(y0, p.y * C - 8); y1 = Math.max(y1, p.y * C + 8); });
  const ex = { valve: [0, -32, 0, 4], kfe: [0, -24, 10, 0], wmv: [0, -34, 0, 0], eckv: [0, -38, 0, 0], sg: [0, -4, 4, 6], sv: [0, -16, 0, 0], check: [0, -4, 0, 4],
    union: [0, -2, 0, 2], ssv: [-6, -46, 0, 0], srv: [0, -26, 0, 0], tap: [0, 0, 10, 16], gauge: [0, -10, 0, 0], svtw: [0, -14, 0, 0], vessel: [-66, -104, 66, 0] }[def.shape];
  const ax = def.shape === 'arm' ? ARM_BB[def.sym] : null;
  if (ax) { x0 += ax[0]; y0 += ax[1]; x1 += ax[2]; y1 += ax[3]; }
  if (ex) { x0 += ex[0]; y0 += ex[1]; x1 += ex[2]; y1 += ex[3]; }
  return (BBOX[def.id] = [x0, y0, x1, y1]);
}
function iconSVG(def) {
  if (def.virtual) return `<svg viewBox="-20 -20 40 40"><path d="M-12 4A12 12 0 0 1 12 4" fill="none" stroke="#6b7480" stroke-width="5"/><rect x="-17" y="2" width="8" height="6" fill="#6b7480"/><rect x="9" y="2" width="8" height="6" fill="#6b7480"/><line x1="0" y1="-8" x2="0" y2="-18" stroke="#6b7480" stroke-width="4"/></svg>`;
  const [x0, y0, x1, y1] = bboxOf(def), p = 6;
  return `<svg viewBox="${x0 - p} ${y0 - p} ${x1 - x0 + 2 * p} ${y1 - y0 + 2 * p}" preserveAspectRatio="xMidYMid meet">${drawPart(def)}</svg>`;
}
const PART_SVG = {}; const partSVG = (def) => PART_SVG[def.id] || (PART_SVG[def.id] = drawPart(def));

/* ------------------------------------------------------------------ Zustand */
const $ = (id) => document.getElementById(id);
const svg = $('canvas'), viewG = $('view'), worldG = $('world'), overG = $('overlay');
let proj = newProject();
let sel = null, activePort = null;
let undoStack = [], redoStack = [];
let view = { x: 0, y: 0, k: 1 };
let drag = null;          // laufende Interaktion
let drawPid = null;       // Rohr-Zeichenmodus
let preview = null;       // Vorschau im Overlay
let A = analyze([]);      // aktuelle Analyse
const settings = JSON.parse(localStorage.getItem('rp_settings') || '{"ai":false}');

function newProject() { return { v: 1, name: t('untitled'), medium: 'tw', items: [], routes: [], seq: 1 }; }
const uid = () => 'o' + (proj.seq++);
const byId = (id) => proj.items.find((o) => o.id === id);
const snapshot = () => JSON.stringify(proj);
function pushUndo(snap) { undoStack.push(snap ?? snapshot()); if (undoStack.length > 150) undoStack.shift(); redoStack = []; }
function undo() { if (!undoStack.length) return; redoStack.push(snapshot()); proj = JSON.parse(undoStack.pop()); if (!byId(sel)) sel = null; changed(); }
function redo() { if (!redoStack.length) return; undoStack.push(snapshot()); proj = JSON.parse(redoStack.pop()); if (!byId(sel)) sel = null; changed(); }
function changed(save = true) {
  A = analyze(proj.items); render(); updateUI();
  if (save) try { localStorage.setItem('rp_current', snapshot()); } catch (e) { /* Speicher voll */ }
}
const pipeLenCm = (o) => (o.len != null ? o.len : Math.round(dist(o.a, o.b) * CM));

/* ------------------------------------------------------------------ Rendering */
function applyView() { viewG.setAttribute('transform', `translate(${f1(view.x)},${f1(view.y)}) scale(${view.k})`); renderOverlay(); }
function objSVG(o) {
  const def = DEF[o.pid];
  if (o.type === 'pipe') return `<g class="obj" data-id="${o.id}">${ln(o.a[0] * C, o.a[1] * C, o.b[0] * C, o.b[1] * C, 'transparent', 24, 'stroke-linecap="round"')}${pipeSVG(def, o.a, o.b)}</g>`;
  const [x0, y0, x1, y1] = bboxOf(def);
  return `<g class="obj" data-id="${o.id}" transform="translate(${f1(o.x * C)},${f1(o.y * C)}) rotate(${o.rot * 90}) scale(1,${o.flip ? -1 : 1})">`
    + `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="transparent"/>${partSVG(def)}</g>`;
}
function render() {
  const pipes = proj.items.filter((o) => o.type === 'pipe'), parts = proj.items.filter((o) => o.type !== 'pipe');
  worldG.innerHTML = pipes.map(objSVG).join('') + parts.map(objSVG).join('');
  renderOverlay();
  $('emptyHint').hidden = proj.items.length > 0 || !!drawPid;
}
function pill(x, y, text, bg = '#fff', col = OUT) {
  const s = 1 / Math.max(0.55, Math.min(view.k, 1.6)), w = text.length * 7 + 14;
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f1(s)})" pointer-events="none"><rect x="${-w / 2}" y="-11" width="${w}" height="22" rx="11" fill="${bg}" stroke="${col}" stroke-width="1.2" opacity=".96"/><text text-anchor="middle" y="4.5" class="lbl-pill" fill="${col}">${esc(text)}</text></g>`;
}
function bubble(x, y, text, bg) {
  const s = 1 / view.k, lines = []; let cur = '';
  text.split(' ').forEach((w) => { if ((cur + ' ' + w).trim().length > 38) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w; }); if (cur.trim()) lines.push(cur.trim());
  const W = Math.max(...lines.map((l) => l.length)) * 6.6 + 18, H = lines.length * 16 + 10;
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f1(s)})" pointer-events="none"><rect x="${-W / 2}" y="${-H - 22}" width="${W}" height="${H}" rx="9" fill="${bg}" opacity=".95"/>`
    + lines.map((l, i) => `<text x="0" y="${-H - 22 + 18 + i * 16}" text-anchor="middle" fill="#fff" style="font:600 12.5px system-ui,sans-serif">${esc(l)}</text>`).join('') + '</g>';
}
const SMALL = { fit: 1, plug: 1, cap: 1, union: 1 };
function fitLabel(def) {
  const one = (x) => ZOLL[x] || x.replace(/^[A-Z]+/, '');
  const u = [...new Set(def.ports.map((p) => p.t.s))].map(one).join('×');
  const m = /-ln-.*-(\d+)$/.exec(def.id);
  return m ? u + ' L' + m[1] : u;
}
function renderOverlay() {
  let s = '';
  const f = 1 / Math.max(0.5, Math.min(view.k, 1.5));
  const selO = byId(sel);
  if (selO) {
    if (selO.type === 'pipe') {
      s += ln(selO.a[0] * C, selO.a[1] * C, selO.b[0] * C, selO.b[1] * C, '#1f6feb', bw(DEF[selO.pid].ports[0].t.s) + 12, 'stroke-linecap="round" opacity=".25" pointer-events="none"');
    } else {
      const [x0, y0, x1, y1] = bboxOf(DEF[selO.pid]);
      const cs = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => tf(x, y, selO.rot, selO.flip));
      const xs = cs.map((c) => c[0]), ys = cs.map((c) => c[1]);
      s += `<rect x="${f1(selO.x * C + Math.min(...xs) - 3)}" y="${f1(selO.y * C + Math.min(...ys) - 3)}" width="${f1(Math.max(...xs) - Math.min(...xs) + 6)}" height="${f1(Math.max(...ys) - Math.min(...ys) + 6)}" rx="8" fill="#1f6feb10" stroke="#1f6feb" stroke-width="${f1(1.6 * f)}" stroke-dasharray="${f1(6 * f)} ${f1(4 * f)}" pointer-events="none"/>`;
    }
  }
  proj.items.filter((o) => o.type === 'pipe').forEach((o) => {
    const L = dist(o.a, o.b); if (L * view.k < 0.8 && o.id !== sel) return;
    const mx = (o.a[0] + o.b[0]) / 2 * C, my = (o.a[1] + o.b[1]) / 2 * C, u = [(o.b[0] - o.a[0]) / (L || 1), (o.b[1] - o.a[1]) / (L || 1)];
    const off = bw(DEF[o.pid].ports[0].t.s) / 2 + 16 * f;
    s += pill(mx + u[1] * off, my - u[0] * off, pipeLenCm(o) + ' cm' + (o.len != null ? ' ✎' : ''), o.id === sel ? '#1f6feb' : '#fff', o.id === sel ? '#fff' : OUT);
  });
  proj.items.forEach((o) => {
    const def = DEF[o.pid], w = def.warn && def.warn[proj.medium];
    let c = o.type === 'pipe' ? [(o.a[0] + o.b[0]) / 2 * C, (o.a[1] + o.b[1]) / 2 * C - 4] : [o.x * C, o.y * C - 4];
    if (o.type !== 'pipe' && (SMALL[def.shape] || w)) {
      // freie Ecke/Seite suchen, damit Hinweis-Punkt und Größe das Teil nicht verdecken
      const ds = portsOf(o).map((p) => p.d), cost = (v) => ds.reduce((a, d) => a + Math.max(0, d[0] * v[0] + d[1] * v[1]), 0);
      const corner = [[1, -1], [-1, -1], [1, 1], [-1, 1]].sort((a, b) => cost(a) - cost(b))[0];
      c = [o.x * C + corner[0] * 17, o.y * C + corner[1] * 17];
      if (SMALL[def.shape] && view.k >= 1.2) {
        const side = [[0, 1], [0, -1], [1, 0], [-1, 0]].sort((a, b) => cost(a) - cost(b))[0], lb = fitLabel(def);
        const r = 21 + 7 * f;
        s += `<text x="${f1(o.x * C + side[0] * (r + (side[0] ? lb.length * 2.6 * f : 0)))}" y="${f1(o.y * C + side[1] * r + 3.5 * f)}" text-anchor="middle" class="fit-lbl" style="font:700 ${f1(11 * f)}px system-ui,sans-serif" fill="#1d2633" stroke="#fff" stroke-width="${f1(3 * f)}" paint-order="stroke" pointer-events="none">${esc(lb)}</text>`;
      }
    }
    if (!w) return;
    s += `<g transform="translate(${f1(c[0])},${f1(c[1])}) scale(${f1(f * 0.8)})" pointer-events="none"><circle r="8" fill="#ffb300" stroke="${OUT}" stroke-width="1.5"/><text y="4" text-anchor="middle" style="font:800 11px system-ui" fill="${OUT}">!</text></g>`;
  });
  const seen = new Set();
  A.all.forEach((p) => {
    const v = A.status.get(p.obj.id + ':' + p.idx); if (!v) return;
    const x = p.pos[0] * C, y = p.pos[1] * C;
    if (v.s === 'free') {
      const isSel = p.obj.id === sel, act = isSel && activePort === p.idx;
      s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1((act ? 8 : 5.5) * f)}" fill="${act ? '#1f6feb' : '#fff'}" stroke="${act ? '#fff' : '#f08c00'}" stroke-width="${f1(2.4 * f)}" pointer-events="none"/>`;
      if (isSel) s += `<circle data-port="${p.idx}" data-pid="${p.obj.id}" cx="${f1(x)}" cy="${f1(y)}" r="${f1(16 * f)}" fill="transparent" stroke="${act ? '#1f6feb' : 'none'}" stroke-width="${f1(2 * f)}"/>`;
    } else {
      const pk = key(p.pos); if (seen.has(pk)) return; seen.add(pk);
      if (v.s === 'ok') s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(3.6 * f)}" fill="#1a9e4b" stroke="#fff" stroke-width="${f1(1.4 * f)}" pointer-events="none"/>`;
      else s += `<g data-bad="${esc(v.msg)}" transform="translate(${f1(x)},${f1(y)}) scale(${f1(f)})" style="cursor:help"><circle r="16" fill="transparent"/><circle r="9" fill="#d63b3b" stroke="#fff" stroke-width="2"/><text y="4.5" text-anchor="middle" style="font:800 13px system-ui" fill="#fff">!</text></g>`;
    }
  });
  if (selO) portsOf(selO).forEach((p) => {
    const x = p.pos[0] * C + p.d[0] * 30 * f, y = p.pos[1] * C + p.d[1] * 22 * f + (Math.abs(p.d[0]) > 0.5 ? -16 * f : 0);
    s += pill(x, y, (p.n ? p.n + ': ' : '') + fmtPort(p.t), '#eef4ff', '#1f4fa8');
  });
  if (selO && selO.type === 'pipe') ['a', 'b'].forEach((h) => {
    s += `<circle data-h="${h}" data-hid="${selO.id}" cx="${f1(selO[h][0] * C)}" cy="${f1(selO[h][1] * C)}" r="${f1(11 * f)}" fill="#fff" stroke="#1f6feb" stroke-width="${f1(3 * f)}" style="cursor:pointer"/>`;
  });
  if (preview) {
    const o = preview.obj;
    if (preview.kind === 'part') s += `<g opacity=".7" pointer-events="none">${objSVG(o).replace('class="obj"', '')}</g>`;
    else {
      s += `<g opacity=".8" pointer-events="none">${pipeSVG(DEF[o.pid], o.a, o.b)}</g>`;
      s += pill((o.a[0] + o.b[0]) / 2 * C, (o.a[1] + o.b[1]) / 2 * C - 22 * f, Math.round(dist(o.a, o.b) * CM) + ' cm', '#1f6feb', '#fff');
    }
  }
  if (drag && drag.snap) {
    const sp = drag.snap, x = sp.pos[0] * C, y = sp.pos[1] * C, col = sp.ok ? '#1a9e4b' : '#d63b3b';
    s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(15 * f)}" fill="${col}" opacity=".28" pointer-events="none"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(15 * f)}" fill="none" stroke="${col}" stroke-width="${f1(2.5 * f)}" pointer-events="none"/>`;
    if (!sp.ok) s += bubble(x, y - 6 * f, sp.msg, '#c62f2f');
  }
  overG.innerHTML = s + routeOverlay(f);
}

/* ------------------------------------------------------------------ UI-Status */
function updateUI() {
  $('btnUndo').disabled = !undoStack.length; $('btnRedo').disabled = !redoStack.length;
  if ($('projName') !== document.activeElement) $('projName').value = proj.name;
  $('medium').value = proj.medium;
  const H = computeHints(), nBad = H.filter((h) => h.lvl === 'bad').length, nWarn = H.filter((h) => h.lvl === 'warn').length;
  const b = $('hintBadge'); b.hidden = !(nBad + nWarn); b.textContent = nBad + nWarn; b.className = 'badge' + (nBad ? '' : ' warn');
  const o = byId(sel);
  $('selBar').hidden = !o;
  if (o) {
    $('selName').textContent = nm(DEF[o.pid]);
    $('selPorts').textContent = t('ports') + ': ' + portsOf(o).map((p) => fmtPort(p.t) + (A.status.get(o.id + ':' + p.idx)?.s === 'free' ? ' (' + t('free') + ')' : '')).join(' · ');
    $('selLenBox').hidden = o.type !== 'pipe';
    $('selFlip').hidden = o.type === 'pipe';
    $('selCont').hidden = !A.free.some((p) => p.obj === o);
    if (o.type === 'pipe' && document.activeElement !== $('selLen')) $('selLen').value = pipeLenCm(o);
  }
  document.querySelectorAll('.item').forEach((el) => el.classList.toggle('active', el.dataset.pid === drawPid));
  $('drawBanner').hidden = !drawPid;
  if (drawPid) $('drawText').innerHTML = t('drawBanner', { name: esc(nm(DEF[drawPid])) });
  svg.classList.toggle('drawing', !!drawPid || (typeof RU !== 'undefined' && RU.on));
  $('btnRoute').classList.toggle('on', typeof RU !== 'undefined' && RU.on);
}
let toastTimer;
function toast(msg, type = '', ms = 3400) {
  const el = $('toast'); el.textContent = msg; el.className = 'show ' + type;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (el.className = ''), ms);
}

/* ------------------------------------------------------------------ Hinweise */
function computeHints() {
  const H = [], med = proj.medium, items = proj.items, seen = new Set();
  A.conns.filter((c) => !c.ok).forEach((c) => H.push({ lvl: 'bad', msg: `${nm(DEF[c.p1.obj.pid])} ↔ ${nm(DEF[c.p2.obj.pid])}: ${c.msg}` }));
  A.conns.forEach((c) => [[c.p1, c.p2], [c.p2, c.p1]].forEach(([x, y]) => {
    if (DEF[x.obj.pid].shape === 'sg' && x.idx === 1 && DEF[y.obj.pid].shape === 'valve') H.push({ lvl: 'bad', msg: t('sgBad') });
  }));
  items.forEach((o) => { const w = DEF[o.pid].warn && DEF[o.pid].warn[med]; if (w && !seen.has(tx(w))) { seen.add(tx(w)); H.push({ lvl: 'warn', msg: nm(DEF[o.pid]) + ': ' + tx(w) }); } });
  const mats = new Set(items.map((o) => DEF[o.pid].mat));
  if (med !== 'hz' && (mats.has('cu') || mats.has('cup')) && (mats.has('st') || mats.has('tg'))) H.push({ lvl: 'warn', msg: t('mix') });
  if (items.some((o) => DEF[o.pid].shape === 'sg')) H.push({ lvl: 'info', msg: t('sgInfo') });
  if (items.some((o) => DEF[o.pid].shape === 'hose')) H.push({ lvl: 'info', msg: t('hoseInfo') });
  if (A.free.length) H.push({ lvl: 'info', msg: t('openEnds', { n: A.free.length }) });
  H.push(...routeHints());
  if (med !== 'hz' && items.length) H.push({ lvl: 'info', msg: t('twLaw') });
  return H;
}
function hintsHTML() {
  const H = computeHints(), ic = { bad: '⛔', warn: '⚠️', info: 'ℹ️' };
  return (H.filter((h) => h.lvl !== 'info').length ? '' : `<div class="hint info"><span class="hi">✅</span><span>${t('noHints')}</span></div>`)
    + H.map((h) => `<div class="hint ${h.lvl}"><span class="hi">${ic[h.lvl]}</span><span>${esc(h.msg)}</span></div>`).join('')
    + `<div class="disclaimer">${t('disclaimerLong')}</div>`;
}

/* ------------------------------------------------------------------ Platzieren & Anstecken */
const freeSet = (an) => new Set(an.free.map((p) => p.obj.id + ':' + p.idx));
function makePart(pid, x, y, rot = 0, flip = false) { return { id: uid(), type: 'part', pid, x, y, rot, flip }; }
function makePipe(pid, a, b) { return { id: uid(), type: 'pipe', pid, a, b, len: null }; }
function samePorts(def, a, b) {
  const sig = (o) => def.ports.map((p) => tf(p.x, p.y, o.rot, o.flip).map((v) => Math.round(v * 100)).join() + ':' + p.t.k + p.t.s + (p.n || '')).sort().join('|');
  return sig(a) === sig(b);
}
function orientCandidates(def, tp, all = false) {
  // alle Lagen (rot/flip), bei denen ein passender Anschluss genau auf tp trifft
  const out = [];
  def.ports.forEach((pp, j) => {
    if (!compat(pp.t, tp.t).ok) return;
    [false, true].forEach((flip) => { for (let rot = 0; rot < 4; rot++) {
      const d = tf(pp.d[0], pp.d[1], rot, flip); if (d[0] * tp.d[0] + d[1] * tp.d[1] > -0.99) continue;
      const [px, py] = tf(pp.x, pp.y, rot, flip);
      const c = { x: tp.pos[0] - px, y: tp.pos[1] - py, rot, flip, j };
      if (all || !out.some((o) => Math.abs(o.x - c.x) < 1e-6 && Math.abs(o.y - c.y) < 1e-6 && samePorts(def, o, c))) out.push(c);
    } });
  });
  return out;
}
function occupied(items, x, y) { return items.some((o) => o.type !== 'pipe' && Math.abs(o.x - x) < 0.3 && Math.abs(o.y - y) < 0.3); }
function attachNew(items, pid, target, portIdx = null, lenCells = 5, pick = null) {
  const def = DEF[pid], fs = freeSet(analyze(items));
  let tps = portsOf(target).filter((p) => fs.has(target.id + ':' + p.idx));
  if (portIdx != null) tps = tps.filter((p) => p.idx === portIdx);
  if (target.type === 'pipe') tps.reverse();
  for (const tp of tps) {
    if (def.shape === 'pipe') {
      if (!compat(def.ports[0].t, tp.t).ok) continue;
      return makePipe(pid, tp.pos.slice(), [tp.pos[0] + tp.d[0] * lenCells, tp.pos[1] + tp.d[1] * lenCells]);
    }
    let cands = orientCandidates(def, tp, !!pick).filter((c) => !occupied(items, c.x, c.y));
    if (pick) cands = cands.filter((c) => Object.keys(pick).every((k) => c[k] === pick[k]));
    if (cands.length) { const c = cands[0]; return makePart(pid, c.x, c.y, c.rot, c.flip); }
  }
  return null;
}
function addItem(o, label = 'placed') {
  pushUndo(); proj.items.push(o); sel = o.id; activePort = null; changed();
  const w = DEF[o.pid].warn && DEF[o.pid].warn[proj.medium];
  if (w) toast('⚠ ' + tx(w), 'warn', 5200);
  else if (label) {
    const bad = portsOf(o).map((p) => A.status.get(o.id + ':' + p.idx)).find((v) => v && v.s === 'bad');
    if (bad) toast(bad.msg, 'bad', 5000); else toast(t(label, { name: nm(DEF[o.pid]) }), label === 'attached' ? 'ok' : '', 1800);
  }
}
function viewCenterCell() {
  const r = svg.getBoundingClientRect();
  return [snap5((r.width / 2 - view.x) / view.k / C), snap5((r.height / 2.4 - view.y) / view.k / C)];
}
function tapAdd(pid) {
  const def = DEF[pid], s = byId(sel);
  if (s) {
    const o = attachNew(proj.items, pid, s, activePort);
    if (o) { addItem(o, 'attached'); ensureVisible(o); return; }
    if (def.shape === 'pipe') { startDraw(pid); toast(t('noFit', { name: nm(def) }), 'warn', 4500); return; }
    let [x, y] = s.type === 'pipe' ? [snap5(s.b[0]), snap5(s.b[1] + 2)] : [snap5(s.x), snap5(s.y + 2.5)];
    while (occupied(proj.items, x, y)) y += 1.5;
    addItem(makePart(pid, x, y), ''); toast(t('noFit', { name: nm(def) }), 'warn', 4500); ensureVisible(byId(sel)); return;
  }
  if (def.shape === 'pipe') { startDraw(pid); return; }
  let [x, y] = viewCenterCell();
  while (occupied(proj.items, x, y)) x += 1.5;
  addItem(makePart(pid, x, y));
}
function ensureVisible(o) {
  const ps = portsOf(o), r = svg.getBoundingClientRect();
  const ok = ps.every((p) => { const sx = p.pos[0] * C * view.k + view.x, sy = p.pos[1] * C * view.k + view.y; return sx > 30 && sx < r.width - 30 && sy > 30 && sy < r.height - 140; });
  if (!ok) { const c = ps[ps.length - 1].pos; view.x = r.width / 2 - c[0] * C * view.k; view.y = r.height / 2.6 - c[1] * C * view.k; applyView(); }
}
function startDraw(pid) { drawPid = pid; sel = null; activePort = null; closeLibMobile(); render(); updateUI(); }
function stopDraw() { drawPid = null; preview = null; render(); updateUI(); }

function snapPorts(myPorts, cands, maxD = 0.6) {
  let best = null;
  myPorts.forEach((mp) => cands.forEach((cp) => {
    if (mp.d[0] * cp.d[0] + mp.d[1] * cp.d[1] > -0.98) return;
    const d = dist(mp.pos, cp.pos);
    if (d < maxD && (!best || d < best.d)) best = { d, mp, cp };
  }));
  if (!best) return null;
  const r = compat(best.mp.t, best.cp.t);
  return { off: [best.cp.pos[0] - best.mp.pos[0], best.cp.pos[1] - best.mp.pos[1]], pos: best.cp.pos, ok: r.ok, msg: r.msg };
}
function placeNewPart(pid, wx, wy, cands) {
  const def = DEF[pid];
  let best = null;   // 1) automatisch passend ausrichten an nahem freien Anschluss
  cands.forEach((cp) => { if (dist(cp.pos, [wx, wy]) > 1.6) return;
    orientCandidates(def, cp).forEach((c) => { const d = dist([c.x, c.y], [wx, wy]); if (!best || d < best.d) best = { d, c, cp }; }); });
  if (best) return { obj: { id: '_p', type: 'part', pid, x: best.c.x, y: best.c.y, rot: best.c.rot, flip: best.c.flip }, snap: { pos: best.cp.pos, ok: true } };
  const o = { id: '_p', type: 'part', pid, x: snap5(wx), y: snap5(wy), rot: 0, flip: false };  // 2) normales Einrasten
  const sp = snapPorts(portsOf(o), cands);
  if (sp) { o.x += sp.off[0]; o.y += sp.off[1]; }
  return { obj: o, snap: sp };
}
function snapPoint(w, cands) {
  let best = null;
  cands.forEach((cp) => { const d = dist(cp.pos, w); if (d < 0.6 && (!best || d < best.d)) best = { d, cp }; });
  return best ? { pos: best.cp.pos.slice(), port: best.cp } : { pos: [snap5(w[0]), snap5(w[1])], port: null };
}
function angleSnap(from, w) {
  const v = [w[0] - from[0], w[1] - from[1]], L = Math.hypot(v[0], v[1]); if (L < 0.01) return from.slice();
  const ang = Math.round(Math.atan2(v[1], v[0]) / (Math.PI / 4)) * (Math.PI / 4), u = [Math.round(Math.cos(ang) * 1e6) / 1e6, Math.round(Math.sin(ang) * 1e6) / 1e6];
  const diag = Math.abs(u[0]) > 0.1 && Math.abs(u[1]) > 0.1, step = diag ? 0.5 * Math.SQRT2 : 0.5;
  const len = Math.max(step, Math.round((v[0] * u[0] + v[1] * u[1]) / step) * step);
  return [from[0] + u[0] * len, from[1] + u[1] * len];
}
function endSnapInfo(pipePid, end, other, port) {
  const L = dist(end, other) || 1, u = [(end[0] - other[0]) / L, (end[1] - other[1]) / L];
  let r = compat(DEF[pipePid].ports[0].t, port.t);
  if (r.ok && u[0] * port.d[0] + u[1] * port.d[1] > -0.98) r = { ok: false, msg: t('dirMismatch') };
  return { pos: end, ok: r.ok, msg: r.msg };
}

/* ------------------------------------------------------------------ Zeiger / Gesten */
const pointers = new Map();
let pinch = null;
function toWorld(e) { const r = svg.getBoundingClientRect(); return [(e.clientX - r.left - view.x) / view.k / C, (e.clientY - r.top - view.y) / view.k / C]; }
svg.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse' && e.button > 0) { if (e.button === 1) drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: true }; return; }
  svg.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, [e.clientX, e.clientY]);
  if (pointers.size === 2) {
    if (drag && drag.before && drag.moved && drag.kind !== 'pan') proj = JSON.parse(drag.before);
    drag = null; preview = null;
    const [p1, p2] = [...pointers.values()];
    pinch = { d0: Math.hypot(p1[0] - p2[0], p1[1] - p2[1]) || 1, k0: view.k, m0: [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2], vx: view.x, vy: view.y };
    A = analyze(proj.items); render(); return;
  }
  if (pointers.size > 2) return;
  const w = toWorld(e);
  const el = e.target.closest('[data-h],[data-port],[data-bad],[data-id]');
  const base = { sx: e.clientX, sy: e.clientY, w0: w, moved: false, before: snapshot() };
  if (drawPid) {
    const sp = snapPoint(w, analyze(proj.items).free);
    drag = { ...base, kind: 'draw', start: sp.pos, startPort: sp.port };
    preview = { kind: 'pipe', obj: { pid: drawPid, a: sp.pos, b: sp.pos.slice() } };
    renderOverlay(); return;
  }
  if (el && el.dataset.h) { drag = { ...base, kind: 'end', id: el.dataset.hid, end: el.dataset.h, cands: analyze(proj.items, el.dataset.hid).free }; return; }
  if (el && el.dataset.port != null) { drag = { ...base, kind: 'port', id: el.dataset.pid, idx: +el.dataset.port }; return; }
  if (el && el.dataset.bad != null) { drag = { ...base, kind: 'bad', msg: el.dataset.bad }; return; }
  if (el && el.dataset.id) {
    const o = byId(el.dataset.id);
    drag = { ...base, kind: 'move', id: o.id, orig: JSON.parse(JSON.stringify(o)), cands: analyze(proj.items, o.id).free };
    if (sel !== o.id) { sel = o.id; activePort = null; renderOverlay(); updateUI(); }
    return;
  }
  drag = { ...base, kind: 'pan', vx: view.x, vy: view.y };
});
svg.addEventListener('pointermove', (e) => {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, [e.clientX, e.clientY]);
  if (pinch && pointers.size >= 2) {
    const [p1, p2] = [...pointers.values()], d = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]), m = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
    const r = svg.getBoundingClientRect(), k = clampK(pinch.k0 * d / pinch.d0);
    const wx = (pinch.m0[0] - r.left - pinch.vx) / pinch.k0, wy = (pinch.m0[1] - r.top - pinch.vy) / pinch.k0;
    view.k = k; view.x = m[0] - r.left - wx * k; view.y = m[1] - r.top - wy * k; applyView(); return;
  }
  if (!drag) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5) return;
  drag.moved = true;
  const w = toWorld(e);
  if (drag.kind === 'pan') { view.x = drag.vx + e.clientX - drag.sx; view.y = drag.vy + e.clientY - drag.sy; svg.classList.add('panning'); applyView(); return; }
  if (drag.kind === 'draw') {
    let b = angleSnap(drag.start, w);
    const sp = snapPoint(w, analyze(proj.items).free.filter((p) => p !== drag.startPort && dist(p.pos, drag.start) > 0.3));
    drag.snap = null;
    if (sp.port) { b = sp.pos; drag.snap = endSnapInfo(drawPid, b, drag.start, sp.port); }
    else if (drag.startPort) { const r = compat(DEF[drawPid].ports[0].t, drag.startPort.t); if (!r.ok) drag.snap = { pos: drag.start, ok: false, msg: r.msg }; }
    preview.obj.b = b; renderOverlay(); return;
  }
  if (drag.kind === 'bad') return;
  if (drag.kind === 'move' || drag.kind === 'port') {
    if (drag.kind === 'port') { const o = byId(drag.id); Object.assign(drag, { kind: 'move', orig: JSON.parse(JSON.stringify(o)), cands: analyze(proj.items, o.id).free }); }
    const o = byId(drag.id), dx = w[0] - drag.w0[0], dy = w[1] - drag.w0[1];
    if (o.type === 'pipe') {
      const oa = drag.orig.a, ob = drag.orig.b;
      let off = [snap5(oa[0] + dx) - oa[0], snap5(oa[1] + dy) - oa[1]];
      const tmp = { ...drag.orig, a: [oa[0] + dx, oa[1] + dy], b: [ob[0] + dx, ob[1] + dy] };
      const sp = snapPorts(portsOf(tmp), drag.cands);
      if (sp) off = [dx + sp.off[0], dy + sp.off[1]];
      o.a = [oa[0] + off[0], oa[1] + off[1]]; o.b = [ob[0] + off[0], ob[1] + off[1]]; drag.snap = sp;
    } else {
      const tmp = { ...drag.orig, x: drag.orig.x + dx, y: drag.orig.y + dy };
      const sp = snapPorts(portsOf(tmp), drag.cands);
      if (sp) { o.x = tmp.x + sp.off[0]; o.y = tmp.y + sp.off[1]; } else { o.x = snap5(tmp.x); o.y = snap5(tmp.y); }
      drag.snap = sp;
    }
    A = analyze(proj.items); render(); return;
  }
  if (drag.kind === 'end') {
    const o = byId(drag.id), other = drag.end === 'a' ? o.b : o.a;
    const sp = snapPoint(w, drag.cands);
    let p = sp.port ? sp.pos : angleSnap(other, w);
    if (dist(p, other) < 0.25) p = angleSnap(other, w);
    o[drag.end] = p; o.len = null;
    drag.snap = sp.port ? endSnapInfo(o.pid, p, other, sp.port) : null;
    A = analyze(proj.items); render(); updateUI();
  }
});
function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pinch) { if (pointers.size < 2) pinch = null; return; }
  if (!drag) return;
  const d = drag; drag = null; svg.classList.remove('panning');
  if (d.kind === 'pan') { if (!d.moved && e.type === 'pointerup') { sel = null; activePort = null; render(); updateUI(); } return; }
  if (d.kind === 'draw') {
    const o = preview.obj; preview = null;
    if (dist(o.a, o.b) >= 0.45) {
      const p = makePipe(drawPid, o.a.slice(), o.b.slice()); proj.items.push(p); undoStack.push(d.before); redoStack = []; changed();
      const bad = A.conns.find((c) => !c.ok && (c.p1.obj === p || c.p2.obj === p)); if (bad) toast(bad.msg, 'bad', 5000);
    } else renderOverlay();
    return;
  }
  if (d.kind === 'bad') { toast(d.msg, 'bad', 5000); return; }
  if (d.kind === 'port') { activePort = activePort === d.idx ? null : d.idx; renderOverlay(); return; }
  if (d.moved) { undoStack.push(d.before); redoStack = []; changed(); if (d.snap && !d.snap.ok) toast(d.snap.msg, 'bad', 5000); }
  else { renderOverlay(); updateUI(); }
}
svg.addEventListener('pointerup', endPointer);
svg.addEventListener('pointercancel', endPointer);
const clampK = (k) => Math.max(0.15, Math.min(4, k));
function zoomAt(fac, sx, sy) { const k = clampK(view.k * fac); view.x = sx - (sx - view.x) * k / view.k; view.y = sy - (sy - view.y) * k / view.k; view.k = k; applyView(); }
svg.addEventListener('wheel', (e) => { e.preventDefault(); const r = svg.getBoundingClientRect();
  zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
function fitView() {
  const r = svg.getBoundingClientRect(), pts = [];
  proj.items.forEach((o) => { portsOf(o).forEach((p) => pts.push(p.pos)); if (o.type !== 'pipe') pts.push([o.x, o.y - 0.8]); });
  if (!pts.length) { view = { x: r.width / 2, y: r.height / 2.4, k: 1 }; applyView(); return; }
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs) - 1.5, x1 = Math.max(...xs) + 1.5, y0 = Math.min(...ys) - 1.5, y1 = Math.max(...ys) + 1.5;
  const padB = r.width < 760 ? 150 : 70;
  const k = clampK(Math.min(r.width / ((x1 - x0) * C), (r.height - padB) / ((y1 - y0) * C), 1.6));
  view.k = k; view.x = r.width / 2 - (x0 + x1) / 2 * C * k; view.y = (r.height - padB) / 2 - (y0 + y1) / 2 * C * k + 6; applyView();
}

/* ------------------------------------------------------------------ Aktionen */
function rotateSel() {
  const o = byId(sel); if (!o) return;
  pushUndo();
  if (o.type === 'pipe') { const v = [o.b[0] - o.a[0], o.b[1] - o.a[1]]; o.b = [o.a[0] - v[1], o.a[1] + v[0]]; changed(); return; }
  const def = DEF[o.pid], conns = portsOf(o).map((p) => ({ p, v: A.status.get(o.id + ':' + p.idx) })).filter((x) => x.v && x.v.s !== 'free');
  if (conns.length === 1 && conns[0].v.other) {
    // Lage wechseln, Verbindung bleibt erhalten
    const cands = orientCandidates(def, conns[0].v.other).filter((c) => c.j === conns[0].p.idx);
    if (cands.length > 1) {
      const cur = cands.findIndex((c) => Math.abs(c.x - o.x) < 1e-6 && Math.abs(c.y - o.y) < 1e-6 && samePorts(def, c, o));
      const n = cands[(cur + 1) % cands.length]; Object.assign(o, { x: n.x, y: n.y, rot: n.rot, flip: n.flip }); changed(); return;
    }
  }
  o.rot = (o.rot + 1) % 4; changed();
}
function flipSel() { const o = byId(sel); if (!o || o.type === 'pipe') return; pushUndo(); o.flip = !o.flip; changed(); }
function dupSel() {
  const o = byId(sel); if (!o) return;
  const c = JSON.parse(JSON.stringify(o)); c.id = uid();
  if (c.type === 'pipe') { c.a = [c.a[0] + 1, c.a[1] + 1]; c.b = [c.b[0] + 1, c.b[1] + 1]; } else { c.x += 1.5; c.y += 1.5; }
  addItem(c, '');
}
function delSel() { const o = byId(sel); if (!o) return; pushUndo(); proj.items = proj.items.filter((x) => x !== o); sel = null; changed(); toast(t('deleted') + ': ' + nm(DEF[o.pid]), '', 1500); }
function setPipeLen(o, cm) {
  if (!(cm > 0)) return; pushUndo();
  const ends = portsOf(o).map((p) => A.status.get(o.id + ':' + p.idx)?.s === 'free');
  const L = dist(o.a, o.b) || 1, u = [(o.b[0] - o.a[0]) / L, (o.b[1] - o.a[1]) / L], c = cm / CM;
  if (ends[1]) { o.b = [o.a[0] + u[0] * c, o.a[1] + u[1] * c]; o.len = null; }
  else if (ends[0]) { o.a = [o.b[0] - u[0] * c, o.b[1] - u[1] * c]; o.len = null; }
  else o.len = Math.round(cm);
  changed();
}

/* ------------------------------------------------------------------ Bibliothek */
/* Größen-Unterteilung je Kategorie (Chips). Rohrsystem-Kategorien teilen nach Rohrmaß, Gewinde-/Armaturen-Kategorien nach Zoll.
   Teile mit mehreren Größen (Reduzierungen, Übergänge) erscheinen unter jeder passenden Größe. */
const SIZE_ORDER = ['MV16', 'MV20', 'MV26', 'MV32', 'CU15', 'CU18', 'CU22', 'CU28', 'ES15', 'ES18', 'ES22', 'ES28', '3/8', '1/2', '3/4', '1'];
const SIZE_DN = { '3/8': 10, '1/2': 15, MV16: 15, CU15: 15, ES15: 15, MV20: 15, CU18: 15, ES18: 15, '3/4': 20, MV26: 20, CU22: 20, ES22: 20, '1': 25, MV32: 25, CU28: 25, ES28: 25 };
const isSys = (sz) => /^(MV|CU|ES)/.test(sz);
const sizeLabel = (sz) => (isSys(sz) ? sz.slice(2) + ' mm' : zoll(sz));
const libSizePref = (() => { try { return JSON.parse(localStorage.getItem('rp_libsize') || '{}'); } catch (_) { return {}; } })();
const CAT_SIZES = {};
function catSizeInfo(c) {
  if (CAT_SIZES[c.id]) return CAT_SIZES[c.id];
  const parts = PARTS.filter((p) => p.cat === c.id);
  const sizesOf = (p) => [...new Set(p.ports.map((x) => x.t.s))];
  const nSys = parts.filter((p) => p.ports.some((x) => isSys(x.t.s))).length;
  const mode = c.id === 'pipe' ? 'all' : (nSys * 2 > parts.length ? 'sys' : 'thr');
  const prim = (sz) => mode === 'all' || (mode === 'sys' ? isSys(sz) : !isSys(sz));
  const raw = new Map(parts.map((p) => [p.id, sizesOf(p).filter(prim)]));
  const chips = SIZE_ORDER.filter((sz) => [...raw.values()].some((a) => a.includes(sz)));
  const map = new Map();
  parts.forEach((p) => {
    let a = raw.get(p.id);
    if (!a.length) a = chips.filter((ch) => sizesOf(p).some((sz) => SIZE_DN[sz] === SIZE_DN[ch])); // z. B. Gewinde-Teil in Rohrsystem-Kategorie
    map.set(p.id, a.length ? a : chips);
  });
  return (CAT_SIZES[c.id] = { chips, map });
}
function chosenSize(c, info) {
  let v = libSizePref[c.id];
  if (v === 'all' || info.chips.includes(v)) return v;
  const g = libSizePref._last; // zuletzt gewählte Größe in anderer Kategorie → gleiche Nennweite
  if (g && g !== 'all') { const m = info.chips.find((ch) => ch === g) || info.chips.find((ch) => SIZE_DN[ch] === SIZE_DN[g]); if (m) return m; }
  return info.chips[0] || 'all'; // Standard: kleinste Größe statt alle gemischt
}
function buildLibrary() {
  const q = $('libSearch').value.trim().toLowerCase();
  const openCats = new Set([...document.querySelectorAll('.cat[open]')].map((d) => d.dataset.cat));
  const first = !document.querySelector('.cat');
  const scrollTop = $('libList').scrollTop;
  let h = '';
  CATEGORIES.forEach((c) => {
    const all = PARTS.filter((p) => p.cat === c.id && (!q || (p.de + ' ' + p.en + ' ' + p.id + ' ' + tx(p.desc)).toLowerCase().includes(q)));
    if (!all.length) return;
    const info = catSizeInfo(c), useChips = !q && info.chips.length > 1;
    const cur = useChips ? chosenSize(c, info) : 'all';
    const items = cur === 'all' ? all : all.filter((p) => info.map.get(p.id).includes(cur));
    const open = q || openCats.has(c.id) || (first && c.id === 'pipe');
    const chips = useChips ? `<div class="szchips" role="tablist" aria-label="${esc(t('sizeFilter'))}">`
      + ['all', ...info.chips].map((sz) => `<button type="button" role="tab" class="szchip${sz === cur ? ' on' : ''}" aria-selected="${sz === cur}" data-szcat="${c.id}" data-sz="${sz}">${sz === 'all' ? esc(t('allSizes')) : esc(sizeLabel(sz))}</button>`).join('') + '</div>' : '';
    h += `<details class="cat" data-cat="${c.id}" ${open ? 'open' : ''}><summary>${esc(c[lang])}<span class="cnt">${all.length}</span></summary>${chips}<div class="items">`
      + items.map((p) => `<div class="item" data-pid="${p.id}" title="${esc(tx(p.desc))}">${iconSVG(p)}<span>${esc(nm(p))}</span></div>`).join('') + '</div></details>';
  });
  $('libList').innerHTML = h || '<p class="lib-tip">–</p>';
  $('libList').scrollTop = scrollTop;
  updateUI();
}
$('libList').addEventListener('click', (e) => {
  const b = e.target.closest('.szchip'); if (!b) return;
  libSizePref[b.dataset.szcat] = b.dataset.sz; if (b.dataset.sz !== 'all') libSizePref._last = b.dataset.sz;
  try { localStorage.setItem('rp_libsize', JSON.stringify(libSizePref)); } catch (_) { /* egal */ }
  const chipsEl = b.parentElement, sl = chipsEl.scrollLeft;
  buildLibrary();
  const nb = $('libList').querySelector(`.szchips button[data-szcat="${b.dataset.szcat}"][data-sz="${b.dataset.sz}"]`);
  if (nb) { nb.parentElement.scrollLeft = sl; nb.focus({ preventScroll: true }); }
});
let lib = null;
const isMobile = () => window.innerWidth <= 760;
function closeLibMobile() { $('library').classList.remove('open'); }
$('libList').addEventListener('pointerdown', (e) => {
  const it = e.target.closest('.item'); if (!it || e.button > 0) return;
  lib = { pid: it.dataset.pid, sx: e.clientX, sy: e.clientY, type: e.pointerType, dragging: false, id: e.pointerId };
  if (e.pointerType !== 'mouse') lib.timer = setTimeout(() => { if (lib && !lib.cancel) startLibDrag(e); }, 380);
});
function startLibDrag(e) {
  lib.dragging = true; clearTimeout(lib.timer);
  if (navigator.vibrate) try { navigator.vibrate(15); } catch (_) { /* egal */ }
  const g = document.createElement('div'); g.id = 'ghost'; g.innerHTML = iconSVG(DEF[lib.pid]);
  Object.assign(g.style, { position: 'fixed', left: '0', top: '0', width: '90px', height: '56px', pointerEvents: 'none', zIndex: 30, opacity: '.85', filter: 'drop-shadow(0 4px 8px #0004)' });
  document.body.appendChild(g); lib.ghost = g; moveGhost(e.clientX, e.clientY);
  if (isMobile()) closeLibMobile();
  lib.cands = analyze(proj.items).free;
}
function moveGhost(x, y) { if (lib && lib.ghost) lib.ghost.style.transform = `translate(${x - 45}px,${y - 28}px)`; }
function overCanvas(x, y) { const r = svg.getBoundingClientRect(), el = document.elementFromPoint(x, y); return x > r.left && x < r.right && y > r.top && y < r.bottom && el && !el.closest('#library,#selBar,#zoomCtl,.modal,#topbar,#libOpen,#drawBanner'); }
function libPreview(x, y) {
  const r = svg.getBoundingClientRect(), w = [(x - r.left - view.x) / view.k / C, (y - r.top - view.y) / view.k / C], def = DEF[lib.pid];
  if (def.shape === 'pipe') {
    const sp = snapPoint(w, lib.cands), a = sp.pos, d = sp.port ? sp.port.d : [1, 0];
    let snap = null; if (sp.port) { const rr = compat(def.ports[0].t, sp.port.t); snap = { pos: a, ok: rr.ok, msg: rr.msg }; }
    return { obj: { id: '_p', type: 'pipe', pid: lib.pid, a, b: [a[0] + d[0] * 5, a[1] + d[1] * 5], len: null }, snap };
  }
  return placeNewPart(lib.pid, w[0], w[1], lib.cands);
}
window.addEventListener('pointermove', (e) => {
  if (!lib || e.pointerId !== lib.id) return;
  if (!lib.dragging) {
    if (Math.hypot(e.clientX - lib.sx, e.clientY - lib.sy) < 7) return;
    if (lib.type === 'mouse') startLibDrag(e); else { lib.cancel = true; clearTimeout(lib.timer); return; }
  }
  moveGhost(e.clientX, e.clientY);
  if (overCanvas(e.clientX, e.clientY)) {
    const p = libPreview(e.clientX, e.clientY);
    preview = { kind: p.obj.type === 'pipe' ? 'pipe' : 'part', obj: p.obj }; drag = { snap: p.snap, kind: 'lib' }; lib.ghost.style.opacity = '0'; lib.place = p;
  } else { preview = null; drag = null; lib.ghost.style.opacity = '.85'; lib.place = null; }
  renderOverlay();
});
function libUp(e) {
  if (!lib || e.pointerId !== lib.id) return;
  const L = lib; lib = null; clearTimeout(L.timer);
  if (L.ghost) L.ghost.remove();
  if (L.dragging) {
    preview = null; drag = null;
    if (e.type === 'pointerup' && L.place && overCanvas(e.clientX, e.clientY)) {
      const o = L.place.obj; o.id = uid();
      addItem(o, L.place.snap && L.place.snap.ok ? 'attached' : 'placed');
    } else renderOverlay();
    return;
  }
  if (e.type === 'pointerup' && !L.cancel) { if (isMobile()) closeLibMobile(); tapAdd(L.pid); }
}
window.addEventListener('pointerup', libUp);
window.addEventListener('pointercancel', libUp);
$('libList').addEventListener('touchmove', (e) => { if (lib && lib.dragging) e.preventDefault(); }, { passive: false });
$('libList').addEventListener('contextmenu', (e) => e.preventDefault());
$('libSearch').addEventListener('input', buildLibrary);

/* ------------------------------------------------------------------ Partnerlinks (AWIN) */
// HeizungsDiscount24 (AWIN advertiserId 120593, Publisher 3127037). Shop-Suche erwartet ISO-8859-1 (Umlaute als %FC usw.).
const HD24 = { mid: 120593, aff: 3127037, search: 'https://www.heizungsdiscount24.de/shop/system/?func=searchcheck&sbeg=' };
const SHOP_PREFIX = { mvpress: 'Verbundrohr', mvschraub: 'Verbundrohr', mvsteck: 'Verbundrohr', cupress: 'Kupfer', cuklemm: 'Kupfer', culoet: 'Kupfer', espress: 'Edelstahl', msgew: 'Messing', tg: 'Temperguss' };
// geprüfte Ersatz-Suchbegriffe (null = Shop führt das Teil nicht -> kein Button)
const SHOP_Q = {"mvp-b45-MV16":"Verbundrohr Winkel 45 Press 16x2","mvp-b45-MV20":"Verbundrohr Winkel 45 Press 20x2","mvp-b45-MV26":"Verbundrohr Winkel 45 Press 26x3","mvp-b45-MV32":"Verbundrohr Winkel 45 Press 32x3","mvs-b45-MV16":"Verbundrohr Winkel 45 Schraub 16x2","mvs-b45-MV20":"Verbundrohr Winkel 45 Schraub 20x2","mvs-b45-MV26":"Verbundrohr Winkel 45 Schraub 26x3","cup-red-CU28-CU22":"Reduzierung Press 28 22","mvk-b45-MV16":"Verbundrohr Winkel 45 Steck 16x2","mvk-b45-MV20":"Verbundrohr Winkel 45 Steck 20x2","mvk-b45-MV26":"Verbundrohr Winkel 45 Steck 26x3","cuk-t-CU15":"T-Stück Klemm 15","cuk-uag-CU15-12":"Übergang Klemm 15 1/2","cuk-uig-CU15-12":"Übergang Klemm 15 1/2","cuk-tig-CU15-12":"T-Stück Klemm 15 1/2","cuk-uag-CU15-34":"Übergang Klemm 15 3/4","cuk-uig-CU15-34":"Übergang Klemm 15 3/4","cuk-tig-CU15-34":"T-Stück Klemm 15 3/4","cuk-t-CU18":"T-Stück Klemm 18","cuk-uag-CU18-12":"Übergang Klemm 18 1/2","cuk-uig-CU18-12":"Übergang Klemm 18 1/2","cuk-tig-CU18-12":"T-Stück Klemm 18 1/2","cuk-uag-CU18-34":"Übergang Klemm 18 3/4","cuk-uig-CU18-34":"Übergang Klemm 18 3/4","cuk-tig-CU18-34":"T-Stück Klemm 18 3/4","cuk-t-CU22":"T-Stück Klemm 22","cuk-uag-CU22-34":"Übergang Klemm 22 3/4","cuk-uig-CU22-34":"Übergang Klemm 22 3/4","cuk-tig-CU22-34":"T-Stück Klemm 22 3/4","cuk-uag-CU22-1":"Übergang Klemmverschraubung 22 1","cuk-uig-CU22-1":"Übergang Klemmverschraubung 22 1","cuk-tig-CU22-1":"T-Stück Klemm 22 1","cuk-t-CU28":"T-Stück Klemm 28","cuk-uag-CU28-1":"Übergang Klemm 28 1","cuk-uig-CU28-1":"Übergang Klemm 28 1","cuk-tig-CU28-1":"T-Stück Klemm 28 1","cuk-red-CU18-CU15":"Reduzierung Klemm 18 15","cuk-red-CU22-CU18":"Reduzierung Klemm 22 18","cuk-red-CU22-CU15":"Reduzierung Klemm 22 15","cuk-red-CU28-CU22":"Reduzierung Klemm 28 22","cul-red-CU28-CU22":"Reduzierung Löt 28 22","ssv-12":"Schrägsitzventil","ws-mv16":"Wandscheibe","ws-mv16s":"Wandscheibe","sg-34":"Sicherheitsgruppe 3/4","hws-34":"Hauswasserstation","wz-15":"Wasserzähler","wz-20":"Wasserzähler","fj-34":"Durchströmungsarmatur","pump-15-130":"Heizungs-Umwälzpumpe","pump-25-180":"Heizungs-Umwälzpumpe","hblk-e":null,"alh-12":null,"alh-34":null,"wmv-12":null,"rb-12":null,"rb-34":null,"wzb-34":null,"wzb-1":null,"keckv-12":null};
function shopQuery(def) {
  if (def.id in SHOP_Q) return SHOP_Q[def.id];
  let n = def.de.split(' / ')[0];
  for (const k in ZOLL) n = n.split(ZOLL[k]).join(' ' + k + ' ');
  n = n.replace('Alu-Verbundrohr', 'Mehrschichtverbundrohr').replace(/(\d)×(\d)/g, '$1x$2').replace(/[×→°()]/g, ' ')
    .replace(/(^|\s)(IG|AG|ÜM)(\/(IG|AG|ÜM))?(?=\s|$)/g, ' ').replace(/\s+/g, ' ').trim();
  n = n.replace(/\s\d+ (mm|cm)\b/g, '').replace(/\s(mit|ohne)\s.*$/, '').replace(/flachdichtend|Schrägsitz-/g, '').replace(/^Membran-Druckbehälter/, 'Ausdehnungsgefäß Trinkwasser').trim();
  if (def.cat === 'mvpress') n = n.replace(/^Winkel 90 Press/, 'Press-Winkel');
  n = [...new Set(n.split(' '))].join(' ');
  if (def.id.startsWith('eckv')) n = n.split(' ').slice(0, 2).join(' ');
  if (/-ln-/.test(def.id)) return n;
  const pre = SHOP_PREFIX[def.cat];
  return pre && !n.includes(pre) ? pre + ' ' + n : n;
}
const enc1 = (q) => Array.from(q).map((ch) => { const c = ch.charCodeAt(0); return /[A-Za-z0-9\-_.~\/]/.test(ch) ? ch : c < 256 ? '%' + c.toString(16).toUpperCase().padStart(2, '0') : ''; }).join('');
const hd24Url = (def) => HD24.search + enc1(shopQuery(def));
const hd24Link = (def) => `https://www.awin1.com/cread.php?awinmid=${HD24.mid}&awinaffid=${HD24.aff}&ued=${encodeURIComponent(hd24Url(def))}`;
const affBtn = (def) => shopQuery(def) == null ? '' : `<a class="aff-btn" href="${esc(hd24Link(def))}" target="_blank" rel="sponsored noopener">${lang === 'de' ? 'bei HeizungsDiscount24 ansehen' : 'view at HeizungsDiscount24'}*</a> <span class="aff-tag">${lang === 'de' ? 'Anzeige' : 'Ad'}</span>`;

/* ------------------------------------------------------------------ Teileliste */
function partsRows() {
  const cnt = new Map(), pipeCm = [];
  proj.items.forEach((o) => { const v = o.type === 'pipe' ? pipeLenCm(o) : 1; cnt.set(o.pid, (cnt.get(o.pid) || 0) + v); if (o.type === 'pipe') pipeCm.push([o.pid, v]); });
  (proj.routes || []).forEach((r) => (r.gen ? r.gen.extra : []).forEach(([pid, q]) => { cnt.set(pid, (cnt.get(pid) || 0) + q); if (DEF[pid].shape === 'pipe') pipeCm.push([pid, q]); }));
  const rows = [];
  CATEGORIES.forEach((c) => PARTS.filter((p) => p.cat === c.id && cnt.has(p.id)).forEach((p) => rows.push({ cat: c, def: p, q: cnt.get(p.id) })));
  [...clampCounts(pipeCm).entries()].sort((a, b) => SIZE_ORDER.indexOf(a[0]) - SIZE_ORDER.indexOf(b[0])).forEach(([s, n]) => rows.push({ cat: CLAMP_CAT, def: clampDef(s), q: n }));
  return rows;
}
const fmtNum = (n, d = 2) => n.toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
function qtyOf(r, bars) {
  if (r.def.shape !== 'pipe') return { q: String(r.q), u: t('pcs'), extra: '' };
  const m = r.q / 100, bar = r.def.pipe.bar, need = m * 1.1, n = Math.ceil(need / bar - 1e-9), s = r.def.ports[0].t.s;
  const roll = ROLLS[s] && need > 10 ? ROLLS[s].find((x) => x >= need) : null;
  return { q: fmtNum(m), u: 'm', extra: bars ? LL(`+10 % = ${fmtNum(need)} m → ${n} Stange(n) à ${bar} m`, `+10 % = ${fmtNum(need)} m → ${n} bar(s) of ${bar} m`) + (roll ? LL(` oder 1 Rolle ${roll} m`, ` or 1 roll of ${roll} m`) : '') : '' };
}
function listTable(bars) {
  const rows = partsRows(); if (!rows.length) return `<p>${t('emptyList')}</p>`;
  let h = `<table class="plist"><thead><tr><th></th><th style="text-align:right">${t('qty')}</th><th>${t('unit')}</th><th>${t('name')}</th></tr></thead><tbody>`, last = null;
  rows.forEach((r) => {
    if (r.cat !== last) { h += `<tr class="grp"><td colspan="4">${esc(r.cat[lang])}</td></tr>`; last = r.cat; }
    const q = qtyOf(r, bars);
    h += `<tr><td class="ico">${iconSVG(r.def)}</td><td class="q">${q.q}</td><td>${q.u}</td><td><b>${esc(nm(r.def))}</b>${q.extra ? ` <span style="color:#1f6feb;font-weight:600">${q.extra}</span>` : ''}<div class="d">${esc(tx(r.def.desc))}</div><div class="aff">${affBtn(r.def)}</div></td></tr>`;
  });
  const nParts = rows.filter((r) => r.def.shape !== 'pipe').reduce((a, r) => a + r.q, 0), m = rows.filter((r) => r.def.shape === 'pipe').reduce((a, r) => a + r.q, 0) / 100;
  return h + `</tbody></table><p style="font-weight:700">${t('summary', { n: nParts, m: fmtNum(m) })}</p>`
    + `<p class="aff aff-foot">* ${lang === 'de' ? 'Partnerlink (Anzeige): Kaufst du darüber, bekomme ich eine kleine Provision, für dich ändert sich der Preis nicht. Der Link führt zur Shop-Suche, bitte Größe und Ausführung vor dem Kauf prüfen.' : 'Affiliate link (ad): if you buy through it, I receive a small commission at no extra cost to you. The link opens the shop search, please check size and type before buying.'} <a href="#partnerlinks" data-legal="partnerlinks">${lang === 'de' ? 'Mehr zu Partnerlinks' : 'More about affiliate links'}</a></p>`;
}
function showList() {
  const bars = localStorage.getItem('rp_bars') !== '0';
  openModal(t('partsList'), `<div class="row-actions"><button id="lShop" class="primary">🛒 ${LL('Einkaufsliste (1 Klick)', 'Shopping list (1 click)')}</button><button id="lCsv">⬇ ${t('csv')}</button><button id="lPrint">🖨 ${t('print')}</button>
    <label><input type="checkbox" id="lBars" ${bars ? 'checked' : ''}> ${t('barsOpt')}</label></div><div id="lTable">${listTable(bars)}</div><div class="disclaimer">${t('disclaimerLong')} <a href="#haftung" data-legal="haftung">${t('moreLegal')}</a></div>`);
  $('lBars').onchange = () => { localStorage.setItem('rp_bars', $('lBars').checked ? '1' : '0'); $('lTable').innerHTML = listTable($('lBars').checked); };
  $('lCsv').onclick = () => exportCSV($('lBars').checked);
  $('lShop').onclick = showShop;
  $('lPrint').onclick = doPrint;
}
function csvText(bars) {
  const q = (s) => '"' + String(s).replace(/"/g, '""') + '"';
  const lines = [[t('cat'), t('qty'), t('unit'), t('name'), t('desc'), 'ID'].map(q).join(';')];
  partsRows().forEach((r) => { const x = qtyOf(r, bars); lines.push([r.cat[lang], x.q, x.u, nm(r.def) + (x.extra ? ' ' + x.extra : ''), tx(r.def.desc), r.def.id].map(q).join(';')); });
  return '\ufeff' + lines.join('\r\n') + '\r\n';
}
function download(name, text, type) {
  const blob = new Blob([text], { type }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
const fileBase = () => (proj.name || 'projekt').replace(/[^\wäöüÄÖÜß\- ]+/g, '').trim().replace(/\s+/g, '_') || 'projekt';
function exportCSV(bars) { download(fileBase() + '_Teileliste.csv', csvText(bars), 'text/csv;charset=utf-8'); }
function drawingSVG() {
  const pts = []; proj.items.forEach((o) => { portsOf(o).forEach((p) => pts.push(p.pos)); if (o.type !== 'pipe') pts.push([o.x, o.y]); });
  if (!pts.length) return '';
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = (Math.min(...xs) - 1.2) * C, y0 = (Math.min(...ys) - 1.4) * C, w = (Math.max(...xs) - Math.min(...xs) + 2.4) * C, h = (Math.max(...ys) - Math.min(...ys) + 2.6) * C;
  const lens = proj.items.filter((o) => o.type === 'pipe').map((o) => {
    const mx = (o.a[0] + o.b[0]) / 2 * C, my = (o.a[1] + o.b[1]) / 2 * C, L = dist(o.a, o.b) || 1, u = [(o.b[0] - o.a[0]) / L, (o.b[1] - o.a[1]) / L];
    return `<text x="${f1(mx + u[1] * 18)}" y="${f1(my - u[0] * 18 + 4)}" text-anchor="middle" style="font:700 15px sans-serif" fill="#1f2630">${pipeLenCm(o)} cm</text>`; }).join('');
  return `<svg class="drawing" xmlns="http://www.w3.org/2000/svg" viewBox="${f1(x0)} ${f1(y0)} ${f1(w)} ${f1(h)}"><defs><pattern id="braidP" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#d5dae0"/><path d="M0 0V6M3 0V6" stroke="#9aa3ad" stroke-width="1.2"/></pattern></defs>`
    + worldG.innerHTML.split('url(#braid)').join('url(#braidP)') + lens + '</svg>';
}
function buildPrint() {
  const bars = localStorage.getItem('rp_bars') !== '0';
  const medName = { tw: t('medTw'), tww: t('medTww'), hz: t('medHz') }[proj.medium];
  $('printArea').innerHTML = `<h1>${esc(proj.name)}</h1><div class="meta">${t('medium')}: <b>${medName}</b> · ${t('date')}: ${new Date().toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB')} · Rohrplaner</div>`
    + drawingSVG() + `<h2>${t('partsHead')}</h2>` + listTable(bars) + `<h2>${t('hintsHead')}</h2>` + hintsHTML();
}
function doPrint() { buildPrint(); setTimeout(() => window.print(), 50); }
window.addEventListener('beforeprint', buildPrint);

/* ------------------------------------------------------------------ Projekte */
const savedAll = () => JSON.parse(localStorage.getItem('rp_projects') || '{}');
function loadProject(p, msg = true) {
  let skipped = 0;
  const items = (p.items || []).filter((o) => { const ok = DEF[o.pid]; if (!ok) skipped++; return ok; });
  proj = { v: 1, name: p.name || t('untitled'), medium: p.medium || 'tw', items, routes: Array.isArray(p.routes) ? p.routes : [], seq: p.seq || items.length + 1 };
  (proj.routes || []).forEach((r) => { const n = +String(r.id).replace(/\D/g, ''); if (n >= proj.seq) proj.seq = n + 1; });
  proj.items.forEach((o) => { const n = +String(o.id).replace(/\D/g, ''); if (n >= proj.seq) proj.seq = n + 1; });
  sel = null; activePort = null; drawPid = null; undoStack = []; redoStack = []; if (typeof RU !== 'undefined') { RU.rid = null; RU.node = null; }
  if (proj.routes.length) regenAll();
  changed(); fitView();
  if (skipped) toast(t('unknownParts', { n: skipped }), 'warn');
  else if (msg) toast(t('loaded', { name: proj.name }), 'ok', 1800);
}
function exampleProject(ex) {
  // kleine Bau-API für Beispielprojekte (siehe examples.js)
  const P = { v: 1, name: tx(ex.name), medium: ex.medium, items: [], seq: 1 }, mk = () => 'o' + (P.seq++);
  const add = (o, what) => { if (!o) throw new Error('Beispiel: ' + what + ' passt nicht'); o.id = mk(); P.items.push(o); return o; };
  const B = {
    place: (pid, x, y, rot = 0, flip = false) => add({ type: 'part', pid, x, y, rot, flip }, pid),
    attach: (pid, target, portIdx = null, pick = null) => add(attachNew(P.items, pid, target, portIdx, 5, pick), pid),
    pipe: (pid, target, portIdx = null, cm = 50) => add(attachNew(P.items, pid, target, portIdx, cm / CM), pid),
  };
  const s = proj.seq; ex.build(B); proj.seq = s;
  return P;
}
function openProjects() {
  const S = savedAll(), loc = lang === 'de' ? 'de-DE' : 'en-GB';
  const exs = (window.RP_EXAMPLES || []).map((ex, i) => `<div class="proj"><b>${esc(tx(ex.name))}</b><small>${esc(tx(ex.desc))}</small><div class="pa"><button class="primary" data-ex="${i}">${t('open')}</button></div></div>`).join('');
  const mine = Object.keys(S).sort().map((n) => `<div class="proj"><b>${esc(n)}</b><small>${S[n].items.length} ${t('parts')} · ${S[n].savedAt ? new Date(S[n].savedAt).toLocaleString(loc) : ''}</small><div class="pa"><button data-open="${esc(n)}">${t('open')}</button><button class="danger" data-del="${esc(n)}">${t('del')}</button></div></div>`).join('') || `<p class="lib-tip">${t('noSaved')}</p>`;
  openModal(t('projects'), `<div class="row-actions"><button id="pNew">＋ ${t('newProj')}</button><button id="pSave" class="primary">💾 ${t('saveCur')}</button></div>
    <h3>${t('examples')}</h3><div class="proj-grid">${exs}</div>
    <h3>${t('myProj')}</h3><div class="proj-grid">${mine}</div>
    <h3>${t('file')}</h3><div class="row-actions"><button id="pFileSave">⬇ ${t('saveFile')}</button><button id="pFileOpen">⬆ ${t('openFile')}</button><input type="file" id="pFile" accept=".json,application/json" hidden></div>
    <h3>${t('experimental')}</h3><label class="row-actions"><input type="checkbox" id="pAi" ${settings.ai ? 'checked' : ''}> ${t('aiToggle')}</label>
    <div id="aiBox" class="ai-box" ${settings.ai ? '' : 'hidden'}><textarea id="aiText" placeholder="${esc(t('aiPh'))}"></textarea><div class="row-actions"><button id="aiGo">✨ ${t('aiBtn')}</button><span id="aiOut" class="lib-tip"></span></div></div>`);
  const body = $('modalBody');
  body.querySelectorAll('[data-ex]').forEach((b) => (b.onclick = () => { const ex = window.RP_EXAMPLES[+b.dataset.ex]; closeModal(); loadProject(exampleProject(ex)); }));
  body.querySelectorAll('[data-open]').forEach((b) => (b.onclick = () => { closeModal(); loadProject(savedAll()[b.dataset.open]); }));
  body.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { if (!confirm(t('confirmDel', { name: b.dataset.del }))) return; const s = savedAll(); delete s[b.dataset.del]; localStorage.setItem('rp_projects', JSON.stringify(s)); openProjects(); }));
  $('pNew').onclick = () => { if (proj.items.length && !confirm(t('confirmNew'))) return; closeModal(); loadProject(newProject(), false); };
  $('pSave').onclick = () => { const n = prompt(t('namePrompt'), proj.name); if (!n) return; proj.name = n.trim(); const s = savedAll(); s[proj.name] = { ...JSON.parse(snapshot()), savedAt: Date.now() }; localStorage.setItem('rp_projects', JSON.stringify(s)); changed(); toast(t('saved', { name: proj.name }), 'ok'); openProjects(); };
  $('pFileSave').onclick = () => download(fileBase() + '.rohrplaner.json', JSON.stringify(proj, null, 1), 'application/json');
  $('pFileOpen').onclick = () => $('pFile').click();
  $('pFile').onchange = (e) => { const f = e.target.files[0]; if (!f) return; f.text().then((txt) => { try { const p = JSON.parse(txt); if (!Array.isArray(p.items)) throw new Error('x'); closeModal(); loadProject(p); } catch (_) { toast(t('badFile'), 'bad'); } }); };
  $('pAi').onchange = () => { settings.ai = $('pAi').checked; localStorage.setItem('rp_settings', JSON.stringify(settings)); $('aiBox').hidden = !settings.ai; };
  $('aiGo').onclick = () => { window.RP_AI.suggest($('aiText').value, proj).then((r) => ($('aiOut').textContent = r), () => ($('aiOut').textContent = t('aiStub'))); };
}

/* ------------------------------------------------------------------ Dialoge */
function openModal(title, html) { $('modalTitle').textContent = title; $('modalBody').innerHTML = html; $('modal').hidden = false; }
function closeModal() { $('modal').hidden = true; }
$('modalClose').onclick = closeModal;
$('modal').addEventListener('pointerdown', (e) => { if (e.target === $('modal')) closeModal(); });
const legalLinksHTML = () => `<p class="legal-inline">${['impressum', 'datenschutz', 'haftung'].map((k) => `<a href="#${k}" data-legal="${k}">${t({ impressum: 'imprint', datenschutz: 'privacy', haftung: 'disclaimerLink' }[k])}</a>`).join(' · ')}</p>`;
$('btnInfo').onclick = () => openModal(t('info'), (window.RP_INFO[lang] || window.RP_INFO.de).replace('{disc}', t('disclaimerLong')).replace('{legal}', legalLinksHTML()));
/* Rechtliches (legal.js): Impressum, Haftung, Partnerlinks, Datenschutz */
let legalOpen = null;
function openLegal(sec = 'impressum') {
  const L = window.RP_LEGAL[lang] || window.RP_LEGAL.de;
  legalOpen = sec;
  openModal(L.title, `<nav class="legal-toc">${L.toc.map(([id, n]) => `<button data-legal="${id}" class="${id === sec ? 'primary' : ''}">${n}</button>`).join('')}
    <button id="legalLang" class="small" title="Sprache / Language">${lang === 'de' ? 'English' : 'Deutsch'}</button></nav><div class="legal-body">${L.html}</div>`);
  $('legalLang').onclick = () => { $('btnLang').onclick(); openLegal(legalOpen); };
  setTimeout(() => scrollLegal(sec, false), 0);
}
function scrollLegal(sec, smooth) {
  const el = $('lg-' + sec), body = $('modalBody'), toc = body.querySelector('.legal-toc'); if (!el || !toc) return;
  const top = el.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop - toc.offsetHeight - 4;
  body.scrollTo({ top: sec === 'impressum' ? 0 : top, behavior: smooth ? 'smooth' : 'auto' });
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-legal]'); if (!a) return;
  e.preventDefault(); const sec = a.dataset.legal;
  if (!$('modal').hidden && $('lg-' + sec)) { legalOpen = sec; $('modalBody').querySelectorAll('.legal-toc [data-legal]').forEach((b) => b.classList.toggle('primary', b.dataset.legal === sec)); scrollLegal(sec, true); }
  else openLegal(sec);
});
const LEGAL_HASH = ['impressum', 'haftung', 'partnerlinks', 'datenschutz'];
function legalFromHash() { const h = location.hash.slice(1).toLowerCase(); if (LEGAL_HASH.includes(h)) openLegal(h); }
window.addEventListener('hashchange', legalFromHash);
$('btnHints').onclick = () => openModal(t('hints'), hintsHTML());
$('btnList').onclick = showList;
$('btnMenu').onclick = openProjects;
$('emptyExamples').onclick = openProjects;
$('btnUndo').onclick = undo; $('btnRedo').onclick = redo;
$('selRot').onclick = rotateSel; $('selFlip').onclick = flipSel; $('selDup').onclick = dupSel; $('selDel').onclick = delSel;
$('selLen').addEventListener('change', () => { const o = byId(sel); if (o && o.type === 'pipe') setPipeLen(o, +$('selLen').value); });
$('selLen').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });
$('selLenReset').onclick = () => { const o = byId(sel); if (o && o.type === 'pipe' && o.len != null) { pushUndo(); o.len = null; changed(); } };
$('zoomIn').onclick = () => { const r = svg.getBoundingClientRect(); zoomAt(1.25, r.width / 2, r.height / 2); };
$('zoomOut').onclick = () => { const r = svg.getBoundingClientRect(); zoomAt(0.8, r.width / 2, r.height / 2); };
$('zoomFit').onclick = fitView;
$('drawDone').onclick = stopDraw;
$('libOpen').onclick = () => $('library').classList.add('open');
$('libClose').onclick = closeLibMobile;
$('projName').addEventListener('change', () => { pushUndo(); proj.name = $('projName').value.trim() || t('untitled'); changed(); });
$('medium').addEventListener('change', () => {
  pushUndo(); proj.medium = $('medium').value; regenAll(); changed();
  const H = computeHints().filter((h) => h.lvl !== 'info'); if (H.length) toast('⚠ ' + H[0].msg, 'warn', 5000);
});
$('btnLang').onclick = () => { lang = lang === 'de' ? 'en' : 'de'; localStorage.setItem('rp_lang', lang); applyLang(); };
function applyLang() {
  document.documentElement.lang = lang; $('btnLang').textContent = lang === 'de' ? 'EN' : 'DE';
  document.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll('[data-i18n-title]').forEach((el) => (el.title = t(el.dataset.i18nTitle)));
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
  A = analyze(proj.items); buildLibrary(); render(); updateUI();
}
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input,textarea,select')) return;
  const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
  if (mod && k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
  else if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
  else if (mod && k === 'd') { e.preventDefault(); dupSel(); }
  else if (k === 'r' && !mod) rotateSel();
  else if (k === 'f' && !mod) flipSel();
  else if (k === 'delete' || k === 'backspace') { if (sel) { e.preventDefault(); delSel(); } }
  else if (k === 'escape') { if (!$('modal').hidden) closeModal(); else if (RU.on) stopRouteMode(); else if (drawPid) stopDraw(); else { sel = null; activePort = null; render(); updateUI(); } }
});
window.addEventListener('resize', () => renderOverlay());

/* ------------------------------------------------------------------ Start */
function boot() {
  applyLang();
  const cur = localStorage.getItem('rp_current');
  try { loadProject(cur ? JSON.parse(cur) : newProject(), false); } catch (_) { loadProject(newProject(), false); }
  if (!localStorage.getItem('rp_seen')) {
    localStorage.setItem('rp_seen', '1'); const s = $('splash'); s.hidden = false;
    setTimeout(() => s.classList.add('hide'), 900); setTimeout(() => (s.hidden = true), 1500);
  }
  legalFromHash();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    // neue Version übernommen -> einmal neu laden, damit sofort die aktuellen Dateien laufen
    const hadSW = !!navigator.serviceWorker.controller; let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadSW && !reloaded) { reloaded = true; location.reload(); } });
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((r) => r.update()).catch(() => {});
  }
}
/* ================================================================== Zeichenmodus (Leitung zeichnen, Fittinge automatisch) */
const LL = (de, en) => (lang === 'de' ? de : en);
const SYSTEMS = [
  { id: 'mvs', cat: 'mvschraub', de: 'Alu-Verbund + Schraubfittinge', en: 'Multilayer + compression' },
  { id: 'mvp', cat: 'mvpress', de: 'Alu-Verbund + Pressfittinge', en: 'Multilayer + press' },
  { id: 'mvk', cat: 'mvsteck', de: 'Alu-Verbund + Steckfittinge', en: 'Multilayer + push-fit' },
  { id: 'cup', cat: 'cupress', de: 'Kupfer + Pressfittinge', en: 'Copper + press' },
  { id: 'cuk', cat: 'cuklemm', de: 'Kupfer + Klemmverschraubung', en: 'Copper + compression' },
  { id: 'cul', cat: 'culoet', de: 'Kupfer + Lötfittinge', en: 'Copper + solder' },
  { id: 'esp', cat: 'espress', de: 'Edelstahl + Pressfittinge', en: 'Stainless + press' },
  { id: 'st', cat: 'tg', de: 'Stahlrohr verzinkt + Gewinde (Temperguss)', en: 'Galvanized steel + threaded' },
];
const SYS = Object.fromEntries(SYSTEMS.map((s) => [s.id, s]));
const teq = (a, b) => a && b && a.k === b.k && a.s === b.s && (a.tech || '') === (b.tech || '');
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const near = (a, b) => Math.abs(a[0] - b[0]) < 0.01 && Math.abs(a[1] - b[1]) < 0.01;
function fitT(sys, size) {
  if (sys.id === 'st') return { k: 'ig', s: size };
  for (const p of PARTS) if (p.cat === sys.cat) for (const q of p.ports) if (q.t.k === 'sock' && q.t.s === size) return { k: 'sock', s: size, tech: q.t.tech };
  return null;
}
const pipeTOf = (sys, size) => (sys.id === 'st' ? { k: 'ag', s: size } : { k: 'pipe', s: size });
const pipePidOf = (sys, size) => (PARTS.find((p) => p.cat === 'pipe' && teq(p.ports[0].t, pipeTOf(sys, size))) || {}).id;
function findFit(sys, size, n, test) {
  const ft = fitT(sys, size); if (!ft) return null;
  const c = PARTS.filter((p) => p.cat === sys.cat && p.ports.length === n && p.ports.every((q) => teq(q.t, ft)) && test(p.ports.map((q) => q.d)));
  return c.length ? c[0].id : null;
}
const elbowPid = (sys, size) => findFit(sys, size, 2, (d) => Math.abs(dot(d[0], d[1])) < 0.01);
const teePid = (sys, size) => findFit(sys, size, 3, (d) => dot(d[0], d[1]) < -0.99 && Math.abs(dot(d[0], d[2])) < 0.01);
const couplingPid = (sys, size) => findFit(sys, size, 2, (d) => dot(d[0], d[1]) < -0.99);
function sysSizes(sys) { const s = new Set(); PARTS.forEach((p) => { if (p.cat === sys.cat) p.ports.forEach((q) => s.add(q.t.s)); }); return SIZE_ORDER.filter((z) => s.has(z) && elbowPid(sys, z) && pipePidOf(sys, z)); }
const SYS_OPTS = []; SYSTEMS.forEach((s) => sysSizes(s).forEach((z) => SYS_OPTS.push({ sys: s.id, size: z })));
/* Übergänge suchen (Breitensuche über gerade Zwei-Wege-Fittinge) */
const ADP_CACHE = {};
function adapters(sys) {
  if (ADP_CACHE[sys.id]) return ADP_CACHE[sys.id];
  const cats = [sys.cat, 'msgew'].concat(sys.id === 'st' ? [] : ['tg']);
  const list = [];
  cats.forEach((c) => PARTS.forEach((p) => { if (p.cat === c && p.ports.length === 2 && /^(fit|union)$/.test(p.shape) && !/-ln-/.test(p.id) && dot(p.ports[0].d, p.ports[1].d) < -0.99 && p.ports.every((q) => Math.abs(q.y) < 0.01)) list.push(p); }));
  return (ADP_CACHE[sys.id] = list);
}
function chainSteps(sys, from, to) {
  if (compat(from, to).ok) return [];
  const seen = new Set([JSON.stringify(from)]); let fr = [{ open: from, steps: [] }];
  for (let depth = 0; depth < 3; depth++) {
    const nx = [];
    for (const st of fr) for (const a of adapters(sys)) for (let i = 0; i < 2; i++) {
      if (!compat(st.open, a.ports[i].t).ok) continue;
      const open = a.ports[1 - i].t, steps = st.steps.concat([{ pid: a.id, i, o: 1 - i }]);
      if (compat(open, to).ok) return steps;
      const k = JSON.stringify(open); if (seen.has(k)) continue; seen.add(k); nx.push({ open, steps });
    }
    fr = nx;
  }
  return null;
}
function orient(pid, want) {
  const ps = DEF[pid].ports;
  for (const flip of [false, true]) for (let rot = 0; rot < 4; rot++)
    if (want.every(([i, v]) => near(tf(ps[i].d[0], ps[i].d[1], rot, flip), v))) return { rot, flip };
  return null;
}
const pinOf = (pid, i, o) => tf(DEF[pid].ports[i].x, DEF[pid].ports[i].y, o.rot, o.flip);
const THR = { '3/8': '3/8', '1/2': '12', '3/4': '34', '1': '1' };
const DN_THR = { 10: '3/8', 15: '1/2', 20: '3/4', 25: '1' };
function variant(base, size) {
  const want = DN_THR[SIZE_DN[size]] || '1/2', order = ['3/8', '1/2', '3/4', '1'];
  const idx = order.indexOf(want), tries = [want].concat(order.slice(idx + 1), order.slice(0, idx).reverse());
  for (const z of tries) if (DEF[base + '-' + THR[z]]) return base + '-' + THR[z];
  return DEF[base] ? base : null;
}
const COMPS = [
  { id: 'kh', kind: 'inline', de: 'Kugelhahn', en: 'Ball valve', pid: (s) => variant('kh', s) },
  { id: 'ssv', kind: 'inline', de: 'Absperrventil (Schrägsitz)', en: 'Stop valve', pid: (s) => variant('ssv', s) },
  { id: 'rv', kind: 'inline', de: 'Rückflussverhinderer', en: 'Check valve', pid: (s) => variant('rv', s) },
  { id: 'ffil', kind: 'inline', de: 'Filter', en: 'Filter', pid: (s) => variant('ffil', s) },
  { id: 'dmk', kind: 'inline', de: 'Druckminderer', en: 'Pressure reducer', pid: (s) => variant('dmk', s) },
  { id: 'wz', kind: 'inline', de: 'Wasserzähler', en: 'Water meter', pid: (s) => (SIZE_DN[s] >= 20 ? 'wz-20' : 'wz-15') },
  { id: 'kv', kind: 'inline', de: 'Kappenventil (Absperrung)', en: 'Cap valve', pid: (s) => variant('kv', s) },
  { id: 'sg', kind: 'corner', de: 'Sicherheitsgruppe (nur an einer Ecke)', en: 'Safety group (corner only)', pid: () => 'sg-34' },
  { id: 'tee', kind: 'branch', de: 'T-Stück (Abzweig 50 cm, offen)', en: 'T-piece (50 cm branch, open)', br: [] },
  { id: 'teekh', kind: 'branch', de: 'T-Stück + Kugelhahn im Abzweig', en: 'T-piece + ball valve on branch', br: ['kh'] },
  { id: 'kfe', kind: 'branch', de: 'Entleerung (T-Stück + KFE-Hahn)', en: 'Drain (T-piece + drain cock)', br: ['@kfe'] },
  { id: 'mag', kind: 'branch', de: 'Ausdehnungsgefäß mit Kappenventil', en: 'Expansion vessel with cap valve', br: ['kv', '@vessel'] },
  { id: 'mag0', kind: 'branch', de: 'Ausdehnungsgefäß ohne Absperrung', en: 'Expansion vessel without shut-off', br: ['@vessel'] },
];
const COMP = Object.fromEntries(COMPS.map((c) => [c.id, c]));
const TERMS = [
  { id: 'open', de: 'offenes Rohrende', en: 'open pipe end' },
  ...['1/2', '3/4', '1'].flatMap((z) => [{ id: 'ig' + z, t: { k: 'ig', s: z }, de: `Anschluss mit Innengewinde ${zoll(z)}`, en: `${zoll(z)} female connection` },
    { id: 'ag' + z, t: { k: 'ag', s: z }, de: `Anschluss mit Außengewinde ${zoll(z)}`, en: `${zoll(z)} male connection` }]),
  { id: 'haus', dev: 'haus', t: { k: 'ag', s: '3/4' }, de: 'Hausanschluss / Wasserzähler (AG ¾″)', en: 'House connection / meter (¾″ M)' },
  { id: 'ws', dev: 'ws', t: { k: 'ig', s: '3/4' }, de: 'Warmwasserspeicher Kaltwasser-Zulauf (IG ¾″)', en: 'Hot water tank cold inlet (¾″ F)' },
  { id: 'wp', dev: 'wp', t: { k: 'ag', s: '1' }, de: 'Wärmepumpe (AG 1″)', en: 'Heat pump (1″ M)' },
  { id: 'kessel', dev: 'kessel', t: { k: 'ag', s: '3/4' }, de: 'Heizkessel / Therme (AG ¾″)', en: 'Boiler (¾″ M)' },
  { id: 'hk', dev: 'hk', t: { k: 'ag', s: '1/2' }, de: 'Heizkörper (AG ½″)', en: 'Radiator (½″ M)' },
];
const TERM = Object.fromEntries(TERMS.map((x) => [x.id, x]));
const DEVN = { haus: ['Hausanschluss', 'House conn.'], ws: ['Speicher', 'Tank'], wp: ['Wärmepumpe', 'Heat pump'], kessel: ['Kessel', 'Boiler'], hk: ['Heizkörper', 'Radiator'] };
const sgn = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);
const uDir = (a, b) => [sgn(b.x - a.x), sgn(b.y - a.y)];

function buildRoute(r) {
  const sys = SYS[r.sys], size = r.size, out = [], warn = [], extra = new Map();
  const addX = (pid, q) => { if (pid) extra.set(pid, (extra.get(pid) || 0) + q); };
  const P = r.pts; r.gen = { warn, extra: [] };
  if (!sys || P.length < 2) { r.gen.extra = []; return out; }
  const pT = pipeTOf(sys, size), pPid = pipePidOf(sys, size), eP = elbowPid(sys, size), tP = teePid(sys, size);
  const mk = (pid, pos, o) => { const it = makePart(pid, snap5(pos[0] * 100) / 100, pos[1], o.rot, o.flip); it.x = pos[0]; it.y = pos[1]; it.gen = r.id; out.push(it); return it; };
  let pipeStart = null;
  const pipeTo = (pos, n) => {
    if (pipeStart && dist(pipeStart, pos) > 0.04) {
      const back = (pos[0] - pipeStart[0]) * (n ? n[0] : 0) + (pos[1] - pipeStart[1]) * (n ? n[1] : 0) < -0.01;
      if (back) warn.push(LL('Zu wenig Platz für die Fittinge – Abschnitt verlängern', 'Not enough room for fittings – make the section longer'));
      else { const p = makePipe(pPid, pipeStart.slice(), pos.slice()); p.gen = r.id; out.push(p); }
    }
    else if (pipeStart) warn.push(LL('Zwei Fittinge direkt aneinander – Abstand vergrößern, damit ein Stück Rohr dazwischen passt', 'Two fittings touch – leave room for a pipe piece'));
    pipeStart = null;
  };
  // gerade Kette entlang dir ab pos platzieren, gibt Endposition zurück
  const stepLen = (st, dir) => { const o = orient(st.pid, [[st.i, [-dir[0], -dir[1]]], [st.o, dir]]); if (!o) return null; const a = pinOf(st.pid, st.i, o), b = pinOf(st.pid, st.o, o); return { o, a, b, len: dot([b[0] - a[0], b[1] - a[1]], dir) }; };
  const chainLen = (steps, dir) => steps.reduce((s, st) => s + ((stepLen(st, dir) || { len: 0 }).len), 0);
  const placeChain = (steps, pos, dir) => {
    let cur = pos.slice();
    steps.forEach((st) => { const g = stepLen(st, dir); if (!g) return; const c = [cur[0] - g.a[0], cur[1] - g.a[1]]; mk(st.pid, c, g.o); cur = [c[0] + g.b[0], c[1] + g.b[1]]; });
    return cur;
  };
  const compSteps = (pid) => { const ps = DEF[pid].ports; const a = chainSteps(sys, pT, ps[0].t), b = chainSteps(sys, ps[1].t, pT); return a && b ? a.concat([{ pid, i: 0, o: 1 }], b) : null; };
  const nodeName = (i) => LL('Punkt ', 'point ') + (i + 1);
  // Start
  const u0 = uDir(P[0], P[1]), st0 = r.start === 'port' && r.from ? { t: r.from.t } : TERM[r.start] || TERM.open;
  if (st0.t) { const ch = chainSteps(sys, st0.t, pT); if (ch) pipeStart = placeChain(ch, [P[0].x, P[0].y], u0); else { warn.push(LL('Kein passender Übergang am Start gefunden', 'No matching adapter at start')); pipeStart = [P[0].x, P[0].y]; } }
  else pipeStart = [P[0].x, P[0].y];
  for (let i = 1; i < P.length; i++) {
    const n = P[i], np = [n.x, n.y], uin = uDir(P[i - 1], n), last = i === P.length - 1;
    const dh = (n.h || 0) - (P[i - 1].h || 0);
    if (last) {
      if (dh) { addX(eP, 1); addX(pPid, Math.abs(dh)); }
      const te = TERM[r.end] || TERM.open;
      if (te.t) {
        const ch = chainSteps(sys, pT, te.t);
        if (ch) { const L = chainLen(ch, uin), s0 = [np[0] - uin[0] * L, np[1] - uin[1] * L]; pipeTo(s0, uin); placeChain(ch, s0, uin); }
        else { warn.push(LL('Kein passender Übergang am Ende gefunden', 'No matching adapter at end')); pipeTo(np, uin); }
      } else pipeTo(np, uin);
      break;
    }
    const uout = uDir(n, P[i + 1]), straight = near(uin, uout), comp = COMP[n.comp];
    if (dot(uin, uout) < -0.5) { warn.push(nodeName(i) + ': ' + LL('Leitung läuft zurück', 'route reverses')); }
    if (dh) { addX(eP, straight ? 2 : 1); addX(pPid, Math.abs(dh)); }
    if (comp && comp.kind === 'corner' && !straight) {
      const pid = comp.pid(size), o = orient(pid, [[0, [-uin[0], -uin[1]]], [1, uout]]);
      const a = chainSteps(sys, pT, DEF[pid].ports[0].t), b = chainSteps(sys, DEF[pid].ports[1].t, pT);
      if (o && a && b) {
        const pin = pinOf(pid, 0, o), pout = pinOf(pid, 1, o), pi = dot(pin, uout), po = dot(pout, uin);
        const c = [np[0] - uout[0] * pi - uin[0] * po, np[1] - uout[1] * pi - uin[1] * po];
        const inPos = [c[0] + pin[0], c[1] + pin[1]], L = chainLen(a, uin), s0 = [inPos[0] - uin[0] * L, inPos[1] - uin[1] * L];
        pipeTo(s0, uin); placeChain(a, s0, uin); mk(pid, c, o);
        pipeStart = placeChain(b, [c[0] + pout[0], c[1] + pout[1]], uout); continue;
      }
      warn.push(nodeName(i) + ': ' + LL('Sicherheitsgruppe passt hier nicht', 'safety group does not fit here'));
    } else if (comp && comp.kind === 'corner') warn.push(nodeName(i) + ': ' + LL('Sicherheitsgruppe braucht eine Ecke (Eingang seitlich, Ausgang nach oben/vorne)', 'safety group needs a corner'));
    if (comp && comp.kind !== 'corner' && !straight) warn.push(nodeName(i) + ': ' + LL(nm(comp) + ' geht nicht an einer Ecke – auf ein gerades Stück setzen', nm(comp) + ' cannot sit on a corner'));
    if (!straight) {
      const o = orient(eP, [[0, [-uin[0], -uin[1]]], [1, uout]]);
      pipeTo([np[0] - uin[0] * 0.5, np[1] - uin[1] * 0.5], uin); mk(eP, np, o); pipeStart = [np[0] + uout[0] * 0.5, np[1] + uout[1] * 0.5]; continue;
    }
    if (!comp || comp.kind === 'corner') continue;
    if (comp.kind === 'inline') {
      const pid = comp.pid(size), steps = pid && compSteps(pid);
      if (!steps) { warn.push(nodeName(i) + ': ' + LL('kein passender Übergang für ', 'no adapter for ') + nm(comp)); continue; }
      const L = chainLen(steps, uin), s0 = [np[0] - uin[0] * L / 2, np[1] - uin[1] * L / 2];
      pipeTo(s0, uin); pipeStart = placeChain(steps, s0, uin); continue;
    }
    // Abzweig
    const side = n.side === -1 ? [uin[1], -uin[0]] : [-uin[1], uin[0]];
    const o = orient(tP, [[0, [-uin[0], -uin[1]]], [1, uin], [2, side]]);
    if (!tP || !o) { warn.push(nodeName(i) + ': ' + LL('kein T-Stück im System', 'no tee in system')); continue; }
    pipeTo([np[0] - uin[0] * 0.5, np[1] - uin[1] * 0.5], uin); mk(tP, np, o); pipeStart = [np[0] + uin[0] * 0.5, np[1] + uin[1] * 0.5];
    const save = pipeStart; let bp = [np[0] + side[0] * 0.5, np[1] + side[1] * 0.5];
    const brParts = comp.br.map((b) => (b === '@vessel' ? (proj.medium === 'hz' ? 'mag-34' : 'mdb-34') : b === '@kfe' ? variant('kfe', size) : COMP[b].pid(size)));
    if (!brParts.length && n.noStub) { pipeStart = save; continue; }
    pipeStart = bp; let pos = [bp[0] + side[0] * (brParts.length ? 3 : 5), bp[1] + side[1] * (brParts.length ? 3 : 5)];
    pipeTo(pos, side); if (!brParts.length && out.length && out[out.length - 1].type === 'pipe') out[out.length - 1].stub = { rid: r.id, i };
    let open = pT, okB = true;
    for (const pid of brParts) {
      const ps = DEF[pid].ports, ch = chainSteps(sys, open, ps[0].t);
      if (!ch) { okB = false; break; }
      pos = placeChain(ch, pos, side);
      if (ps.length === 1) { const oo = orient(pid, [[0, [-side[0], -side[1]]]]); const pn = pinOf(pid, 0, oo); mk(pid, [pos[0] - pn[0], pos[1] - pn[1]], oo); open = null; break; }
      pos = placeChain([{ pid, i: 0, o: 1 }], pos, side); open = ps[1].t;
    }
    if (!okB) warn.push(nodeName(i) + ': ' + LL('Abzweig-Teil passt nicht ohne Übergang', 'branch part has no adapter'));
    pipeStart = save;
  }
  r.gen.extra = [...extra.entries()];
  return out;
}
function regenRoute(r) { proj.items = proj.items.filter((o) => o.gen !== r.id).concat(buildRoute(r)); }
function regenAll() { (proj.routes || []).forEach(regenRoute); }

/* ---------- Rohrschellen & Längen ---------- */
const CLAMP_CM = { MV16: 50, MV20: 60, MV26: 70, MV32: 80 };
const CLAMP_MM = { '1/2': 21, '3/4': 27, '1': 34 };
const clampDef = (s) => {
  const mm = isSys(s) ? +s.slice(2) : CLAMP_MM[s], id = 'schelle-' + s.replace('/', '');
  if (!DEF[id]) { DEF[id] = { id, virtual: true, cat: 'clamp', shape: 'clamp', mat: 'st', ports: [], de: `Rohrschelle ${mm} mm`, en: `Pipe clamp ${mm} mm`,
    desc: { de: `für Rohr ${sizeLabel(s)}, Abstand ca. ${CLAMP_CM[s] || 80} cm, automatisch gezählt`, en: `for ${sizeLabel(s)} pipe, approx. every ${CLAMP_CM[s] || 80} cm, counted automatically` } };
    SHOP_Q[id] = `Rohrschelle ${mm} mm`; }
  return DEF[id];
};
const CLAMP_CAT = { id: 'clamp', de: 'Befestigung (automatisch)', en: 'Fixing (automatic)' };
function clampCounts(pipeCm) {
  const m = new Map();
  pipeCm.forEach(([pid, cm]) => { const s = DEF[pid].ports[0].t.s, sp = CLAMP_CM[s] || 80; if (cm < 20) return; m.set(s, (m.get(s) || 0) + Math.max(1, Math.ceil(cm / sp))); });
  return m;
}
const ROLLS = { MV16: [50, 100, 200], MV20: [50, 100], MV26: [25, 50], MV32: [25, 50] };

/* ---------- Prüfungen ---------- */
const SHUT = /^(kv|kh|khrv|ssv|ksg)-/;
function routeHints() {
  const H = [], med = proj.medium;
  (proj.routes || []).forEach((r, ri) => (r.gen ? r.gen.warn : []).forEach((w) => H.push({ lvl: 'warn', msg: LL('Leitung ', 'Route ') + (ri + 1) + ': ' + w })));
  const ids = proj.items.map((o) => o.pid), has = (re) => ids.some((x) => re.test(x));
  const devs = new Set(); (proj.routes || []).forEach((r) => [r.start, r.end].forEach((e) => TERM[e] && TERM[e].dev && devs.add(TERM[e].dev)));
  if (med !== 'hz' && (devs.has('ws') || devs.has('wp')) && !has(/^sg-/)) H.push({ lvl: 'bad', msg: LL('Vor dem Warmwasserspeicher/der Wärmepumpe (Trinkwasser) fehlt die Sicherheitsgruppe (Sicherheitsventil + Rückflussverhinderer + Absperrung). Pflicht nach DIN 1988!', 'Safety group missing before the hot water tank / heat pump (drinking water).') });
  if (med === 'hz' && (devs.has('wp') || devs.has('kessel'))) {
    if (!has(/^sv-hz/)) H.push({ lvl: 'warn', msg: LL('Heizung mit Wärmeerzeuger: Sicherheitsventil (3 bar) einplanen.', 'Heating with heat source: add a safety valve (3 bar).') });
    if (!has(/^(mag|mdb)-/)) H.push({ lvl: 'warn', msg: LL('Heizung: Ausdehnungsgefäß (MAG) fehlt.', 'Heating: expansion vessel missing.') });
  }
  if (med !== 'hz' && devs.has('haus') && !has(/^(ffil|hws|rsf)-/)) H.push({ lvl: 'warn', msg: LL('Nach dem Hausanschluss/Wasserzähler gehört ein Filter (Pflicht nach DIN 1988-200).', 'A filter is required after the house connection/meter.') });
  // Ausdehnungsgefäß ohne Absperrung? (Verbindungen bis zum nächsten Abzweig verfolgen)
  const adj = new Map(); A.conns.filter((c) => c.ok).forEach((c) => { [[c.p1.obj, c.p2.obj], [c.p2.obj, c.p1.obj]].forEach(([a, b]) => (adj.get(a.id) || adj.set(a.id, []).get(a.id)).push(b)); });
  proj.items.filter((o) => /^(mag|mdb)-/.test(o.pid)).forEach((v) => {
    let cur = [v], seen = new Set([v.id]), ok = false;
    for (let d = 0; d < 8 && cur.length && !ok; d++) {
      const nx = [];
      cur.forEach((o) => (adj.get(o.id) || []).forEach((b) => { if (seen.has(b.id)) return; seen.add(b.id); if (SHUT.test(b.pid)) ok = true; else if (b.type === 'pipe' || DEF[b.pid].ports.length === 2) nx.push(b); }));
      cur = nx;
    }
    if (!ok) H.push({ lvl: 'warn', msg: LL('Vor dem Ausdehnungsgefäß fehlt eine Absperrung (Kappenventil), sonst kann es nicht gewartet werden.', 'Shut-off (cap valve) missing before the expansion vessel.') });
  });
  return H;
}

/* ---------- Zustand & UI ---------- */
const RU = { on: false, rid: null, node: null, sys: localStorage.getItem('rp_rsys') || 'mvs|MV20', h: 0 };
const curRoute = () => (proj.routes || []).find((r) => r.id === RU.rid) || null;
function routeEdit(fn) { pushUndo(); fn(); const r = curRoute(); if (r) regenRoute(r); changed(); routePanel(); }
function startRouteMode() { stopDraw(); RU.on = true; sel = null; if (!curRoute()) RU.rid = null; RU.node = null; $('routePanel').hidden = false; closeLibMobile(); render(); updateUI(); routePanel(); toast(LL('Zeichnen: Tippe den Startpunkt, dann die Ecken und den Endpunkt.', 'Draw: tap the start point, then corners and end point.'), 'ok', 4000); }
function stopRouteMode() { RU.on = false; RU.node = null; $('routePanel').hidden = true; render(); updateUI(); }
const optHTML = (arr, val, lab) => arr.map((x) => `<option value="${esc(x.v)}" ${x.v === val ? 'selected' : ''}>${esc(lab(x))}</option>`).join('');
function routePanel() {
  const r = curRoute(), el = $('routePanel'); if (!RU.on) return;
  const sv = r ? r.sys + '|' + r.size : RU.sys;
  const sysSel = optHTML(SYS_OPTS.map((o) => ({ v: o.sys + '|' + o.size, o })), sv, (x) => nm(SYS[x.o.sys]) + ' · ' + sizeLabel(x.o.size) + (x.o.sys.startsWith('mv') ? ' (' + ({ MV16: '16×2', MV20: '20×2', MV26: '26×3', MV32: '32×3' }[x.o.size]) + ')' : ''));
  const tOpts = (v) => optHTML(TERMS.map((x) => ({ v: x.id, x })), v, (x) => nm(x.x));
  const nd = r && RU.node != null ? r.pts[RU.node] : null;
  const compOpts = `<option value="">${LL('– nichts –', '– none –')}</option>` + COMPS.map((c) => `<option value="${c.id}" ${nd && nd.comp === c.id ? 'selected' : ''}>${esc(nm(c))}</option>`).join('');
  el.innerHTML = `<div class="rp-row"><button id="rMin" class="small" title="${LL('Ein-/ausklappen', 'Collapse')}">${RU.min ? '▸' : '▾'}</button><b>✏️ ${LL('Leitung zeichnen', 'Draw route')}</b>
    <label>${LL('System', 'System')} <select id="rSys">${sysSel}</select></label>
    <label>${LL('Start', 'Start')} ${r && r.start === 'port' ? `<select id="rStart" disabled><option>${LL('Anschluss am Teil', 'Port of part')}: ${esc(fmtPort(r.from.t))}</option></select>` : `<select id="rStart">${tOpts(r ? r.start : 'open')}</select>`}</label>
    <label>${LL('Ende', 'End')} <select id="rEnd">${tOpts(r ? r.end : 'open')}</select></label></div>
    <div class="rp-row"><label>${LL('Höhe neuer Punkte', 'Height of new points')} <input id="rH" type="number" step="5" value="${RU.h}" inputmode="numeric"> cm</label>
    <label>${LL('Einfügen', 'Insert')} <select id="rIns">${'<option value="">' + LL('– Punkte setzen –', '– add points –') + '</option>' + COMPS.map((c) => `<option value="${c.id}" ${RU.ins === c.id ? 'selected' : ''}>${esc(nm(c))}</option>`).join('')}</select></label>
    <span class="rp-tip">${!RU.ins && A.free.length ? '<span class="rp-plus">＋</span> ' + LL('= offener Anschluss: antippen zum Weiterzeichnen · ', '= open port: tap to continue · ') : ''}${RU.ins ? LL('Tippe auf die Leitung, wo das Teil hin soll', 'Tap the route where the part goes') : r ? LL('Tippe den nächsten Punkt · Punkt antippen = bearbeiten', 'Tap next point · tap a point to edit') : LL('Tippe den Startpunkt', 'Tap the start point')}</span></div>
    ${nd ? `<div class="rp-row rp-node"><b>${LL('Punkt', 'Point')} ${RU.node + 1}</b>
      <label>${LL('Höhe', 'Height')} <input id="nH" type="number" step="5" value="${nd.h || 0}" inputmode="numeric"> cm</label>
      ${RU.node > 0 && RU.node < r.pts.length - 1 ? `<label>${LL('Teil', 'Part')} <select id="nComp">${compOpts}</select></label>` : ''}
      ${nd.comp && COMP[nd.comp].kind === 'branch' ? `<button id="nSide">⇆ ${LL('Seite', 'Side')}</button>` : ''}
      <button id="nDel" class="danger">🗑 ${LL('Punkt', 'Point')}</button><button id="nClose">✕</button></div>` : ''}
    <div class="rp-row"><button id="rBack" ${r ? '' : 'disabled'}>↶ ${LL('Letzter Punkt', 'Last point')}</button>
    <button id="rSide">↕ ${LL('Seitenansicht', 'Side view')}</button><button id="rNew">＋ ${LL('Neue Leitung', 'New route')}</button>
    <button id="rDelR" class="danger" ${r ? '' : 'disabled'}>🗑 ${LL('Leitung', 'Route')}</button><button id="rDone" class="primary">${LL('Fertig', 'Done')}</button></div>`;
  $('rSys').onchange = () => { RU.sys = $('rSys').value; localStorage.setItem('rp_rsys', RU.sys); if (r) routeEdit(() => { [r.sys, r.size] = RU.sys.split('|'); }); };
  $('rStart').onchange = () => { RU.start = $('rStart').value; if (r) routeEdit(() => (r.start = RU.start)); };
  $('rEnd').onchange = () => { RU.end = $('rEnd').value; if (r) routeEdit(() => (r.end = RU.end)); };
  $('rH').onchange = () => { RU.h = +$('rH').value || 0; };
  $('rIns').onchange = () => { RU.ins = $('rIns').value; routePanel(); renderOverlay(); };
  $('rBack').onclick = () => { if (!r) return; if (r.pts.length <= 1) { routeEdit(() => delRoute(r)); return; } routeEdit(() => r.pts.pop()); RU.node = null; routePanel(); };
  $('rSide').onclick = showSideView;
  $('rNew').onclick = () => { RU.rid = null; RU.node = null; routePanel(); renderOverlay(); toast(LL('Tippe den Startpunkt der neuen Leitung', 'Tap the start of the new route'), '', 2500); };
  $('rDelR').onclick = () => { if (r && confirm(LL('Diese Leitung mit allen automatischen Teilen löschen?', 'Delete this route and its parts?'))) routeEdit(() => delRoute(r)); };
  $('rDone').onclick = stopRouteMode;
  el.classList.toggle('min', !!RU.min); $('rMin').onclick = () => { RU.min = !RU.min; routePanel(); };
  if (nd) {
    $('nH').onchange = () => routeEdit(() => (nd.h = +$('nH').value || 0));
    if ($('nComp')) $('nComp').onchange = () => routeEdit(() => { nd.comp = $('nComp').value || null; });
    if ($('nSide')) $('nSide').onclick = () => routeEdit(() => (nd.side = nd.side === -1 ? 1 : -1));
    $('nClose').onclick = () => { RU.node = null; routePanel(); renderOverlay(); };
    $('nDel').onclick = () => {
      const i = RU.node, a = r.pts[i - 1], b = r.pts[i + 1];
      if (a && b && a.x !== b.x && a.y !== b.y) { toast(LL('Eckpunkt kann nicht gelöscht werden – zuerst die folgenden Punkte entfernen', 'Corner cannot be deleted'), 'warn'); return; }
      RU.node = null; routeEdit(() => { r.pts.splice(i, 1); if (r.pts.length < 1) delRoute(r); });
    };
  }
}
function delRoute(r) { proj.items = proj.items.filter((o) => o.gen !== r.id); proj.routes = proj.routes.filter((x) => x !== r); RU.rid = null; RU.node = null; }
function segHit(r, w) {
  for (let i = 1; i < r.pts.length; i++) {
    const a = r.pts[i - 1], b = r.pts[i];
    if (a.y === b.y && Math.abs(w[1] - a.y) < 0.7 && w[0] > Math.min(a.x, b.x) + 0.6 && w[0] < Math.max(a.x, b.x) - 0.6) return { i, p: { x: Math.round(w[0]), y: a.y } };
    if (a.x === b.x && Math.abs(w[0] - a.x) < 0.7 && w[1] > Math.min(a.y, b.y) + 0.6 && w[1] < Math.max(a.y, b.y) - 0.6) return { i, p: { x: a.x, y: Math.round(w[1]) } };
  }
  return null;
}
function portSys(p) {
  const t0 = p.t, def = DEF[p.obj.pid], [cs, cz] = RU.sys.split('|');
  if (t0.k === 'sock') { const sy = SYSTEMS.find((x) => x.cat === def.cat && teq(fitT(x, t0.s), t0)) || SYSTEMS.find((x) => teq(fitT(x, t0.s), t0)); if (sy) return [sy.id, t0.s]; }
  if (t0.k === 'pipe') { const pre = t0.s.slice(0, 2), sy = pre === 'MV' ? (cs.startsWith('mv') ? cs : 'mvs') : pre === 'CU' ? (cs.startsWith('cu') ? cs : 'cup') : 'esp'; if (SYS_OPTS.some((o) => o.sys === sy && o.size === t0.s)) return [sy, t0.s]; }
  if (t0.k === 'ag' && def.cat === 'pipe') return ['st', t0.s];
  return [cs, cz];
}
function startFromPort(p) {
  if (Math.abs(p.d[0]) > 0.01 && Math.abs(p.d[1]) > 0.01) { toast(LL('Schräger Anschluss (45°) – bitte zuerst einen Winkel anstecken', 'Angled port (45°) – attach an elbow first'), 'warn'); return; }
  pushUndo();
  let pos = p.pos.slice(), d = p.d.map(Math.round), t0 = p.t, [sy, sz] = portSys(p);
  if (p.obj.stub) { const pr = (proj.routes || []).find((x) => x.id === p.obj.stub.rid), nd = pr && pr.pts[p.obj.stub.i];
    if (nd) { nd.noStub = true; regenRoute(pr); const L = dist(p.obj.a, p.obj.b); pos = [p.pos[0] - d[0] * L, p.pos[1] - d[1] * L]; t0 = fitT(SYS[pr.sys], pr.size); sy = pr.sys; sz = pr.size; } }
  const r = { id: 'r' + (proj.seq++), sys: sy, size: sz, start: 'port', from: { pos, d, t: t0 }, end: 'open', pts: [{ x: pos[0], y: pos[1], h: RU.h }] };
  (proj.routes = proj.routes || []).push(r); RU.rid = r.id; RU.node = null; RU.ins = ''; regenRoute(r); changed(); routePanel();
  toast(LL('Weiterzeichnen ab ', 'Continue from ') + fmtPort(t0) + LL(' – tippe den nächsten Punkt in Anschlussrichtung', ' – tap the next point in port direction'), 'ok', 4000);
}
function routeTap(w) {
  let r = curRoute();
  if (!RU.ins) { const fp = A.free.filter((p) => dist(p.pos, w) < 0.5).sort((a, b) => dist(a.pos, w) - dist(b.pos, w))[0];
    if (fp) { const own = (proj.routes || []).find((x) => { const l = x.pts[x.pts.length - 1]; return x.pts.length > 1 && (x.end || 'open') === 'open' && Math.hypot(l.x - fp.pos[0], l.y - fp.pos[1]) < 0.3; });
      if (own) { RU.rid = own.id; RU.node = null; routePanel(); renderOverlay(); toast(LL('Leitung wird verlängert – tippe den nächsten Punkt', 'Extending route – tap next point'), 'ok', 2500); return; }
      startFromPort(fp); return; } }
  // Punkt einer Leitung antippen
  for (const rr of proj.routes || []) { const k = rr.pts.findIndex((p) => Math.hypot(p.x - w[0], p.y - w[1]) < 0.6); if (k >= 0) { RU.rid = rr.id; RU.node = k; routePanel(); renderOverlay(); return; } }
  if (RU.ins) {
    for (const rr of proj.routes || []) { const h = segHit(rr, w); if (h) {
      RU.rid = rr.id; const ins = RU.ins, prev = rr.pts[h.i - 1];
      routeEdit(() => rr.pts.splice(h.i, 0, { x: h.p.x, y: h.p.y, h: prev.h || 0, comp: ins, side: 1 }));
      RU.node = h.i; RU.ins = ''; routePanel(); renderOverlay(); toast(LL('Eingefügt: ', 'Inserted: ') + nm(COMP[ins]), 'ok', 1800); return; } }
    toast(LL('Tippe genau auf eine gerade Leitung', 'Tap on a straight section of the route'), 'warn'); return;
  }
  RU.node = null;
  if (!r) {
    const [s, z] = RU.sys.split('|');
    r = { id: 'r' + (proj.seq++), sys: s, size: z, start: RU.start || 'open', end: RU.end || 'open', pts: [{ x: Math.round(w[0]), y: Math.round(w[1]), h: RU.h }] };
    pushUndo(); (proj.routes = proj.routes || []).push(r); RU.rid = r.id; changed(); routePanel(); return;
  }
  const lp = r.pts[r.pts.length - 1], dx = w[0] - lp.x, dy = w[1] - lp.y;
  let np = Math.abs(dx) >= Math.abs(dy) ? { x: Math.round(w[0]), y: lp.y } : { x: lp.x, y: Math.round(w[1]) };
  if (r.start === 'port' && r.from && r.pts.length === 1) { const d = r.from.d, L = Math.round(dx * d[0] + dy * d[1]);
    if (L < 2) { toast(LL('Die erste Strecke muss vom Anschluss weg zeigen (mind. 20 cm)', 'First section must lead away from the port (min. 20 cm)'), 'warn'); return; }
    np = { x: lp.x + d[0] * L, y: lp.y + d[1] * L }; }
  if (Math.hypot(np.x - lp.x, np.y - lp.y) < 2) { toast(LL('Mindestens 20 cm Abstand zum letzten Punkt', 'At least 20 cm from the last point'), 'warn', 1800); return; }
  if (r.pts.length >= 2) { const pp = r.pts[r.pts.length - 2], u = uDir(pp, lp), v = uDir(lp, np); if (dot(u, v) < -0.5) { toast(LL('Leitung kann nicht zurücklaufen', 'Route cannot reverse'), 'warn'); return; }
    if (near(u, v) && !lp.comp && (lp.h || 0) === (pp.h || 0) && r.pts.length >= 2 && (lp.h || 0) === RU.h) { routeEdit(() => { lp.x = np.x; lp.y = np.y; }); return; } }
  routeEdit(() => r.pts.push({ x: np.x, y: np.y, h: RU.h }));
}
// Zeiger im Zeichenmodus (eigene Behandlung: tippen = Punkt, ziehen = verschieben der Ansicht)
let rp = null;
svg.addEventListener('pointerdown', (e) => {
  if (!RU.on) return;
  e.stopImmediatePropagation();
  if (e.button > 0) return;
  svg.setPointerCapture(e.pointerId);
  rp = { id: e.pointerId, sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false };
}, true);
svg.addEventListener('pointermove', (e) => {
  if (!RU.on) return; e.stopImmediatePropagation();
  if (!rp || rp.id !== e.pointerId) { const r = curRoute(); if (r && r.pts.length && !RU.ins && e.pointerType === 'mouse') { RU.hover = toWorld(e); renderOverlay(); } return; }
  if (Math.hypot(e.clientX - rp.sx, e.clientY - rp.sy) > 7) rp.moved = true;
  if (rp.moved) { view.x = rp.vx + e.clientX - rp.sx; view.y = rp.vy + e.clientY - rp.sy; applyView(); }
}, true);
const rpUp = (e) => { if (!RU.on) return; e.stopImmediatePropagation(); if (!rp || rp.id !== e.pointerId) return; const d = rp; rp = null; if (!d.moved && e.type === 'pointerup') routeTap(toWorld(e)); };
svg.addEventListener('pointerup', rpUp, true); svg.addEventListener('pointercancel', rpUp, true);

function routeOverlay(f) {
  let s = '';
  if (RU.on && !RU.ins) A.free.forEach((p) => { const x = p.pos[0] * C, y = p.pos[1] * C;
    s += `<g pointer-events="none" class="cont-port"><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(13 * f)}" fill="#1a9e4b" opacity=".22"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(8.5 * f)}" fill="#1a9e4b" stroke="#fff" stroke-width="${f1(2 * f)}"/><path d="M${f1(x - 4.5 * f)} ${f1(y)}H${f1(x + 4.5 * f)}M${f1(x)} ${f1(y - 4.5 * f)}V${f1(y + 4.5 * f)}" stroke="#fff" stroke-width="${f1(2.2 * f)}"/></g>`; });
  (proj.routes || []).forEach((r) => {
    const act = RU.on && r.id === RU.rid;
    if (RU.on) {
      s += `<polyline points="${r.pts.map((p) => f1(p.x * C) + ',' + f1(p.y * C)).join(' ')}" fill="none" stroke="${act ? '#1f6feb' : '#8aa0c0'}" stroke-width="${f1(3 * f)}" stroke-dasharray="${f1(8 * f)} ${f1(6 * f)}" opacity=".7" pointer-events="none"/>`;
      r.pts.forEach((p, i) => { const on = act && RU.node === i;
        s += `<circle cx="${f1(p.x * C)}" cy="${f1(p.y * C)}" r="${f1((on ? 11 : 8) * f)}" fill="${on ? '#1f6feb' : '#fff'}" stroke="#1f6feb" stroke-width="${f1(2.5 * f)}" pointer-events="none"/><text x="${f1(p.x * C)}" y="${f1(p.y * C + 3.8 * f)}" text-anchor="middle" style="font:800 ${f1(10 * f)}px system-ui" fill="${on ? '#fff' : '#1f6feb'}" pointer-events="none">${i + 1}</text>`; });
      if (act && RU.hover && !RU.ins && r.pts.length) { const lp = r.pts[r.pts.length - 1], w = RU.hover, dx = w[0] - lp.x, dy = w[1] - lp.y, np = Math.abs(dx) >= Math.abs(dy) ? [Math.round(w[0]), lp.y] : [lp.x, Math.round(w[1])];
        s += ln(lp.x * C, lp.y * C, np[0] * C, np[1] * C, '#1f6feb', 3 * f, 'opacity=".5" pointer-events="none"') + pill((lp.x + np[0]) / 2 * C, (lp.y + np[1]) / 2 * C - 18 * f, Math.round(Math.hypot(np[0] - lp.x, np[1] - lp.y) * CM) + ' cm', '#1f6feb', '#fff'); }
    }
    r.pts.forEach((p, i) => { if (!i) return; const dh = (p.h || 0) - (r.pts[i - 1].h || 0); if (dh) s += pill(p.x * C + 26 * f, p.y * C + 24 * f, (dh > 0 ? '↑ +' : '↓ ') + dh + ' cm', '#fff4d6', '#7a4b00'); });
    [[r.start, 0], [r.end, r.pts.length - 1]].forEach(([tid, i]) => { const T = TERM[tid]; if (!T || !T.dev || !r.pts[i] || r.pts.length < 2) return; const p = r.pts[i];
      const u = i ? uDir(r.pts[i - 1], p) : uDir(r.pts[1], p), cx = p.x * C + u[0] * 52, cy = p.y * C + u[1] * 52;
      s += `<g pointer-events="none"><rect x="${f1(cx - 40)}" y="${f1(cy - 16)}" width="80" height="32" rx="6" fill="#e8eef9" stroke="#4a5d7a" stroke-width="2" stroke-dasharray="5 3"/><text x="${f1(cx)}" y="${f1(cy + 4)}" text-anchor="middle" style="font:700 11px system-ui" fill="#24364f">${esc(LL(...DEVN[T.dev]))}</text></g>`; });
  });
  return s;
}
function sideViewSVG() {
  const R = proj.routes || []; if (!R.length) return `<p>${LL('Noch keine gezeichnete Leitung.', 'No drawn route yet.')}</p>`;
  return R.map((r, ri) => {
    let x = 0; const pts = [[0, r.pts[0].h || 0]], marks = [];
    for (let i = 1; i < r.pts.length; i++) { x += Math.hypot(r.pts[i].x - r.pts[i - 1].x, r.pts[i].y - r.pts[i - 1].y) * CM; pts.push([x, r.pts[i - 1].h || 0]); pts.push([x, r.pts[i].h || 0]); marks.push([x, r.pts[i].h || 0, i, r.pts[i].comp]); }
    const hs = pts.map((p) => p[1]), h0 = Math.min(0, ...hs), h1 = Math.max(50, ...hs), W = 640, H = 200, sx = (W - 80) / Math.max(x, 1), sy = (H - 60) / (h1 - h0 || 1);
    const X = (v) => 50 + v * sx, Y = (v) => H - 30 - (v - h0) * sy;
    return `<h3>${LL('Leitung', 'Route')} ${ri + 1} · ${esc(nm(SYS[r.sys]))} ${esc(sizeLabel(r.size))}</h3><svg class="sideview" viewBox="0 0 ${W} ${H}" width="100%"><line x1="40" y1="${Y(0)}" x2="${W - 20}" y2="${Y(0)}" stroke="#aab4c3" stroke-dasharray="4 4"/><text x="4" y="${Y(0) + 4}" style="font:11px system-ui" fill="#667">0 cm</text>`
      + `<polyline points="${pts.map((p) => f1(X(p[0])) + ',' + f1(Y(p[1]))).join(' ')}" fill="none" stroke="#1f6feb" stroke-width="5" stroke-linejoin="round"/>`
      + `<circle cx="${X(0)}" cy="${Y(pts[0][1])}" r="6" fill="#fff" stroke="#1f6feb" stroke-width="3"/><text x="${X(0)}" y="${Y(pts[0][1]) - 10}" text-anchor="middle" style="font:700 11px system-ui">1 · ${pts[0][1]} cm</text>`
      + marks.map(([mx, mh, i, c]) => `<circle cx="${f1(X(mx))}" cy="${f1(Y(mh))}" r="6" fill="${c ? '#f08c00' : '#fff'}" stroke="#1f6feb" stroke-width="3"/><text x="${f1(X(mx))}" y="${f1(Y(mh) - 10)}" text-anchor="middle" style="font:700 11px system-ui">${i + 1} · ${mh} cm</text>`).join('')
      + `<text x="${W - 20}" y="${H - 8}" text-anchor="end" style="font:11px system-ui" fill="#667">${LL('abgewickelte Länge', 'developed length')} ${Math.round(x)} cm</text></svg>`;
  }).join('') + `<p class="lib-tip">${LL('Seitenansicht: Leitung „abgewickelt“ von links (Start) nach rechts (Ende). Höhensprünge = Steigleitungen mit 2 Winkeln, die automatisch in der Teileliste stehen.', 'Side view: route unrolled from start (left) to end (right). Height steps = risers with 2 elbows, added to the parts list automatically.')}</p>`;
}
function showSideView() { openModal(LL('Seitenansicht (Höhen)', 'Side view (heights)'), sideViewSVG()); }

/* ---------- Einkaufsliste ---------- */
function shopRows() { const bars = localStorage.getItem('rp_bars') !== '0'; return partsRows().map((r) => ({ r, q: qtyOf(r, bars) })).filter((x) => shopQuery(x.r.def) != null); }
function shopText() { return shopRows().map(({ r, q }) => `${q.q} ${q.u} ${nm(r.def)}${q.extra ? ' (' + q.extra + ')' : ''}\n  ${hd24Link(r.def)}`).join('\n') + '\n\n' + LL('* Partnerlinks (Anzeige) – Größe/Ausführung vor dem Kauf prüfen.', '* Affiliate links (ad) – check size/type before buying.'); }
function showShop() {
  const rows = shopRows();
  openModal(LL('🛒 Einkaufsliste HeizungsDiscount24', '🛒 Shopping list HeizungsDiscount24'), !rows.length ? `<p>${t('emptyList')}</p>` :
    `<div class="row-actions"><button id="sAll" class="primary">↗ ${LL('Alle Links öffnen', 'Open all links')} (${rows.length})</button><button id="sCopy">📋 ${LL('Liste kopieren', 'Copy list')}</button><button id="sFile">⬇ ${LL('Als Datei', 'As file')}</button></div>
    <table class="plist shop"><tbody>${rows.map(({ r, q }, i) => `<tr><td class="q">${q.q}</td><td>${q.u}</td><td><b>${esc(nm(r.def))}</b>${q.extra ? ` <span style="color:#1f6feb;font-weight:600">${q.extra}</span>` : ''}</td><td><a class="aff-btn" data-shop="${i}" href="${esc(hd24Link(r.def))}" target="_blank" rel="sponsored noopener">${LL('zum Shop', 'to shop')}*</a></td></tr>`).join('')}</tbody></table>
    <p class="aff aff-foot">* ${LL('Partnerlink (Anzeige): Kaufst du darüber, bekomme ich eine kleine Provision, für dich ändert sich der Preis nicht. Die Links führen zur Shop-Suche, bitte Größe und Ausführung vor dem Kauf prüfen. Der Browser blockiert evtl. viele Fenster auf einmal – dann bitte Pop-ups erlauben oder einzeln klicken.', 'Affiliate link (ad): if you buy through it, I receive a small commission at no extra cost to you. Links open the shop search; please check size and type. Your browser may block many windows at once – allow pop-ups or click individually.')} <a href="#partnerlinks" data-legal="partnerlinks">${LL('Mehr zu Partnerlinks', 'More about affiliate links')}</a></p>`);
  if (!rows.length) return;
  $('sAll').onclick = () => { let blocked = 0; rows.forEach(({ r }) => { const w = window.open(hd24Link(r.def), '_blank', 'noopener'); if (!w) blocked++; }); if (blocked) toast(LL('Pop-ups blockiert – bitte erlauben oder einzeln öffnen', 'Pop-ups blocked – allow them or open individually'), 'warn', 5000); };
  $('sCopy').onclick = () => { navigator.clipboard && navigator.clipboard.writeText(shopText()).then(() => toast(LL('Liste kopiert', 'List copied'), 'ok', 1800), () => toast(LL('Kopieren nicht möglich', 'Copy failed'), 'bad')); };
  $('sFile').onclick = () => download(fileBase() + '_Einkaufsliste.html', `<!doctype html><meta charset="utf-8"><title>${esc(proj.name)} – ${LL('Einkaufsliste', 'Shopping list')}</title><h1>${esc(proj.name)}</h1><ul>${rows.map(({ r, q }) => `<li>${q.q} ${q.u} <a href="${esc(hd24Link(r.def))}" rel="sponsored">${esc(nm(r.def))}</a> ${q.extra || ''}</li>`).join('')}</ul><p>* ${LL('Partnerlinks (Anzeige) – Rohrplaner by Pixel Scallywag', 'Affiliate links (ad) – Rohrplaner by Pixel Scallywag')}</p>`, 'text/html;charset=utf-8');
}
$('selCont').onclick = () => { const o = byId(sel); if (!o) return; const fr = A.free.filter((p) => p.obj === o), p = fr.find((x) => x.idx === activePort) || fr[0]; if (!p) return; startRouteMode(); startFromPort(p); };
$('btnRoute').onclick = () => (RU.on ? stopRouteMode() : startRouteMode());

// Test-/Debug-Schnittstelle
window.RP = { get proj() { return proj; }, get sel() { return sel; }, analyze: () => A, tapAdd, select: (id) => { sel = id; activePort = null; render(); updateUI(); },
  fitView, csvText, startFromPort, RU, routeTap, startRouteMode, stopRouteMode, showSideView, showShop, partsRows, regenAll, shopQuery, hd24Url, hd24Link, computeHints, openLegal, loadProject, exampleProject, rotateSel, DEF, get view() { return view; } };
boot();
})();
