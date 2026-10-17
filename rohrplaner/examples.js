/* Rohrplaner – Beispielprojekte
   Bau-API:  B.place(teilId, x, y, rot, flip)       Teil frei setzen (x/y in Rasterfeldern à 10 cm)
             B.attach(teilId, ziel, anschluss?)      Teil an freien Anschluss von "ziel" anstecken
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
];
