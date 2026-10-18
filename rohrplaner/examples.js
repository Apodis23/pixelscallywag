/* Rohrplaner – Beispielprojekte
   Bau-API:  B.place(teilId, x, y, rot, flip)       Teil frei setzen (x/y in Rasterfeldern à 10 cm)
             B.attach(teilId, ziel, anschluss?, lage?) Teil an freien Anschluss von "ziel" anstecken
                                                     (lage optional, z. B. { rot: 0, flip: true } = Abzweig nach unten)
             B.pipe(rohrId, ziel, anschluss?, cm)    Rohr mit Länge in cm an freien Anschluss setzen  */
window.RP_EXAMPLES = [
  {
    name: { de: 'Waschmaschinenanschluss', en: 'Washing machine connection' },
    desc: { de: 'Kaltwasser mit Kugelhahn, Alu-Verbund 16 (Press), Wandscheibe und Waschmaschinenventil.', en: 'Cold water with ball valve, multilayer 16 press, wall plate and appliance valve.' },
    medium: 'tw',
    build(B) {
      const kh = B.place('kh-12', 0, 0);
      const u0 = B.attach('mvp-uag-MV16-12', kh, 0);
      B.pipe('rohr-mv16', u0, null, 60);
      const u1 = B.attach('mvp-uag-MV16-12', kh, 1);
      const p1 = B.pipe('rohr-mv16', u1, null, 150);
      const w = B.attach('mvp-w90-MV16', p1);
      const p2 = B.pipe('rohr-mv16', w, null, 40);
      const ws = B.attach('ws-mv16', p2);
      B.attach('wmv-12', ws);
    },
  },
  {
    name: { de: 'Heizkörperanschluss MV16', en: 'Radiator connection MV16' },
    desc: { de: 'Vor- und Rücklauf in Alu-Verbund 16 mit Schraubfittingen, Kugelhähnen und KFE-Hahn zum Entleeren.', en: 'Flow and return in multilayer 16 with compression fittings, ball valves and drain valve.' },
    medium: 'hz',
    build(B) {
      // Vorlauf
      const k1 = B.place('mvs-k-MV16', 0, 0);
      B.pipe('rohr-mv16', k1, 0, 80);
      const p1 = B.pipe('rohr-mv16', k1, 1, 120);
      const w1 = B.attach('mvs-w90-MV16', p1);
      const p2 = B.pipe('rohr-mv16', w1, null, 60);
      const u1 = B.attach('mvs-uag-MV16-12', p2);
      const kh1 = B.attach('kh-12', u1);
      B.attach('ms-dn-12', kh1);
      // Rücklauf mit KFE
      const k2 = B.place('mvs-k-MV16', 0, 2);
      B.pipe('rohr-mv16', k2, 0, 80);
      const p3 = B.pipe('rohr-mv16', k2, 1, 220);
      const w2 = B.attach('mvs-w90-MV16', p3);
      const p4 = B.pipe('rohr-mv16', w2, null, 60);
      const u2 = B.attach('mvs-uag-MV16-12', p4);
      const kh2 = B.attach('kh-12', u2);
      const dn = B.attach('ms-dn-12', kh2);
      const t = B.attach('ms-t-12', dn);
      B.attach('kfe-12', t, 2);
      B.attach('ms-dn-12', t, 1);
    },
  },
  {
    name: { de: 'Speicheranschluss mit Sicherheitsgruppe', en: 'Water heater with safety group' },
    desc: { de: 'Kaltwasser über Kugelhahn und Sicherheitsgruppe per Panzerschlauch zum Speicher, Warmwasser-Abgang in Alu-Verbund 20.', en: 'Cold water via ball valve and safety group to the heater, hot water outlet in multilayer 20.' },
    medium: 'tww',
    build(B) {
      const u = B.place('mvp-uag-MV20-34', 0, 0);
      B.pipe('rohr-mv20', u, 0, 100);
      const kh = B.attach('kh-34', u);
      const dn = B.attach('ms-dn-34', kh);
      const sg = B.attach('sg-34', dn);
      B.attach('ps-34-ig-50', sg);
      // Warmwasser
      const kh2 = B.place('kh-34', 8, -2, 1);
      const dn2 = B.attach('ms-dn-34', kh2, 0);
      B.attach('ps-34-ig-50', dn2);
      const u2 = B.attach('mvp-uag-MV20-34', kh2, 1);
      const p = B.pipe('rohr-mv20', u2, null, 50);
      const w = B.attach('mvp-w90-MV20', p);
      B.pipe('rohr-mv20', w, null, 100);
    },
  },
  {
    name: { de: 'Mein Aufbau (verzinkt)', en: 'My setup (galvanized)' },
    desc: { de: 'Ist-Zustand vom Foto (Version 2): Kaltwasser-Zulauf von rechts unten über Winkel und Schrägsitzventil, dann Auslaufhahn, Schrägsitz-Rückflussverhinderer, Ausdehnungsgefäß, Sicherheitsventil 6 bar und Kugelhahn zum alten Speicher links. Stahl verzinkt ¾″, Längen geschätzt.', en: 'As-is from the photo (v2): cold water from the bottom right via elbow and globe valve, then bib tap, check valve, expansion vessel, 6 bar safety valve and ball valve to the old heater on the left. Galvanized ¾″, lengths estimated.' },
    medium: 'tw',
    build(B) {
      const L = { rot: 2, flip: true }; // nach links durchströmt (Eingang rechts)
      // Zulauf von unten rechts: Winkel verzinkt (IG unten, AG nach links)
      const el = B.place('tg-w90ia-34', 0, 0, 3, false);
      B.pipe('rohr-st34', el, 0, 60);
      const vs = B.attach('tg-vs-34', el, 1);
      const ssv = B.attach('ssv-34', vs, null, { j: 0, ...L });
      const p1 = B.pipe('rohr-st34', ssv, null, 15);
      const m1 = B.attach('tg-m-34', p1);
      const n1 = B.attach('tg-ln-34-60', m1);
      // T-Stück mit Auslaufhahn (½″ über Reduzierstück)
      const t1 = B.attach('tg-t-34', n1, null, { j: 1, rot: 0, flip: true });
      B.attach('alh-12', B.attach('tg-rs-34-12', t1, 2));
      const d1 = B.attach('tg-dn-34', t1, 0);
      // Schrägsitz-Rückflussverhinderer (Kappe schräg nach oben)
      const rv = B.attach('srv-34', d1, null, { j: 0, ...L });
      const d2 = B.attach('tg-dn-34', rv, 1);
      // T-Stück: Steigrohr zum Ausdehnungsgefäß, oben T mit verschlossenem Abgang
      const t2 = B.attach('tg-t-34', d2, null, { j: 1, rot: 0, flip: false });
      const riser = B.pipe('rohr-st34', t2, 2, 30);
      const t3 = B.attach('tg-t-34', riser, null, { j: 1, rot: 1, flip: false });
      B.attach('mdb-34', t3, 0);
      B.attach('tg-ka-34', B.attach('tg-dn-34', t3, 2));
      // T-Stück: Sicherheitsventil 6 bar (½″) über Doppelnippel, Reduziermuffe und Langnippel
      const d3 = B.attach('tg-dn-34', t2, 0);
      const t4 = B.attach('tg-t-34', d3, null, { j: 1, rot: 0, flip: false });
      const rm = B.attach('tg-rm-34-12', B.attach('tg-dn-34', t4, 2), null);
      B.attach('sv-tw-12ig', B.attach('tg-ln-12-100', rm), null);
      // weiter nach links: Muffe, Langnippel, T-Stück mit Rohr nach unten, Verschraubung, Kugelhahn
      const d4 = B.attach('tg-dn-34', t4, 0);
      const m2 = B.attach('tg-m-34', d4);
      const n2 = B.attach('tg-ln-34-100', m2);
      const t5 = B.attach('tg-t-34', n2, null, { j: 1, rot: 0, flip: true });
      B.pipe('rohr-st34', t5, 2, 50);
      const vs2 = B.attach('tg-vs-34', t5, 0);
      const kh = B.attach('kh-34', B.attach('tg-dn-34', vs2));
      B.pipe('rohr-st34', kh, null, 30);
    },
  },
  {
    name: { de: 'Kaltwasser neu (Verbund)', en: 'New cold water (multilayer)' },
    desc: { de: 'Geplanter Neubau Kaltwasser zur LG-Warmwasser-Wärmepumpe: Absperrventil (bleibt), Druckminderer, Auslaufhahn, Rückflussverhinderer + Kugelhahn, Ausdehnungsgefäß, Sicherheitsventil 6 bar, Abgang Zirkulation (später) und Panzerschlauch. Alu-Verbund 20×2 mit Schraubfittingen.', en: 'Planned cold water to the LG heat pump water heater: shut-off (existing), pressure reducer, bib tap, check valve + ball valve, expansion vessel, 6 bar safety valve, circulation tee (later) and braided hose. Multilayer 20×2 compression fittings.' },
    medium: 'tw',
    build(B) {
      const L = { rot: 2, flip: true };
      const R = 'rohr-mv20';
      // Bestand: Steigrohr verzinkt, Winkel, Verschraubung, Schrägsitzventil (grünes Handrad)
      const el = B.place('tg-w90ia-34', 0, 0, 3, false);
      B.pipe('rohr-st34', el, 0, 60);
      const vs = B.attach('tg-vs-34', el, 1);
      const ssv = B.attach('ssv-34', vs, null, { j: 0, ...L });
      // NEU: Druckminderer ¾″ AG direkt ins Ventil, dann Kupplung 20 × ¾″ IG
      const dm = B.attach('dm-34', ssv, null, { j: 0, ...L });
      const k1 = B.attach('mvs-uig-MV20-34', dm, null, { j: 1 });
      // T-Stück 1: Auslaufhahn (alter Wasserhahn ½″) über Reduzierstück ¾″ AG × ½″ IG
      const t1 = B.attach('mvs-tig-MV20-34', B.pipe(R, k1, null, 10), null, { j: 1, rot: 0, flip: true });
      B.attach('alh-12', B.attach('ms-rs-34-12', t1, 2));
      // Rückflussverhinderer + Kugelhahn als Block (Doppelnippel dazwischen)
      const k2 = B.attach('mvs-uag-MV20-34', B.pipe(R, t1, 0, 10), null, { j: 0 });
      const rv = B.attach('rv-34', k2, null, { j: 0, ...L });
      const kh = B.attach('kh-34', B.attach('ms-dn-34', rv, 1));
      const k3 = B.attach('mvs-uag-MV20-34', kh, null);
      // T-Stück 2: Ausdehnungsgefäß Trinkwasser oben (2 × Winkel 20)
      const t2 = B.attach('mvs-tig-MV20-34', B.pipe(R, k3, null, 10), null, { j: 1, rot: 0, flip: false });
      const k4 = B.attach('mvs-uag-MV20-34', t2, 2);
      const w1 = B.attach('mvs-w90-MV20', B.pipe(R, k4, null, 50), null, { rot: 2, flip: false });
      const w2 = B.attach('mvs-w90-MV20', B.pipe(R, w1, null, 30), null, { rot: 0, flip: false });
      const k5 = B.attach('mvs-uig-MV20-34', B.pipe(R, w2, null, 10), null);
      B.attach('mdb-34', k5);
      // T-Stück 3: Sicherheitsventil 6 bar über Reduziernippel ¾″ × ½″ (Ausblas zum Trichter/Abwasser)
      const t3 = B.attach('mvs-tig-MV20-34', B.pipe(R, t2, 0, 10), null, { j: 1, rot: 0, flip: false });
      B.attach('sv-tw-12ig', B.attach('ms-rn-34-12', t3, 2));
      // T-Stück 4: Abgang Zirkulation (kommt später, bis dahin Stopfen)
      const t4 = B.attach('mvs-tig-MV20-34', B.pipe(R, t3, 0, 15), null, { j: 1, rot: 0, flip: true });
      B.attach('ms-st-34', t4, 2);
      // Ende: Kupplung 20 × ¾″ AG + Panzerschlauch zur Wärmepumpe (Kaltwasser-Eingang)
      const k6 = B.attach('mvs-uag-MV20-34', B.pipe(R, t4, 0, 15), null, { j: 0 });
      B.attach('ps-34-ig-50', k6);
    },
  },
];
