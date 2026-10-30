/* Animations for the Nori-Causal post. Plain SVG + CSS transitions, no dependencies. */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const C = {
    cause: '#3557c4', effect: '#e0841f', neither: '#a59b8f', ink: '#282620',
    muted: '#6d6258', line: '#e5ddd2', soft: '#f3eee6', gray: '#cbc2b5', red: '#c2452f', green: '#2f8a4c'
  };
  const REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- helpers ----------
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in (attrs || {})) {
      const v = attrs[k];
      if (k === 'text') e.textContent = v;
      else if (k === 'style') Object.assign(e.style, v);
      else e.setAttribute(k, v);
    }
    if (parent) parent.appendChild(e);
    return e;
  }
  function markers(svg) {
    const d = el('defs', {}, svg);
    for (const [name, col] of Object.entries({ cause: C.cause, effect: C.effect, ink: C.ink, gray: C.gray, neither: C.neither })) {
      const m = el('marker', { id: `${svg.id}-ah-${name}`, viewBox: '0 0 10 10', refX: 8.5, refY: 5, markerWidth: 6.5, markerHeight: 6.5, orient: 'auto-start-reverse' }, d);
      el('path', { d: 'M0 0 L10 5 L0 10 z', fill: col }, m);
    }
    return name => `url(#${svg.id}-ah-${name})`;
  }
  const show = (e, on = true) => { e.style.opacity = on ? 1 : 0; };
  // apply styles without a transition (for resets)
  function snap(e, styles) {
    const t = e.style.transition;
    e.style.transition = 'none';
    Object.assign(e.style, styles);
    e.getBoundingClientRect();
    e.style.transition = t;
  }
  function setText(t, s) { t.textContent = s; }
  async function swapText(t, s, wait) { show(t, false); await wait(280); setText(t, s); show(t, true); }
  function pill(g, cx, cy, w, h, label, opts = {}) {
    const grp = el('g', {}, g);
    const r = el('rect', { x: cx - w / 2, y: cy - h / 2, width: w, height: h, rx: h / 2, fill: '#fff', stroke: opts.stroke || C.gray, 'stroke-width': 1.6, class: 'stroke' }, grp);
    const t = el('text', { x: cx, y: cy + 5, 'text-anchor': 'middle', 'font-size': opts.fs || 14.5, 'font-weight': 700, fill: C.ink, text: label }, grp);
    return { g: grp, rect: r, text: t };
  }
  function sub(parent, x, y, base, idx, opts = {}) {
    const t = el('text', Object.assign({ x, y, 'font-size': opts.fs || 13.5, 'font-weight': opts.fw || 700, fill: opts.fill || C.ink }, opts.anchor ? { 'text-anchor': opts.anchor } : {}), parent);
    el('tspan', { text: base }, t);
    el('tspan', { dy: 4, 'font-size': (opts.fs || 13.5) * 0.72, text: idx }, t);
    return t;
  }

  // run `loop(wait)` forever, but only while the figure is on screen
  function runner(svg, loop) {
    let visible = false, waiters = [];
    const io = new IntersectionObserver(es => {
      visible = es[0].isIntersecting;
      if (visible) { waiters.forEach(r => r()); waiters = []; }
    }, { threshold: 0.3 });
    io.observe(svg);
    const gate = () => (visible ? Promise.resolve() : new Promise(r => waiters.push(r)));
    const wait = async ms => { await gate(); await new Promise(r => setTimeout(r, ms)); await gate(); };
    (async () => {
      await gate();
      if (REDUCE) { await loop(wait, true); return; }
      for (;;) await loop(wait, false);
    })();
  }

  // =====================================================================
  // 1. The problem: predictive is not the same as causal
  // =====================================================================
  function animProblem(svg) {
    const M = markers(svg);
    const T = { x: 380, y: 146, r: 40 };
    const PW = 196, PH = 44;
    const nodes = [
      { label: 'Missed payments', x: 132, y: 90, kind: 'cause' },
      { label: 'High credit utilization', x: 132, y: 204, kind: 'cause' },
      { label: 'Collection calls', x: 628, y: 90, kind: 'effect' },
      { label: 'Credit score drop', x: 628, y: 204, kind: 'effect' }
    ];
    const cap = el('text', { x: 380, y: 32, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 900, fill: C.ink, class: 'fade' }, svg);
    const gEdges = el('g', {}, svg);

    nodes.forEach(n => {
      const sx = n.x + (n.kind === 'cause' ? PW / 2 : -PW / 2), sy = n.y;
      const dx = T.x - sx, dy = T.y - sy, L = Math.hypot(dx, dy);
      const ex = T.x - dx / L * (T.r + 4), ey = T.y - dy / L * (T.r + 4);
      n.plain = el('line', { x1: sx, y1: sy, x2: ex, y2: ey, stroke: C.gray, 'stroke-width': 3, 'stroke-linecap': 'round', class: 'fade' }, gEdges);
      const a = n.kind === 'cause' ? [sx + 2, sy, ex, ey] : [ex, ey, sx - 3, sy];
      n.arrow = el('line', { x1: a[0], y1: a[1], x2: a[2], y2: a[3], stroke: C[n.kind], 'stroke-width': 3, 'stroke-linecap': 'round', 'marker-end': M(n.kind), class: 'fade', style: { opacity: 0 } }, gEdges);
      n.path = { sx, sy, ex, ey };
    });

    // target and risk meter
    const tg = el('g', {}, svg);
    const ring = el('circle', { cx: T.x, cy: T.y, r: T.r, fill: 'none', stroke: C.ink, 'stroke-width': 2, class: 'pop', style: { opacity: 0 } }, tg);
    el('circle', { cx: T.x, cy: T.y, r: T.r, fill: C.ink }, tg);
    el('text', { x: T.x, y: T.y + 5, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 900, fill: '#fff', text: 'Default' }, tg);
    el('text', { x: T.x, y: 220, 'text-anchor': 'middle', 'font-size': 12.5, fill: C.muted, text: 'risk of default' }, svg);
    el('rect', { x: 316, y: 230, width: 128, height: 10, rx: 5, fill: C.soft }, svg);
    const risk = el('rect', { x: 316, y: 230, width: 128, height: 10, rx: 5, fill: C.red, class: 'grow', style: { transform: 'scaleX(.72)' } }, svg);
    const verdict = el('text', { x: T.x, y: 266, 'text-anchor': 'middle', 'font-size': 13.5, 'font-weight': 700, fill: C.muted, class: 'fade', style: { opacity: 0 } }, svg);

    nodes.forEach(n => {
      const p = pill(svg, n.x, n.y, PW, PH, n.label);
      n.pill = p;
      n.tag = el('text', { x: n.x, y: n.y - PH / 2 - 9, 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 900, 'letter-spacing': 1.2, fill: C[n.kind], text: n.kind.toUpperCase(), class: 'fade', style: { opacity: 0 } }, svg);
      n.chip = el('text', { x: n.x, y: n.y + PH / 2 + 22, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: C[n.kind], class: 'fade', style: { opacity: 0 } }, svg);
    });

    const pulse = el('circle', { cx: 0, cy: 0, r: 7, fill: C.cause, class: 'move', style: { opacity: 0 } }, svg);
    const ripG = el('g', {}, svg);
    const ripple = el('circle', { cx: 0, cy: 0, r: 22, fill: 'none', stroke: C.effect, 'stroke-width': 2.5, style: { opacity: 0, transition: 'transform 1.2s ease-out, opacity 1.2s ease-out', transformBox: 'fill-box', transformOrigin: 'center' } }, ripG);

    const [mp, , cc] = nodes;

    return async (wait, once) => {
      // reset
      nodes.forEach(n => { show(n.plain); show(n.arrow, false); show(n.tag, false); show(n.chip, false); n.pill.rect.setAttribute('stroke', C.gray); n.pill.rect.setAttribute('stroke-width', 1.6); });
      show(verdict, false);
      risk.style.transform = 'scaleX(.72)';
      setText(cap, 'A predictive model sees four strong signals of default.');
      show(cap);
      await wait(2800);

      await swapText(cap, 'But two of them drive default, and two are driven by it.', wait);
      for (const n of nodes) { show(n.plain, false); show(n.arrow); show(n.tag); n.pill.rect.setAttribute('stroke', C[n.kind]); await wait(220); }
      await wait(2400);

      // intervene on a cause
      await swapText(cap, 'Act on a cause, and the risk of default changes.', wait);
      setText(mp.chip, '↓ fewer missed payments'); show(mp.chip);
      mp.pill.rect.setAttribute('stroke-width', 3);
      await wait(500);
      snap(pulse, { transform: `translate(${mp.path.sx}px, ${mp.path.sy}px)`, opacity: 1 });
      await wait(40);
      pulse.style.transform = `translate(${mp.path.ex}px, ${mp.path.ey}px)`;
      await wait(1100);
      show(pulse, false);
      ring.style.opacity = 1; ring.style.transform = 'scale(1.25)';
      risk.style.transform = 'scaleX(.30)';
      setText(verdict, 'risk drops'); verdict.setAttribute('fill', C.cause); show(verdict);
      await wait(500);
      snap(ring, { opacity: 0, transform: 'scale(1)' });
      await wait(2000);

      // intervene on an effect
      show(mp.chip, false); mp.pill.rect.setAttribute('stroke-width', 1.6); show(verdict, false);
      risk.style.transform = 'scaleX(.72)';
      await swapText(cap, 'Act on an effect, and nothing happens to the risk.', wait);
      setText(cc.chip, '✕ stop the calls'); show(cc.chip);
      cc.pill.rect.setAttribute('stroke-width', 3);
      await wait(500);
      ripG.setAttribute('transform', `translate(${cc.x - PW / 2 + 8},${cc.y})`);
      snap(ripple, { opacity: 1, transform: 'scale(.4)' });
      await wait(40);
      ripple.style.opacity = 0; ripple.style.transform = 'scale(2.2)';
      await wait(900);
      setText(verdict, 'no change'); verdict.setAttribute('fill', C.muted); show(verdict);
      await wait(2600);
      if (once) return;
      show(cc.chip, false); cc.pill.rect.setAttribute('stroke-width', 1.6);
      show(cap, false);
      await wait(600);
    };
  }

  // =====================================================================
  // 2. How Nori-Causal works: table in, cause/effect probabilities out
  // =====================================================================
  function animInfer(svg) {
    const M = markers(svg);
    const cap = el('text', { x: 380, y: 32, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 900, fill: C.ink, class: 'fade' }, svg);

    // table
    const TX = 24, TY = 78, CW = 34, TW = 50, RH = 19, NR = 7;
    const tbl = el('g', {}, svg);
    for (let j = 0; j < 5; j++) sub(tbl, TX + j * CW + CW / 2 - 6, TY - 8, 'x', String(j + 1), { fill: C.muted });
    el('text', { x: TX + 5 * CW + TW / 2, y: TY - 8, 'text-anchor': 'middle', 'font-size': 13.5, 'font-weight': 900, fill: C.ink, text: 'target' }, tbl);
    const rows = [];
    for (let i = 0; i < NR; i++) {
      const rg = el('g', { class: 'fade', style: { opacity: 0 } }, tbl);
      for (let j = 0; j < 5; j++) {
        const l = 86 + Math.round(Math.random() * 8);
        el('rect', { x: TX + j * CW + 2, y: TY + i * RH + 2, width: CW - 4, height: RH - 4, rx: 3, fill: `hsl(34, 22%, ${l}%)` }, rg);
      }
      el('rect', { x: TX + 5 * CW + 2, y: TY + i * RH + 2, width: TW - 4, height: RH - 4, rx: 3, fill: C.ink, opacity: 0.25 + Math.random() * 0.5 }, rg);
      rows.push(rg);
    }
    el('text', { x: TX + (5 * CW + TW) / 2, y: TY + NR * RH + 24, 'text-anchor': 'middle', 'font-size': 12.5, fill: C.muted, text: 'your table' }, svg);

    // model
    const BX = 300, BY = 112, BW = 150, BH = 84;
    el('line', { x1: 258, y1: 154, x2: BX - 8, y2: 154, stroke: C.gray, 'stroke-width': 2.2, 'marker-end': M('gray') }, svg);
    el('line', { x1: BX + BW + 6, y1: 154, x2: 482, y2: 154, stroke: C.gray, 'stroke-width': 2.2, 'marker-end': M('gray') }, svg);
    const box = el('rect', { x: BX, y: BY, width: BW, height: BH, rx: 14, fill: C.ink, class: 'pop' }, svg);
    el('text', { x: BX + BW / 2, y: BY + 38, 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 900, fill: '#fff', text: 'Nori-Causal' }, svg);
    el('text', { x: BX + BW / 2, y: BY + 60, 'text-anchor': 'middle', 'font-size': 12, fill: '#cfc6ba', text: 'one forward pass' }, svg);
    const dots = [0, 1, 2, 3].map(() => el('circle', { cx: 0, cy: 0, r: 4.5, fill: C.ink, class: 'move', style: { opacity: 0 } }, svg));

    // outputs
    const OX = 492, OY = 86, OR = 38, BAR = 78;
    el('text', { x: OX + 30 + BAR / 2, y: OY - 18, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 900, fill: C.cause, text: 'P(cause)' }, svg);
    el('text', { x: OX + 40 + BAR + BAR / 2, y: OY - 18, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 900, fill: C.effect, text: 'P(effect)' }, svg);
    const vals = [[0.92, 0.03], [0.05, 0.88], [0.11, 0.09], [0.81, 0.12], [0.07, 0.69]];
    const outs = vals.map(([pc, pe], i) => {
      const y = OY + i * OR;
      sub(svg, OX, y + 5, 'x', String(i + 1), { fill: C.ink });
      const cx0 = OX + 30, ex0 = OX + 40 + BAR;
      el('rect', { x: cx0, y: y - 7, width: BAR, height: 14, rx: 4, fill: C.soft }, svg);
      el('rect', { x: ex0, y: y - 7, width: BAR, height: 14, rx: 4, fill: C.soft }, svg);
      const cb = el('rect', { x: cx0, y: y - 7, width: BAR * pc, height: 14, rx: 4, fill: C.cause, class: 'grow', style: { transform: 'scaleX(0)' } }, svg);
      const eb = el('rect', { x: ex0, y: y - 7, width: BAR * pe, height: 14, rx: 4, fill: C.effect, class: 'grow', style: { transform: 'scaleX(0)' } }, svg);
      const kind = pc > 0.5 ? 'cause' : pe > 0.5 ? 'effect' : 'neither';
      const tag = el('text', { x: ex0 + BAR + 10, y: y + 5, 'font-size': 12.5, 'font-weight': 900, fill: C[kind], text: kind, class: 'fade', style: { opacity: 0 } }, svg);
      return { cb, eb, tag };
    });

    return async (wait, once) => {
      rows.forEach(r => show(r, false));
      outs.forEach(o => { snap(o.cb, { transform: 'scaleX(0)' }); snap(o.eb, { transform: 'scaleX(0)' }); show(o.tag, false); });
      setText(cap, 'Start from any table with a target column.'); show(cap);
      for (const r of rows) { show(r); await wait(160); }
      await wait(1200);

      await swapText(cap, 'Nori-Causal reads the whole table in one forward pass…', wait);
      for (let k = 0; k < 2; k++) {
        dots.forEach((d, i) => snap(d, { transform: `translate(${262 + i * 9}px, 154px)`, opacity: 1 }));
        await wait(40);
        dots.forEach(d => { d.style.transform = `translate(${BX + 20}px, 154px)`; });
        await wait(900);
        dots.forEach(d => show(d, false));
        box.style.transform = 'scale(1.05)'; await wait(250); box.style.transform = 'scale(1)'; await wait(250);
      }
      dots.forEach((d, i) => snap(d, { transform: `translate(${BX + BW + 10 + i * 6}px, 154px)`, opacity: 1 }));
      await wait(40);
      dots.forEach(d => { d.style.transform = `translate(478px, 154px)`; });
      await wait(700);
      dots.forEach(d => show(d, false));

      await swapText(cap, '…and scores every feature as a cause or an effect of the target.', wait);
      for (const o of outs) { o.cb.style.transform = 'scaleX(1)'; o.eb.style.transform = 'scaleX(1)'; await wait(260); }
      await wait(700);
      for (const o of outs) { show(o.tag); await wait(160); }
      await wait(3200);
      if (once) return;
      show(cap, false);
      await wait(500);
    };
  }

  // =====================================================================
  // 3. How we train it: random graph -> table -> predict -> compare
  // =====================================================================
  function animTrain(svg) {
    const M = markers(svg);
    const steps = ['Sample a causal graph', 'Generate a table', 'Predict from the table', 'Compare and update'];
    const stepEls = steps.map((s, i) => {
      const x = 22 + i * 186;
      const g = el('g', {}, svg);
      const c = el('circle', { cx: x + 11, cy: 28, r: 11, fill: C.line, class: 'stroke' }, g);
      const n = el('text', { x: x + 11, y: 32.5, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 900, fill: C.muted, text: String(i + 1), class: 'stroke' }, g);
      const t = el('text', { x: x + 29, y: 33, 'font-size': 13.5, 'font-weight': 700, fill: C.muted, text: s, class: 'stroke' }, g);
      return { c, n, t };
    });
    function setStep(k) {
      stepEls.forEach((s, i) => {
        const on = i === k;
        s.c.setAttribute('fill', on ? C.ink : C.line);
        s.n.setAttribute('fill', on ? '#fff' : C.muted);
        s.t.setAttribute('fill', on ? C.ink : C.muted);
      });
    }
    el('line', { x1: 20, y1: 54, x2: 740, y2: 54, stroke: C.line, 'stroke-width': 1 }, svg);

    // ---- graph panel ----
    const G = { x: 135, y: 190, R: 84, r: 17 };
    el('text', { x: G.x, y: 76, 'text-anchor': 'middle', 'font-size': 12.5, fill: C.muted, text: 'random causal graph' }, svg);
    const pos = [{ x: G.x, y: G.y }];
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
      pos.push({ x: G.x + G.R * Math.cos(a), y: G.y + G.R * Math.sin(a) });
    }
    const gEdges = el('g', { class: 'fade' }, svg);
    const gNodes = el('g', {}, svg);
    const nodeEls = pos.map((p, i) => {
      const g = el('g', {}, gNodes);
      const c = el('circle', { cx: p.x, cy: p.y, r: G.r, fill: i === 0 ? C.ink : '#fff', stroke: i === 0 ? C.ink : C.gray, 'stroke-width': 2, class: 'stroke' }, g);
      if (i === 0) el('text', { x: p.x, y: p.y + 5, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 900, fill: '#fff', text: 'y' }, g);
      else sub(g, p.x - 5, p.y + 4, 'x', String(i), { fill: C.ink, fs: 14 });
      return { g, c };
    });
    const veil = el('g', { class: 'fade', style: { opacity: 0 } }, svg);
    el('rect', { x: 28, y: 86, width: 214, height: 212, rx: 14, fill: '#fff', opacity: 0.9 }, veil);
    el('text', { x: G.x, y: 196, 'text-anchor': 'middle', 'font-size': 44, 'font-weight': 900, fill: C.gray, text: '?' }, veil);
    el('text', { x: G.x, y: 226, 'text-anchor': 'middle', 'font-size': 12.5, fill: C.muted, text: 'hidden from the model' }, veil);

    // ---- table panel ----
    const TX = 284, TY = 108, CW = 27, RH = 17, NR = 9;
    const counter = el('text', { x: TX + 3 * CW, y: 76, 'text-anchor': 'middle', 'font-size': 12.5, fill: C.muted }, svg);
    for (let j = 0; j < 5; j++) sub(svg, TX + j * CW + CW / 2 - 5, TY - 8, 'x', String(j + 1), { fill: C.muted, fs: 12.5 });
    el('text', { x: TX + 5 * CW + CW / 2, y: TY - 8, 'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 900, fill: C.ink, text: 'y' }, svg);
    const trows = [];
    for (let i = 0; i < NR; i++) {
      const rg = el('g', { class: 'fade', style: { opacity: 0 } }, svg);
      const cells = [];
      for (let j = 0; j < 6; j++) cells.push(el('rect', { x: TX + j * CW + 2, y: TY + i * RH + 2, width: CW - 4, height: RH - 4, rx: 3, fill: C.soft }, rg));
      trows.push({ rg, cells });
    }
    const tArrow = el('line', { x1: TX + 6 * CW + 10, y1: 186, x2: 470, y2: 186, stroke: C.gray, 'stroke-width': 2.2, 'marker-end': M('gray'), class: 'fade', style: { opacity: 0 } }, svg);
    const gArrow = el('line', { x1: 230, y1: 186, x2: TX - 12, y2: 186, stroke: C.gray, 'stroke-width': 2.2, 'marker-end': M('gray'), class: 'fade', style: { opacity: 0 } }, svg);

    // ---- prediction panel ----
    const OX = 484, OY = 110, OR = 31, BAR = 58;
    el('text', { x: OX + 26 + BAR / 2, y: 92, 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 900, fill: C.cause, text: 'P(cause)' }, svg);
    el('text', { x: OX + 32 + BAR + BAR / 2, y: 92, 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 900, fill: C.effect, text: 'P(effect)' }, svg);
    el('text', { x: OX + 40 + 2 * BAR, y: 92, 'font-size': 11.5, 'font-weight': 900, fill: C.muted, text: 'truth' }, svg);
    const preds = [];
    for (let i = 0; i < 5; i++) {
      const y = OY + i * OR;
      const g = el('g', {}, svg);
      sub(g, OX, y + 5, 'x', String(i + 1), { fill: C.ink, fs: 13 });
      const cx0 = OX + 26, ex0 = OX + 32 + BAR;
      el('rect', { x: cx0, y: y - 6, width: BAR, height: 12, rx: 3, fill: C.soft }, g);
      el('rect', { x: ex0, y: y - 6, width: BAR, height: 12, rx: 3, fill: C.soft }, g);
      const cb = el('rect', { x: cx0, y: y - 6, width: BAR, height: 12, rx: 3, fill: C.cause, class: 'grow', style: { transform: 'scaleX(0)' } }, g);
      const eb = el('rect', { x: ex0, y: y - 6, width: BAR, height: 12, rx: 3, fill: C.effect, class: 'grow', style: { transform: 'scaleX(0)' } }, g);
      const truth = el('text', { x: OX + 40 + 2 * BAR, y: y + 4.5, 'font-size': 12, 'font-weight': 900, class: 'fade', style: { opacity: 0 } }, g);
      const mark = el('text', { x: 744, y: y + 5, 'text-anchor': 'end', 'font-size': 15, 'font-weight': 900, class: 'fade', style: { opacity: 0 } }, g);
      preds.push({ cb, eb, truth, mark });
    }
    // loss curve
    const LX = 484, LY = 284, LW = 256, LH = 34;
    el('text', { x: LX, y: LY - 8, 'font-size': 11.5, fill: C.muted, text: 'training loss' }, svg);
    el('line', { x1: LX, y1: LY + LH, x2: LX + LW, y2: LY + LH, stroke: C.line }, svg);
    const lossPath = el('path', { d: '', fill: 'none', stroke: C.red, 'stroke-width': 2, 'stroke-linejoin': 'round' }, svg);

    // ---- random DAG with the target in the middle of the order ----
    function sampleGraph() {
      for (;;) {
        const order = [1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);
        const tPos = 1 + Math.floor(Math.random() * 4); // 1..4: at least one node before and after
        order.splice(tPos, 0, 0);
        const edges = [];
        for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) {
          const u = order[a], v = order[b];
          const p = (u === 0 || v === 0) ? 0.6 : 0.35;
          if (Math.random() < p) edges.push([u, v]);
        }
        const ch = n => edges.filter(e => e[0] === n).map(e => e[1]);
        const pa = n => edges.filter(e => e[1] === n).map(e => e[0]);
        const reach = (s, f) => { const seen = new Set(), st = [s]; while (st.length) { for (const m of f(st.pop())) if (!seen.has(m)) { seen.add(m); st.push(m); } } return seen; };
        const anc = reach(0, pa), des = reach(0, ch);
        if (anc.size && des.size && anc.size + des.size < 5) {
          const label = [0, 1, 2, 3, 4, 5].map(i => (anc.has(i) ? 'cause' : des.has(i) ? 'effect' : 'neither'));
          return { edges, label };
        }
      }
    }
    function drawGraph(gr) {
      while (gEdges.firstChild) gEdges.removeChild(gEdges.firstChild);
      gr.edges.forEach(([u, v]) => {
        const a = pos[u], b = pos[v];
        // edges between two outer nodes bend away from the target so they never cross it
        let qx = (a.x + b.x) / 2, qy = (a.y + b.y) / 2;
        if (u !== 0 && v !== 0) {
          const mx = qx - G.x, my = qy - G.y, ml = Math.hypot(mx, my) || 1;
          const skip = Math.abs(u - v) === 2 || Math.abs(u - v) === 3;
          const k = skip ? 46 : 14;
          qx += mx / ml * k; qy += my / ml * k;
        }
        const d0x = qx - a.x, d0y = qy - a.y, l0 = Math.hypot(d0x, d0y);
        const d1x = b.x - qx, d1y = b.y - qy, l1 = Math.hypot(d1x, d1y);
        const sx = a.x + d0x / l0 * (G.r + 2), sy = a.y + d0y / l0 * (G.r + 2);
        const ex = b.x - d1x / l1 * (G.r + 5), ey = b.y - d1y / l1 * (G.r + 5);
        el('path', { d: `M${sx.toFixed(1)} ${sy.toFixed(1)} Q${qx.toFixed(1)} ${qy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`, fill: 'none', stroke: '#9a8f82', 'stroke-width': 2, 'marker-end': M('gray') }, gEdges);
      });
    }
    function colorNodes(gr, reveal) {
      nodeEls.forEach((n, i) => {
        if (i === 0) return;
        const k = gr.label[i];
        n.c.setAttribute('stroke', reveal ? C[k] : C.gray);
        n.c.setAttribute('fill', reveal && k !== 'neither' ? (k === 'cause' ? '#e8edfb' : '#fdf0e2') : '#fff');
      });
    }

    let iter = 0, losses = [];
    return async (wait, once) => {
      if (iter >= 7) { iter = 0; losses = []; lossPath.setAttribute('d', ''); }
      const fast = iter > 0;
      const gr = sampleGraph();
      const eps = Math.max(0.1, 0.9 * Math.pow(0.6, iter));
      counter.textContent = `synthetic table #${iter + 1}`;

      // reset
      snap(gEdges, { opacity: 0 });
      colorNodes(gr, false);
      trows.forEach(r => show(r.rg, false));
      preds.forEach(p => { snap(p.cb, { transform: 'scaleX(0)' }); snap(p.eb, { transform: 'scaleX(0)' }); show(p.truth, false); show(p.mark, false); });
      show(tArrow, false); show(gArrow, false);

      // 1. sample a graph
      setStep(0);
      drawGraph(gr);
      await wait(fast ? 200 : 400);
      gEdges.style.opacity = 1;
      await wait(fast ? 900 : 1800);

      // 2. generate a table from it
      setStep(1); show(gArrow);
      for (const r of trows) {
        r.cells.forEach((c, j) => c.setAttribute('fill', j === 5 ? `rgba(40,38,32,${0.25 + Math.random() * 0.5})` : `hsl(34, 22%, ${84 + Math.round(Math.random() * 10)}%)`));
        show(r.rg);
        await wait(fast ? 50 : 110);
      }
      await wait(fast ? 500 : 1100);

      // 3. hide the graph, predict from the table
      setStep(2); show(gArrow, false); show(veil); show(tArrow);
      await wait(fast ? 300 : 700);
      const probs = [];
      for (let i = 1; i <= 5; i++) {
        const t = gr.label[i];
        const one = [t === 'cause' ? 1 : 0, t === 'effect' ? 1 : 0, t === 'neither' ? 1 : 0];
        const rnd = [Math.random(), Math.random(), Math.random()];
        const s = rnd[0] + rnd[1] + rnd[2];
        const p = one.map((o, j) => (1 - eps) * o + eps * rnd[j] / s);
        probs.push(p);
        preds[i - 1].cb.style.transform = `scaleX(${p[0].toFixed(3)})`;
        preds[i - 1].eb.style.transform = `scaleX(${p[1].toFixed(3)})`;
        await wait(fast ? 90 : 200);
      }
      await wait(fast ? 900 : 1600);

      // 4. compare with the true graph and update
      setStep(3); show(veil, false); colorNodes(gr, true);
      await wait(fast ? 250 : 500);
      let loss = 0;
      probs.forEach((p, i) => {
        const t = gr.label[i + 1];
        const guess = ['cause', 'effect', 'neither'][p.indexOf(Math.max(...p))];
        const pr = preds[i];
        pr.truth.textContent = t; pr.truth.setAttribute('fill', C[t]); show(pr.truth);
        const ok = guess === t;
        pr.mark.textContent = ok ? '✓' : '✗'; pr.mark.setAttribute('fill', ok ? C.green : C.red); show(pr.mark);
        loss += -Math.log(Math.max(1e-3, p[['cause', 'effect', 'neither'].indexOf(t)]));
      });
      losses.push(loss / 5);
      const mx = Math.max(1.2, ...losses);
      const n = 7;
      lossPath.setAttribute('d', losses.map((l, i) => `${i ? 'L' : 'M'}${(LX + 4 + i * (LW - 8) / (n - 1)).toFixed(1)} ${(LY + LH - 3 - (l / mx) * (LH - 6)).toFixed(1)}`).join(' '));
      iter++;
      await wait(fast ? 1800 : 3000);
      if (once) return;
    };
  }

  // =====================================================================
  // Case-study charts: P(cause) to the left, P(effect) to the right
  // =====================================================================
  function caseChart(svg, data) {
    const feats = data.features;
    const RH = 30, TOP = 74, CX = 380, NAMEW = 230, MAXB = 215;
    const H = TOP + feats.length * RH + 24;
    svg.setAttribute('viewBox', `0 0 760 ${H}`);
    el('text', { x: CX, y: 28, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 900, fill: C.ink, text: data.target }, svg);
    el('text', { x: CX - NAMEW / 2 - 6, y: 54, 'text-anchor': 'end', 'font-size': 12.5, 'font-weight': 900, fill: C.cause, text: '← P(cause)' }, svg);
    el('text', { x: CX + NAMEW / 2 + 6, y: 54, 'font-size': 12.5, 'font-weight': 900, fill: C.effect, text: 'P(effect) →' }, svg);
    const bars = [];
    feats.forEach((f, i) => {
      const y = TOP + i * RH;
      const kind = f.cause > 0.5 ? 'cause' : f.effect > 0.5 ? 'effect' : 'neither';
      if (i % 2 === 0) el('rect', { x: 20, y: y - RH / 2 + 2, width: 720, height: RH - 4, rx: 6, fill: '#fbf8f3' }, svg);
      el('text', { x: CX, y: y + 5, 'text-anchor': 'middle', 'font-size': 13.5, 'font-weight': kind === 'neither' ? 400 : 700, fill: kind === 'neither' ? C.muted : C[kind], text: f.name }, svg);
      const lx = CX - NAMEW / 2 - 6, rx = CX + NAMEW / 2 + 6;
      el('line', { x1: lx, y1: y - 9, x2: lx, y2: y + 9, stroke: C.line }, svg);
      el('line', { x1: rx, y1: y - 9, x2: rx, y2: y + 9, stroke: C.line }, svg);
      const cw = Math.max(1, MAXB * f.cause), ew = Math.max(1, MAXB * f.effect);
      const cb = el('rect', { x: lx - cw, y: y - 8, width: cw, height: 16, rx: 3, fill: C.cause, opacity: kind === 'cause' ? 1 : 0.45, class: 'growr', style: { transform: 'scaleX(0)' } }, svg);
      const eb = el('rect', { x: rx, y: y - 8, width: ew, height: 16, rx: 3, fill: C.effect, opacity: kind === 'effect' ? 1 : 0.45, class: 'grow', style: { transform: 'scaleX(0)' } }, svg);
      const ct = el('text', { x: lx - cw - 6, y: y + 4.5, 'text-anchor': 'end', 'font-size': 12, fill: C.muted, text: f.cause.toFixed(2), class: 'fade', style: { opacity: 0 } }, svg);
      const et = el('text', { x: rx + ew + 6, y: y + 4.5, 'font-size': 12, fill: C.muted, text: f.effect.toFixed(2), class: 'fade', style: { opacity: 0 } }, svg);
      bars.push({ cb, eb, ct, et });
    });
    if (data.placeholder) {
      el('text', { x: CX, y: H / 2 + 20, 'text-anchor': 'middle', 'font-size': 64, 'font-weight': 900, fill: '#e0a800', opacity: 0.18, transform: `rotate(-12 ${CX} ${H / 2})`, text: 'PLACEHOLDER' }, svg);
    }
    const io = new IntersectionObserver(async es => {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      for (const b of bars) {
        b.cb.style.transform = 'scaleX(1)'; b.eb.style.transform = 'scaleX(1)';
        setTimeout(() => { show(b.ct); show(b.et); }, 700);
        await new Promise(r => setTimeout(r, REDUCE ? 0 : 90));
      }
    }, { threshold: 0.25 });
    io.observe(svg);
  }

  // ---------- boot ----------
  const boot = () => {
    const a = document.getElementById('anim-problem'); if (a) runner(a, animProblem(a));
    const b = document.getElementById('anim-infer'); if (b) runner(b, animInfer(b));
    const c = document.getElementById('anim-train'); if (c) runner(c, animTrain(c));
    const cases = window.NORI_CAUSAL_CASES || {};
    for (const [id, data] of Object.entries(cases)) {
      const s = document.getElementById(id);
      if (s) caseChart(s, data);
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
