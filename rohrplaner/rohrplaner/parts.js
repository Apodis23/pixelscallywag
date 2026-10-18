/* =====================================================================
   Rohrplaner – Teilebibliothek
   ---------------------------------------------------------------------
   Diese Datei kann frei erweitert werden. Jedes Teil hat:
     id        eindeutige Kennung (Text)
     de / en   Name deutsch / englisch
     cat       Kategorie-Schlüssel (siehe CATEGORIES)
     mat       Material: 'mv' (Alu-Verbund), 'cu' (Kupfer), 'st' (Stahl verzinkt),
               'ms' (Messing), 'tg' (Temperguss verzinkt), 'vc' (verchromt), 'es' (Edelstahl), 'wh' (weiß lackiert)
     shape     Zeichenform (siehe app.js -> drawPart)
     ports     Anschlüsse: { x, y, d:[dx,dy], t:{k, s, tech}, n:'Name' }
               x/y in Rasterfeldern (1 Feld = 10 cm Zeichnung), d = Richtung nach außen
               k: 'pipe' (Rohrende), 'sock' (nimmt Rohr auf), 'ig' (Innengewinde),
                  'ag' (Außengewinde)
               s: Größe – 'MV16','MV20','MV26','CU15','CU18','CU22' oder Zoll '3/8','1/2','3/4','1'
               tech: 'Press', 'Schraub' (nur bei 'sock')
     desc      Artikel-Beschreibung { de, en }
     warn      optionale Hinweise je Medium { tw:{de,en}, tww:{de,en}, hz:{de,en} }
                 tw = Trinkwasser kalt, tww = Trinkwasser warm+kalt, hz = Heizung
     pipe      nur bei Rohren: { bar: Stangenlänge in m }
   ===================================================================== */
(function () {
  const CATEGORIES = [
    { id: 'pipe', de: 'Rohre', en: 'Pipes' },
    { id: 'mvpress', de: 'Pressfittinge Alu-Verbund', en: 'Press fittings multilayer' },
    { id: 'mvschraub', de: 'Schraubfittinge Alu-Verbund (Connect-Stil)', en: 'Compression fittings multilayer' },
    { id: 'mvsteck', de: 'Steckfittinge Alu-Verbund', en: 'Push-fit fittings multilayer' },
    { id: 'cupress', de: 'Pressfittinge Kupfer', en: 'Press fittings copper' },
    { id: 'cuklemm', de: 'Klemmverschraubungen Kupfer', en: 'Compression fittings copper' },
    { id: 'culoet', de: 'Lötfittinge Kupfer', en: 'Solder fittings copper' },
    { id: 'espress', de: 'Pressfittinge Edelstahl', en: 'Press fittings stainless steel' },
    { id: 'msgew', de: 'Gewindefittinge Messing', en: 'Brass threaded fittings' },
    { id: 'tg', de: 'Gewindefittinge Temperguss (verzinkt)', en: 'Malleable iron threaded fittings' },
    { id: 'valve', de: 'Hähne & Ventile', en: 'Valves' },
    { id: 'twarm', de: 'Trinkwasser-Armaturen', en: 'Drinking water fittings' },
    { id: 'hzarm', de: 'Heizungs-Armaturen & Pumpen', en: 'Heating fittings & pumps' },
    { id: 'safety', de: 'Sicherheit & Ausdehnung', en: 'Safety & expansion' },
    { id: 'mess', de: 'Messen & Anzeigen', en: 'Gauges & meters' },
    { id: 'hose', de: 'Panzerschläuche', en: 'Braided hoses' },
  ];

  const ZOLL = { '3/8': '⅜″', '1/2': '½″', '3/4': '¾″', '1': '1″' };
  const MVN = { MV16: '16×2', MV20: '20×2', MV26: '26×3', MV32: '32×3' };
  const P = [];
  const add = (o) => P.push(o);
  const L = (x, y, dx, dy, t, n) => ({ x, y, d: [dx, dy], t, n });
  const pipeT = (s) => ({ k: 'pipe', s });
  const sock = (s, tech) => ({ k: 'sock', s, tech });
  const ig = (s) => ({ k: 'ig', s });
  const ag = (s) => ({ k: 'ag', s });
  const sz = (s) => (ZOLL[s] || (s.startsWith('MV') ? s.slice(2) + ' mm' : s.slice(2) + ' mm'));

  const W_GALV_TW = {
    tw: { de: 'Verzinkter Stahl/Temperguss wird für neue Trinkwasser-Leitungen kaum noch verwendet (Zinkabtrag, Verkrustung). Besser Alu-Verbund, Kupfer oder Edelstahl.', en: 'Galvanized steel is hardly used for new drinking water lines. Prefer multilayer, copper or stainless.' },
    tww: { de: 'Verzinkter Stahl ist für Trinkwasser-Warmwasser nicht geeignet (Korrosion). Alu-Verbund, Kupfer oder Edelstahl verwenden.', en: 'Galvanized steel is not suitable for hot drinking water (corrosion). Use multilayer, copper or stainless.' },
  };

  /* ---------------- Rohre ---------------- */
  [['MV16', 'mv'], ['MV20', 'mv'], ['MV26', 'mv']].forEach(([s]) => add({
    id: 'rohr-' + s.toLowerCase(), cat: 'pipe', mat: 'mv', shape: 'pipe', pipe: { bar: 5 },
    de: `Alu-Verbundrohr ${MVN[s]}`, en: `Multilayer pipe ${MVN[s]}`,
    desc: { de: `Mehrschichtverbundrohr PE-RT/Al/PE-RT ${MVN[s]} mm, für Heizung und Trinkwasser, Stange 5 m oder Rolle`, en: `Multilayer composite pipe ${MVN[s]} mm, heating & drinking water` },
    ports: [L(0, 0, -1, 0, pipeT(s)), L(1, 0, 1, 0, pipeT(s))],
  }));
  add({ id: 'rohr-mv32', cat: 'pipe', mat: 'mv', shape: 'pipe', pipe: { bar: 5 }, de: 'Alu-Verbundrohr 32×3', en: 'Multilayer pipe 32×3',
    desc: { de: 'Mehrschichtverbundrohr PE-RT/Al/PE-RT 32×3 mm (≈ 1″), für Heizung und Trinkwasser, Stange 5 m', en: 'Multilayer composite pipe 32×3 mm (≈ 1″), 5 m bar' },
    ports: [L(0, 0, -1, 0, pipeT('MV32')), L(1, 0, 1, 0, pipeT('MV32'))] });
  ['CU15', 'CU18', 'CU22', 'CU28'].forEach((s) => add({
    id: 'rohr-' + s.toLowerCase(), cat: 'pipe', mat: 'cu', shape: 'pipe', pipe: { bar: 5 },
    de: `Kupferrohr ${s.slice(2)} mm`, en: `Copper pipe ${s.slice(2)} mm`,
    desc: { de: `Kupferrohr ${s.slice(2)}×1 mm halbhart, Stange 5 m, für Heizung und Trinkwasser`, en: `Copper tube ${s.slice(2)}x1 mm, 5 m bar` },
    ports: [L(0, 0, -1, 0, pipeT(s)), L(1, 0, 1, 0, pipeT(s))],
  }));
  ['ES15', 'ES18', 'ES22', 'ES28'].forEach((s) => add({
    id: 'rohr-' + s.toLowerCase(), cat: 'pipe', mat: 'es', shape: 'pipe', pipe: { bar: 6 },
    de: `Edelstahlrohr ${s.slice(2)} mm`, en: `Stainless steel pipe ${s.slice(2)} mm`,
    desc: { de: `Edelstahl-Systemrohr 1.4521 ${s.slice(2)}×${s === 'ES28' ? '1,2' : '1'} mm für Pressfittinge, Stange 6 m, Trinkwasser & Heizung`, en: `Stainless system pipe ${s.slice(2)} mm for press fittings, 6 m bar` },
    ports: [L(0, 0, -1, 0, pipeT(s)), L(1, 0, 1, 0, pipeT(s))],
  }));
  ['1/2', '3/4', '1'].forEach((s) => add({
    id: 'rohr-st' + s.replace('/', ''), cat: 'pipe', mat: 'st', shape: 'pipe', pipe: { bar: 6 },
    de: `Stahlrohr verzinkt ${ZOLL[s]}`, en: `Galvanized steel pipe ${ZOLL[s]}`,
    desc: { de: `Gewinderohr verzinkt ${ZOLL[s]} (DN ${{ '1/2': 15, '3/4': 20, '1': 25 }[s]}), Enden mit Außengewinde, Stange 6 m`, en: `Galvanized threaded pipe ${ZOLL[s]}, male thread ends, 6 m bar` },
    warn: W_GALV_TW,
    ports: [L(0, 0, -1, 0, ag(s)), L(1, 0, 1, 0, ag(s))],
  }));

  /* ---------------- Fittinge Rohrsysteme (MV Press, MV Schraub, CU Press) ---------------- */
  const SYS = [
    { cat: 'mvpress', mat: 'mvp', tech: 'Press', sizes: ['MV16', 'MV20', 'MV26', 'MV32'], red: [['MV20', 'MV16'], ['MV26', 'MV20'], ['MV26', 'MV16'], ['MV32', 'MV26']],
      tr: { MV16: ['1/2', '3/4'], MV20: ['1/2', '3/4'], MV26: ['3/4', '1'], MV32: ['1'] }, nameDe: 'Press', nameEn: 'press', pre: 'mvp',
      sysDe: 'Alu-Verbund', sysEn: 'multilayer' },
    { cat: 'mvschraub', mat: 'ms', tech: 'Schraub', sizes: ['MV16', 'MV20', 'MV26'], red: [['MV20', 'MV16'], ['MV26', 'MV20']],
      tr: { MV16: ['1/2', '3/4'], MV20: ['1/2', '3/4'], MV26: ['3/4', '1'] }, nameDe: 'Schraub', nameEn: 'compression', pre: 'mvs',
      sysDe: 'Alu-Verbund', sysEn: 'multilayer' },
    { cat: 'cupress', mat: 'cup', tech: 'Press', sizes: ['CU15', 'CU18', 'CU22', 'CU28'], red: [['CU18', 'CU15'], ['CU22', 'CU18'], ['CU22', 'CU15'], ['CU28', 'CU22']],
      tr: { CU15: ['1/2'], CU18: ['1/2', '3/4'], CU22: ['3/4', '1'], CU28: ['1'] }, nameDe: 'Press', nameEn: 'press', pre: 'cup',
      sysDe: 'Kupfer', sysEn: 'copper' },
    { cat: 'mvsteck', mat: 'ms', tech: 'Steck', sizes: ['MV16', 'MV20', 'MV26'], red: [['MV20', 'MV16'], ['MV26', 'MV20']],
      tr: { MV16: ['1/2'], MV20: ['1/2', '3/4'], MV26: ['3/4', '1'] }, nameDe: 'Steck', nameEn: 'push-fit', pre: 'mvk',
      desc: 'Steckfitting für Mehrschichtverbundrohr (Messing/PPSU, O-Ringe, Edelstahl-Haltekralle): Rohr kalibrieren und bis zum Anschlag einstecken, ohne Werkzeug' },
    { cat: 'cuklemm', mat: 'ms', tech: 'Klemm', sizes: ['CU15', 'CU18', 'CU22', 'CU28'], red: [['CU18', 'CU15'], ['CU22', 'CU18'], ['CU22', 'CU15'], ['CU28', 'CU22']],
      tr: { CU15: ['1/2', '3/4'], CU18: ['1/2', '3/4'], CU22: ['3/4', '1'], CU28: ['1'] }, nameDe: 'Klemm', nameEn: 'compr.', pre: 'cuk',
      desc: 'Messing-Klemmverschraubung mit Klemmring für Kupfer-, Edelstahl- und C-Stahlrohr (bei weichem Kupfer Stützhülse verwenden), lösbar, ohne Löten' },
    { cat: 'culoet', mat: 'cup', tech: 'Löt', sizes: ['CU15', 'CU18', 'CU22', 'CU28'], red: [['CU18', 'CU15'], ['CU22', 'CU18'], ['CU22', 'CU15'], ['CU28', 'CU22']],
      tr: { CU15: ['1/2'], CU18: ['1/2', '3/4'], CU22: ['3/4', '1'], CU28: ['1'] }, nameDe: 'Löt', nameEn: 'solder', pre: 'cul',
      desc: 'Kupfer-Lötfitting (Übergänge Rotguss) zum Weichlöten; im Trinkwasser bis 28 mm nur weichlöten, keine Lötfittinge mit Bleianteil' },
    { cat: 'espress', mat: 'es', tech: 'Press', sizes: ['ES15', 'ES18', 'ES22', 'ES28'], red: [['ES18', 'ES15'], ['ES22', 'ES18'], ['ES22', 'ES15'], ['ES28', 'ES22']],
      tr: { ES15: ['1/2'], ES18: ['1/2', '3/4'], ES22: ['3/4', '1'], ES28: ['1'] }, nameDe: 'Press', nameEn: 'press', pre: 'esp',
      desc: 'Edelstahl-Pressfitting 1.4404 mit EPDM-Dichtring (unverpresst undicht), Kontur M/V, Trinkwasser & Heizung' },
  ];
  SYS.forEach((S) => {
    const dsz = (s) => (s.startsWith('MV') ? MVN[s] : s.slice(2));
    const descBase = S.desc || (S.tech === 'Press'
      ? (S.pre === 'cup' ? 'Kupfer-Pressfitting mit Kontur V, EPDM-Dichtring, Trinkwasser & Heizung' : 'Pressfitting für Mehrschichtverbundrohr mit Edelstahl-Presshülse, Kontur TH/U')
      : 'Messing-Schraubfitting (Klemmring, Überwurfmutter) für Mehrschichtverbundrohr, ohne Presswerkzeug montierbar');
    S.sizes.forEach((s) => {
      const T = () => sock(s, S.tech);
      const base = { cat: S.cat, mat: S.mat, tech: S.tech };
      add({ ...base, id: `${S.pre}-w90-${s}`, shape: 'fit', de: `Winkel 90° ${S.nameDe} ${dsz(s)}`, en: `Elbow 90° ${S.nameEn} ${dsz(s)}`,
        desc: { de: `${descBase}. Winkel 90°, ${dsz(s)} mm`, en: `Elbow 90°, ${dsz(s)} mm` }, ports: [L(-0.5, 0, -1, 0, T()), L(0, -0.5, 0, -1, T())] });
      add({ ...base, id: `${S.pre}-b45-${s}`, shape: 'fit', de: `Bogen 45° ${S.nameDe} ${dsz(s)}`, en: `Bend 45° ${S.nameEn} ${dsz(s)}`,
        desc: { de: `${descBase}. Bogen 45°, ${dsz(s)} mm`, en: `Bend 45°, ${dsz(s)} mm` }, ports: [L(-0.5, 0, -1, 0, T()), L(0.5 * Math.SQRT1_2, -0.5 * Math.SQRT1_2, Math.SQRT1_2, -Math.SQRT1_2, T())] });
      add({ ...base, id: `${S.pre}-t-${s}`, shape: 'fit', de: `T-Stück ${S.nameDe} ${dsz(s)}`, en: `Tee ${S.nameEn} ${dsz(s)}`,
        desc: { de: `${descBase}. T-Stück gleich, ${dsz(s)} mm`, en: `Equal tee, ${dsz(s)} mm` }, ports: [L(-0.5, 0, -1, 0, T()), L(0.5, 0, 1, 0, T()), L(0, -0.5, 0, -1, T())] });
      add({ ...base, id: `${S.pre}-k-${s}`, shape: 'fit', de: `${['cup', 'cul', 'esp'].includes(S.pre) ? 'Muffe' : 'Kupplung'} ${S.nameDe} ${dsz(s)}`, en: `Coupling ${S.nameEn} ${dsz(s)}`,
        desc: { de: `${descBase}. ${['cup', 'cul', 'esp'].includes(S.pre) ? 'Muffe' : 'Kupplung'} gerade, ${dsz(s)} mm`, en: `Straight coupling, ${dsz(s)} mm` }, ports: [L(-0.5, 0, -1, 0, T()), L(0.5, 0, 1, 0, T())] });
      (S.tr[s] || []).forEach((z) => {
        add({ ...base, id: `${S.pre}-uag-${s}-${z.replace('/', '')}`, shape: 'fit', de: `Übergang ${S.nameDe} ${dsz(s)} × ${ZOLL[z]} AG`, en: `Adapter ${S.nameEn} ${dsz(s)} × ${ZOLL[z]} male`,
          desc: { de: `${descBase}. Übergang auf Außengewinde ${ZOLL[z]}`, en: `Adapter to male thread ${ZOLL[z]}` }, ports: [L(-0.5, 0, -1, 0, T()), L(0.5, 0, 1, 0, ag(z))] });
        add({ ...base, id: `${S.pre}-tig-${s}-${z.replace('/', '')}`, shape: 'fit', de: `T-Stück ${S.nameDe} ${dsz(s)} × ${ZOLL[z]} IG × ${dsz(s)}`, en: `Tee ${S.nameEn} ${dsz(s)} × ${ZOLL[z]} female × ${dsz(s)}`,
          desc: { de: `${descBase}. T-Stück mit Abgang Innengewinde ${ZOLL[z]} (Durchgang ${dsz(s)} mm)`, en: `Tee with female thread branch ${ZOLL[z]} (run ${dsz(s)} mm)` }, ports: [L(-0.5, 0, -1, 0, T()), L(0.5, 0, 1, 0, T()), L(0, -0.5, 0, -1, ig(z), 'Abgang')] });
        add({ ...base, id: `${S.pre}-uig-${s}-${z.replace('/', '')}`, shape: 'fit', de: `Übergang ${S.nameDe} ${dsz(s)} × ${ZOLL[z]} IG`, en: `Adapter ${S.nameEn} ${dsz(s)} × ${ZOLL[z]} female`,
          desc: { de: `${descBase}. Übergang auf Innengewinde ${ZOLL[z]}`, en: `Adapter to female thread ${ZOLL[z]}` }, ports: [L(-0.5, 0, -1, 0, T()), L(0.5, 0, 1, 0, ig(z))] });
      });
    });
    S.red.forEach(([a, b]) => add({ cat: S.cat, mat: S.mat, tech: S.tech, id: `${S.pre}-red-${a}-${b}`, shape: 'fit',
      de: `Reduzierung ${S.nameDe} ${dsz(a)} → ${dsz(b)}`, en: `Reducer ${S.nameEn} ${dsz(a)} → ${dsz(b)}`,
      desc: { de: `${descBase}. Reduzierkupplung ${dsz(a)} auf ${dsz(b)} mm`, en: `Reducing coupling ${dsz(a)} to ${dsz(b)} mm` },
      ports: [L(-0.5, 0, -1, 0, sock(a, S.tech)), L(0.5, 0, 1, 0, sock(b, S.tech))] }));
  });

  /* ---------------- Gewindefittinge (Temperguss verzinkt + Messing) ---------------- */
  const TGD = 'Temperguss-Fitting verzinkt (Gewinde nach EN 10226), mit Hanf/Dichtpaste oder Gewindedichtfaden abdichten';
  const MSD = 'Messing-Gewindefitting (Gewinde nach EN 10226), für Trinkwasser und Heizung, mit Hanf/Dichtpaste oder Gewindedichtfaden abdichten';
  function threadSet(pre, cat, mat, D, warn) {
    const base = { cat, mat, warn };
    ['1/2', '3/4', '1'].forEach((s) => {
      const z = ZOLL[s], k = s.replace('/', '');
      add({ ...base, id: `${pre}-w90-${k}`, shape: 'fit', de: `Winkel 90° IG/IG ${z}`, en: `Elbow 90° F/F ${z}`, desc: { de: `${D}. Winkel 90°, ${z} IG/IG`, en: `Elbow F/F ${z}` }, ports: [L(-0.5, 0, -1, 0, ig(s)), L(0, -0.5, 0, -1, ig(s))] });
      add({ ...base, id: `${pre}-w90ia-${k}`, shape: 'fit', de: `Winkel 90° IG/AG ${z}`, en: `Elbow 90° F/M ${z}`, desc: { de: `${D}. Winkel 90°, ${z} IG/AG`, en: `Elbow F/M ${z}` }, ports: [L(-0.5, 0, -1, 0, ig(s)), L(0, -0.5, 0, -1, ag(s))] });
      add({ ...base, id: `${pre}-b45-${k}`, shape: 'fit', de: `Bogen 45° IG/IG ${z}`, en: `Bend 45° F/F ${z}`, desc: { de: `${D}. Winkel 45°, ${z}`, en: `45° elbow ${z}` }, ports: [L(-0.5, 0, -1, 0, ig(s)), L(0.5 * Math.SQRT1_2, -0.5 * Math.SQRT1_2, Math.SQRT1_2, -Math.SQRT1_2, ig(s))] });
      add({ ...base, id: `${pre}-t-${k}`, shape: 'fit', de: `T-Stück IG ${z}`, en: `Tee female ${z}`, desc: { de: `${D}. T-Stück, ${z} IG`, en: `Tee female ${z}` }, ports: [L(-0.5, 0, -1, 0, ig(s)), L(0.5, 0, 1, 0, ig(s)), L(0, -0.5, 0, -1, ig(s))] });
      add({ ...base, id: `${pre}-m-${k}`, shape: 'fit', de: `Muffe IG ${z}`, en: `Socket female ${z}`, desc: { de: `${D}. Muffe, ${z} IG/IG`, en: `Socket ${z}` }, ports: [L(-0.5, 0, -1, 0, ig(s)), L(0.5, 0, 1, 0, ig(s))] });
      add({ ...base, id: `${pre}-dn-${k}`, shape: 'fit', hex: true, de: `Doppelnippel ${z}`, en: `Hex nipple ${z}`, desc: { de: `${D}. Doppelnippel, ${z} AG/AG`, en: `Hex nipple ${z} M/M` }, ports: [L(-0.5, 0, -1, 0, ag(s)), L(0.5, 0, 1, 0, ag(s))] });
      [60, 100, 150].forEach((len) => add({ ...base, id: `${pre}-ln-${k}-${len}`, shape: 'fit', de: `Langnippel ${z} AG/AG ${len} mm`, en: `Long nipple ${z} M/M ${len} mm`, desc: { de: `${D}. Langnippel (Rohrdoppelnippel), ${z} AG/AG, Länge ${len} mm`, en: `Long barrel nipple ${z} M/M, length ${len} mm` }, ports: [L(-0.5, 0, -1, 0, ag(s)), L(0.5, 0, 1, 0, ag(s))] }));
      add({ ...base, id: `${pre}-st-${k}`, shape: 'plug', de: `Stopfen ${z} AG`, en: `Plug ${z} male`, desc: { de: `${D}. Stopfen mit Vierkant, ${z} AG`, en: `Plug ${z}` }, ports: [L(-0.5, 0, -1, 0, ag(s))] });
      add({ ...base, id: `${pre}-vs-${k}`, shape: 'union', de: `Verschraubung ${z} IG/AG flachdichtend`, en: `Union ${z} F/M flat seal`, desc: { de: `${D}. Verschraubung (lösbare Rohrverbindung) flachdichtend mit Dichtung, ${z} IG × AG`, en: `Union ${z} female × male, flat seal with gasket` }, ports: [L(-0.5, 0, -1, 0, ig(s)), L(0.5, 0, 1, 0, ag(s))] });
      add({ ...base, id: `${pre}-ka-${k}`, shape: 'cap', de: `Kappe ${z} IG`, en: `Cap ${z} female`, desc: { de: `${D}. Kappe, ${z} IG`, en: `Cap ${z}` }, ports: [L(-0.5, 0, -1, 0, ig(s))] });
    });
    [['3/4', '1/2'], ['1', '3/4'], ['1', '1/2']].forEach(([a, b]) => {
      const ka = a.replace('/', ''), kb = b.replace('/', '');
      add({ ...base, id: `${pre}-rn-${ka}-${kb}`, shape: 'fit', hex: true, de: `Reduziernippel ${ZOLL[a]} AG × ${ZOLL[b]} AG`, en: `Reducing nipple ${ZOLL[a]} × ${ZOLL[b]} M/M`, desc: { de: `${D}. Reduziernippel ${ZOLL[a]} × ${ZOLL[b]} AG/AG`, en: `Reducing hex nipple` }, ports: [L(-0.5, 0, -1, 0, ag(a)), L(0.5, 0, 1, 0, ag(b))] });
      add({ ...base, id: `${pre}-rm-${ka}-${kb}`, shape: 'fit', de: `Reduziermuffe ${ZOLL[a]} IG × ${ZOLL[b]} IG`, en: `Reducing socket ${ZOLL[a]} × ${ZOLL[b]} F/F`, desc: { de: `${D}. Reduziermuffe ${ZOLL[a]} × ${ZOLL[b]} IG/IG`, en: `Reducing socket` }, ports: [L(-0.5, 0, -1, 0, ig(a)), L(0.5, 0, 1, 0, ig(b))] });
      add({ ...base, id: `${pre}-rs-${ka}-${kb}`, shape: 'fit', de: `Reduzierstück ${ZOLL[a]} AG × ${ZOLL[b]} IG`, en: `Reducer ${ZOLL[a]} M × ${ZOLL[b]} F`, desc: { de: `${D}. Reduzierstück ${ZOLL[a]} AG × ${ZOLL[b]} IG`, en: `Reducing bush` }, ports: [L(-0.5, 0, -1, 0, ag(a)), L(0.5, 0, 1, 0, ig(b))] });
    });
  }
  threadSet('ms', 'msgew', 'ms', MSD, undefined);
  threadSet('tg', 'tg', 'tg', TGD, W_GALV_TW);

  /* ---------------- Hähne & Ventile ---------------- */
  ['1/2', '3/4', '1'].forEach((s) => {
    const z = ZOLL[s], k = s.replace('/', '');
    add({ id: `kh-${k}`, cat: 'valve', mat: 'ms', shape: 'valve', de: `Kugelhahn ${z} IG/IG`, en: `Ball valve ${z} F/F`,
      desc: { de: `Messing-Kugelhahn (Absperrhahn) voller Durchgang, Hebelgriff, ${z} IG/IG, Trinkwasser & Heizung`, en: `Brass ball valve full bore, lever, ${z} F/F` },
      ports: [L(-1, 0, -1, 0, ig(s)), L(1, 0, 1, 0, ig(s))] });
    add({ id: `rv-${k}`, cat: 'valve', mat: 'ms', shape: 'check', de: `Rückflussverhinderer ${z} IG/IG`, en: `Check valve ${z} F/F`,
      desc: { de: `Rückflussverhinderer (Rückschlagventil) Messing, federbelastet, ${z} IG/IG – Pfeil = Fließrichtung`, en: `Spring check valve, brass, ${z} F/F – arrow = flow direction` },
      ports: [L(-0.5, 0, -1, 0, ig(s), 'Eingang'), L(0.5, 0, 1, 0, ig(s), 'Ausgang')] });
  });
  ['1/2', '3/4', '1'].forEach((s) => {
    const z = ZOLL[s], k = s.replace('/', '');
    add({ id: `ssv-${k}`, cat: 'valve', mat: 'ms', shape: 'ssv', de: `Schrägsitzventil ${z} IG/IG`, en: `Oblique globe valve ${z} F/F`,
      desc: { de: `Schrägsitz-Absperrventil (Freistromventil) Rotguss/Messing mit Handrad, ${z} IG/IG – Pfeil auf dem Gehäuse = Fließrichtung`, en: `Oblique-seat globe (stop) valve, gunmetal/brass, handwheel, ${z} F/F – arrow = flow direction` },
      ports: [L(-1, 0, -1, 0, ig(s), 'Eingang'), L(1, 0, 1, 0, ig(s), 'Ausgang')] });
    add({ id: `srv-${k}`, cat: 'valve', mat: 'ms', shape: 'srv', de: `Schrägsitz-Rückflussverhinderer ${z} IG/IG`, en: `Oblique check valve ${z} F/F`,
      desc: { de: `Freistrom-Rückflussverhinderer (Schrägsitz-Rückschlagventil) Messing/Rotguss mit Schraubkappe, ${z} IG/IG – Pfeil = Fließrichtung`, en: `Oblique-seat (free-flow) check valve, brass, screw cap, ${z} F/F – arrow = flow direction` },
      ports: [L(-0.75, 0, -1, 0, ig(s), 'Eingang'), L(0.75, 0, 1, 0, ig(s), 'Ausgang')] });
  });
  [['1/2', '12'], ['3/4', '34']].forEach(([s, k]) => add({ id: `alh-${k}`, cat: 'valve', mat: 'vc', shape: 'tap', de: `Auslaufhahn ${ZOLL[s]} AG`, en: `Bib tap ${ZOLL[s]} male`,
    desc: { de: `Auslaufventil / Zapfhahn verchromt mit Kreuzgriff, ${ZOLL[s]} AG Einschraubgewinde, Auslauf nach unten (ggf. mit Schlauchverschraubung)`, en: `Chrome bib tap with cross handle, ${ZOLL[s]} male inlet, spout pointing down` },
    warn: { hz: { de: 'Auslaufhähne gehören an die Trinkwasserleitung; an der Heizung einen KFE-Hahn zum Entleeren verwenden.', en: 'Bib taps belong on drinking water lines; use a fill & drain valve on heating.' } },
    ports: [L(0, -0.5, 0, -1, ag(s), 'Zulauf')] }));
  add({ id: 'kfe-12', cat: 'valve', mat: 'ms', shape: 'kfe', de: 'KFE-Hahn ½″ AG', en: 'Fill & drain valve ½″ male',
    desc: { de: 'Kessel-Füll- und Entleerhahn (KFE) Messing, ½″ AG, mit Schlauchtülle und Kappe', en: 'Boiler fill & drain valve ½″ male with hose tail' },
    warn: { tw: { de: 'KFE-Hahn im Trinkwasser nur als Entleerung – zum Befüllen von Heizungen aus dem Trinkwasser ist ein Systemtrenner (EN 1717) nötig.', en: 'Fill & drain valve in drinking water only for draining – filling heating systems requires a backflow preventer (EN 1717).' } },
    ports: [L(-0.5, 0, -1, 0, ag('1/2'))] });
  add({ id: 'wmv-12', cat: 'valve', mat: 'vc', shape: 'wmv', de: 'Waschmaschinenventil ½″ × ¾″', en: 'Washing machine valve ½″ × ¾″',
    desc: { de: 'Geräteanschlussventil verchromt mit integriertem Rückflussverhinderer und Rohrbelüfter, ½″ AG Wand × ¾″ AG Schlauch', en: 'Appliance valve chrome with check valve, ½″ male × ¾″ hose thread' },
    warn: { hz: { de: 'Waschmaschinenventil gehört an die Trinkwasser-Kaltwasserleitung, nicht an die Heizung.', en: 'Washing machine valve belongs on the cold drinking water line, not heating.' } },
    ports: [L(-0.5, 0, -1, 0, ag('1/2'), 'Wand'), L(0, 0.5, 0, 1, ag('3/4'), 'Schlauch')] });
  add({ id: 'eckv-12', cat: 'valve', mat: 'vc', shape: 'eckv', de: 'Eckventil ½″ × ⅜″', en: 'Angle valve ½″ × ⅜″',
    desc: { de: 'Eckventil verchromt, ½″ AG Wand × ⅜″ AG Ausgang (Klemmanschluss 10 mm) für Waschtisch/Spüle', en: 'Angle stop valve chrome ½″ × ⅜″' },
    warn: { hz: { de: 'Eckventile sind für Trinkwasser-Armaturen gedacht, nicht für die Heizung.', en: 'Angle valves are meant for drinking water fixtures.' } },
    ports: [L(-0.5, 0, -1, 0, ag('1/2'), 'Wand'), L(0, 0.5, 0, 1, ag('3/8'), 'Armatur')] });
  add({ id: 'ws-mv16', cat: 'valve', mat: 'mvp', tech: 'Press', shape: 'wall', de: 'Wandscheibe MV 16 Press × ½″ IG', en: 'Wall plate elbow MV16 press × ½″ F',
    desc: { de: 'Wandscheibe / Anschlusswinkel mit Befestigungsplatte, Press 16×2 × ½″ IG, für Armaturen und Geräteventile', en: 'Wall plate elbow, press 16x2 × ½″ female' },
    ports: [L(-0.5, 0, -1, 0, sock('MV16', 'Press'), 'Rohr'), L(0, -0.5, 0, -1, ig('1/2'), 'Armatur')] });
  add({ id: 'ws-mv16s', cat: 'valve', mat: 'ms', tech: 'Schraub', shape: 'wall', de: 'Wandscheibe MV 16 Schraub × ½″ IG', en: 'Wall plate elbow MV16 compression × ½″ F',
    desc: { de: 'Wandscheibe / Anschlusswinkel Messing, Schraubanschluss 16×2 × ½″ IG', en: 'Wall plate elbow, compression 16x2 × ½″ female' },
    ports: [L(-0.5, 0, -1, 0, sock('MV16', 'Schraub'), 'Rohr'), L(0, -0.5, 0, -1, ig('1/2'), 'Armatur')] });
  add({ id: 'ws-cu15', cat: 'valve', mat: 'cup', tech: 'Press', shape: 'wall', de: 'Wandscheibe CU 15 Press × ½″ IG', en: 'Wall plate elbow CU15 press × ½″ F',
    desc: { de: 'Wandscheibe Kupfer/Rotguss, Press 15 mm × ½″ IG', en: 'Wall plate elbow, copper press 15 mm × ½″ female' },
    ports: [L(-0.5, 0, -1, 0, sock('CU15', 'Press'), 'Rohr'), L(0, -0.5, 0, -1, ig('1/2'), 'Armatur')] });

  /* ---------------- Sicherheit ---------------- */
  add({ id: 'sg-34', cat: 'safety', mat: 'ms', shape: 'sg', de: 'Sicherheitsgruppe ¾″ (Trinkwasser-Speicher)', en: 'Safety group ¾″ (water heater)',
    desc: { de: 'Sicherheitsgruppe DN 20 für geschlossene Trinkwasser-Speicher nach DIN 1988: Absperrventil, Rückflussverhinderer, Prüfstutzen, Sicherheitsventil 6 bar (DVGW), Trichter-Ablauf', en: 'Safety group DN20 for closed water heaters: shut-off, check valve, 6 bar safety valve, drain funnel' },
    warn: { hz: { de: 'Die Sicherheitsgruppe ist für Trinkwasser-Speicher (6 bar). Für Heizkreise ein Heizungs-Sicherheitsventil (meist 3 bar) verwenden.', en: 'This safety group is for drinking water heaters (6 bar). Use a heating safety valve (usually 3 bar) on heating circuits.' } },
    ports: [L(-1, 0.5, -1, 0, ig('3/4'), 'Kaltwasser-Zulauf'), L(0, -1, 0, -1, ag('3/4'), 'zum Speicher')] });
  add({ id: 'sv-hz-12', cat: 'safety', mat: 'ms', shape: 'sv', de: 'Sicherheitsventil Heizung ½″ (3 bar)', en: 'Heating safety valve ½″ (3 bar)',
    desc: { de: 'Membran-Sicherheitsventil für Heizungsanlagen, Ansprechdruck 3 bar, ½″ IG Eingang × ¾″ IG Ausblas', en: 'Heating safety valve 3 bar, ½″ F inlet × ¾″ F outlet' },
    warn: { tw: { de: 'Ein Heizungs-Sicherheitsventil (3 bar) ist nicht für Trinkwasser-Speicher – dort eine Sicherheitsgruppe mit 6-bar-Ventil verwenden.', en: 'A heating safety valve is not for drinking water heaters – use a 6 bar safety group.' },
      tww: { de: 'Ein Heizungs-Sicherheitsventil (3 bar) ist nicht für Trinkwasser-Speicher – dort eine Sicherheitsgruppe mit 6-bar-Ventil verwenden.', en: 'A heating safety valve is not for drinking water heaters – use a 6 bar safety group.' } },
    ports: [L(0, 0.5, 0, 1, ig('1/2'), 'Eingang'), L(0.5, 0, 1, 0, ig('3/4'), 'Ausblasleitung')] });

  add({ id: 'sv-tw-12', cat: 'safety', mat: 'ms', shape: 'svtw', de: 'Sicherheitsventil Trinkwasser ½″ (6 bar)', en: 'Drinking water safety valve ½″ (6 bar)',
    desc: { de: 'Membran-Sicherheitsventil für Trinkwasser (grüne Kappe), Ansprechdruck 6 bar, ½″ AG Eingang × ¾″ IG Ausblas (Ausblasleitung zum Ablauf führen)', en: 'Drinking water diaphragm safety valve (green cap), 6 bar, ½″ male inlet × ¾″ female outlet' },
    warn: { hz: { de: 'Trinkwasser-Sicherheitsventil (6 bar) nicht für Heizkreise – dort ein Heizungs-Sicherheitsventil (meist 3 bar) verwenden.', en: 'Drinking water safety valve (6 bar) is not for heating circuits – use a heating safety valve (usually 3 bar).' } },
    ports: [L(0, 0.5, 0, 1, ag('1/2'), 'Eingang'), L(0.5, 0, 1, 0, ig('3/4'), 'Ausblasleitung')] });
  add({ id: 'sv-tw-12ig', cat: 'safety', mat: 'ms', shape: 'svtw', de: 'Sicherheitsventil Trinkwasser ½″ IG (6 bar)', en: 'Drinking water safety valve ½″ female (6 bar)',
    desc: { de: 'Membran-Sicherheitsventil für Trinkwasser-Erwärmer (grüne Kappe, DVGW), Ansprechdruck 6 bar, ½″ IG Eingang × ¾″ IG Ausblas – z. B. mit Reduziernippel ¾″ × ½″ ins T-Stück; Ausblasleitung über Trichter zum Abwasser führen, zwischen Ventil und Speicher keine Absperrung', en: 'Drinking water heater diaphragm safety valve (green cap), 6 bar, ½″ female inlet × ¾″ female outlet – e.g. on a ¾″ × ½″ reducing nipple; route blow-off to a drain funnel, no shut-off between valve and heater' },
    warn: { hz: { de: 'Trinkwasser-Sicherheitsventil (6 bar) nicht für Heizkreise – dort ein Heizungs-Sicherheitsventil (meist 3 bar) verwenden.', en: 'Drinking water safety valve (6 bar) is not for heating circuits – use a heating safety valve (usually 3 bar).' } },
    ports: [L(0, 0.5, 0, 1, ig('1/2'), 'Eingang'), L(0.5, 0, 1, 0, ig('3/4'), 'Ausblasleitung')] });
  add({ id: 'mano-12', cat: 'mess', mat: 'ms', shape: 'gauge', de: 'Manometer 0–10 bar ½″ AG', en: 'Pressure gauge 0–10 bar ½″ male',
    desc: { de: 'Manometer Ø 63 mm, 0–10 bar, Anschluss unten ½″ AG (kleinere Manometer haben oft ¼″ – dann Reduzierung ½″ × ¼″ verwenden)', en: 'Pressure gauge Ø 63 mm, 0–10 bar, bottom connection ½″ male (small gauges often ¼″ – use a reducer)' },
    ports: [L(0, 0.5, 0, 1, ag('1/2'), 'Anschluss')] });
  add({ id: 'mdb-34', cat: 'safety', mat: 'wh', shape: 'vessel', de: 'Membran-Druckbehälter / Ausdehnungsgefäß Trinkwasser ¾″ AG', en: 'Diaphragm pressure tank / expansion vessel (drinking water) ¾″ male',
    desc: { de: 'Membran-Druckbehälter bzw. Trinkwasser-Ausdehnungsgefäß (z. B. für Hauswasserwerk oder Warmwasserspeicher), Anschluss unten ¾″ AG, Vordruck je nach Anlage einstellen', en: 'Diaphragm pressure tank / drinking water expansion vessel, bottom connection ¾″ male, set pre-charge per system' },
    warn: { hz: { de: 'Für Heizungen ein Heizungs-Ausdehnungsgefäß (meist rot) verwenden – Trinkwasser-Gefäße sind dafür nicht ausgelegt.', en: 'Use a heating expansion vessel (usually red) for heating systems.' } },
    ports: [L(0, 0.5, 0, 1, ag('3/4'), 'Anschluss')] });

  /* ---------------- Panzerschläuche ---------------- */
  [['1/2', 'ig'], ['3/4', 'ig'], ['1/2', 'ag']].forEach(([s, kind]) => [30, 50, 100].forEach((len) => {
    const z = ZOLL[s], c = len / 10;
    add({ id: `ps-${s.replace('/', '')}-${kind}-${len}`, cat: 'hose', mat: 'es', shape: 'hose', len,
      de: `Panzerschlauch ${z} ${kind === 'ig' ? 'ÜM/ÜM' : 'ÜM/AG'} ${len} cm`, en: `Braided hose ${z} ${kind === 'ig' ? 'F/F' : 'F/M'} ${len} cm`,
      desc: { de: `Edelstahl-Panzerschlauch EPDM-Seele, ${z} Überwurfmutter flachdichtend × ${kind === 'ig' ? 'Überwurfmutter' : 'Außengewinde'}, Länge ${len} cm`, en: `Stainless braided hose ${z}, ${len} cm` },
      ports: [L(-c / 2, 0, -1, 0, ig(s)), L(c / 2, 0, 1, 0, kind === 'ig' ? ig(s) : ag(s))] });
  }));

  /* ---------------- Armaturen (Trinkwasser, Heizung, Messen) – generische Bauformen, angelehnt an das übliche Fachhandels-Sortiment ---------------- */
  const KZ = (s) => s.replace('/', '');
  const DN = { '3/8': 10, '1/2': 15, '3/4': 20, '1': 25 };
  const W_HZ_ONLY = { tw: { de: 'Dieses Teil ist für Heizungswasser gedacht, nicht für Trinkwasser.', en: 'This part is meant for heating water, not drinking water.' },
    tww: { de: 'Dieses Teil ist für Heizungswasser gedacht, nicht für Trinkwasser.', en: 'This part is meant for heating water, not drinking water.' } };
  const W_TW_ONLY = { hz: { de: 'Dieses Teil gehört in die Trinkwasser-Installation, nicht in den Heizkreis.', en: 'This part belongs in the drinking water installation, not in the heating circuit.' } };
  const inl = (a, b, x = 0.75, na = 'Eingang', nb = 'Ausgang') => [L(-x, 0, -1, 0, a, na), L(x, 0, 1, 0, b, nb)];
  const arm = (o) => add({ shape: 'arm', mat: 'ms', ...o });

  /* Trinkwasser-Armaturen */
  ['1/2', '3/4', '1'].forEach((s) => {
    const z = ZOLL[s], k = KZ(s);
    arm({ id: `dm-${k}`, cat: 'twarm', sym: 'dm', gauge: true, de: `Druckminderer ${z} mit Manometer`, en: `Pressure reducer ${z} with gauge`,
      desc: { de: `Druckminderer DN ${DN[s]} mit Manometer 0–16 bar, einstellbar 1,5–6 bar, mit Verschraubungen ${z} AG beidseitig – Pfeil = Fließrichtung, hinter dem Wasserzähler einbauen`, en: `Pressure reducing valve DN ${DN[s]} with gauge, adjustable 1.5–6 bar, unions ${z} male both sides – arrow = flow direction` },
      warn: W_TW_ONLY, ports: inl(ag(s), ag(s)) });
    arm({ id: `dmk-${k}`, cat: 'twarm', sym: 'dm', de: `Druckminderer ${z} IG/IG ohne Manometer`, en: `Pressure reducer ${z} F/F without gauge`,
      desc: { de: `Kompakt-Druckminderer DN ${DN[s]} Messing, ohne Manometer (Manometeranschluss ¼″ verschlossen), einstellbar 1,5–6 bar, ${z} IG/IG – Pfeil = Fließrichtung`, en: `Compact pressure reducer DN ${DN[s]}, no gauge (¼″ gauge port plugged), ${z} F/F` },
      ports: inl(ig(s), ig(s), 0.6) });
    arm({ id: `ffil-${k}`, cat: 'twarm', sym: 'ffil', de: `Feinfilter ${z} mit Klarsichttasse`, en: `Fine filter ${z} with clear bowl`,
      desc: { de: `Trinkwasser-Feinfilter (Siebfilter 90–100 µm) mit Klarsichttasse und Filtereinsatz, ${z} IG/IG – direkt hinter dem Wasserzähler einbauen, Einsatz regelmäßig wechseln`, en: `Drinking water fine filter (90–100 µm) with clear bowl, ${z} F/F – install right after the meter` },
      warn: W_TW_ONLY, ports: inl(ig(s), ig(s), 0.6) });
    arm({ id: `khrv-${k}`, cat: 'valve', shape: 'valve', rv: true, de: `Kugelhahn mit Rückflussverhinderer ${z} IG/IG`, en: `Ball valve with check valve ${z} F/F`,
      desc: { de: `Messing-Kugelhahn mit integriertem Rückflussverhinderer, Hebelgriff, ${z} IG/IG – Pfeil = Fließrichtung`, en: `Brass ball valve with integrated check valve, ${z} F/F – arrow = flow direction` },
      ports: inl(ig(s), ig(s), 1) });
  });
  ['3/4', '1'].forEach((s) => {
    const z = ZOLL[s], k = KZ(s);
    arm({ id: `rsf-${k}`, cat: 'twarm', sym: 'rsf', de: `Rückspülfilter ${z}`, en: `Backwash filter ${z}`,
      desc: { de: `Rückspülfilter DN ${DN[s]} (Filterfeinheit ca. 90 µm) mit drehbarem Anschlussstück, Verschraubungen ${z} AG beidseitig, Spülanschluss nach unten zum Ablauf`, en: `Backwash filter DN ${DN[s]} with rotating connection, unions ${z} male, flushing outlet to drain` },
      warn: W_TW_ONLY, ports: inl(ag(s), ag(s)) });
    arm({ id: `hws-${k}`, cat: 'twarm', sym: 'hws', gauge: true, de: `Hauswasserstation ${z} (Filter + Druckminderer)`, en: `Domestic water station ${z} (filter + reducer)`,
      desc: { de: `Filter-Druckminderer-Kombination DN ${DN[s]}: Rückspülfilter, Druckminderer 1,5–6 bar und Manometer, drehbares Anschlussstück, Verschraubungen ${z} AG beidseitig`, en: `Filter/pressure reducer combination DN ${DN[s]} with gauge, unions ${z} male` },
      warn: W_TW_ONLY, ports: inl(ag(s), ag(s)) });
    arm({ id: `leak-${k}`, cat: 'twarm', sym: 'leak', de: `Leckageschutz / Wasserstopp ${z}`, en: `Leak protection / water stop ${z}`,
      desc: { de: `Leckageschutz mit motorischem Absperrventil und Funk-/Kabel-Wassersensor, Verschraubungen ${z} AG, 230 V – sperrt bei Leckage oder Dauerverbrauch automatisch ab`, en: `Leak protection with motorised shut-off and water sensor, unions ${z} male, 230 V` },
      warn: W_TW_ONLY, ports: inl(ag(s), ag(s)) });
  });
  [['1/2', '15', '1/2'], ['3/4', '20', '3/4']].forEach(([s, dn]) => {
    const z = ZOLL[s], k = KZ(s);
    arm({ id: `ba-${k}`, cat: 'twarm', sym: 'ba', de: `Systemtrenner BA ${z}`, en: `Backflow preventer BA ${z}`,
      desc: { de: `Systemtrenner Typ BA (DIN EN 1717) DN ${dn} mit Schmutzfänger und Absperrungen, Eingang ${z} IG, Ausgang ${z} AG, Ablauftrichter an den Abwasseranschluss – Pflicht z. B. beim festen Befüllanschluss Heizung`, en: `Backflow preventer type BA (EN 1717) DN ${dn}, inlet ${z} F, outlet ${z} M, drain to sewer – required e.g. for permanent heating fill connection` },
      ports: inl(ig(s), ag(s)) });
    arm({ id: `rb-${k}`, cat: 'twarm', sym: 'rb', de: `Rohrbelüfter ${z}`, en: `Pipe vacuum breaker ${z}`,
      desc: { de: `Rohrbelüfter Durchgangsform DN ${dn} (DIN EN 1717), ${z} AG beidseitig, senkrecht nach oben einbauen, mind. 30 cm über der höchsten Entnahmestelle`, en: `Inline vacuum breaker DN ${dn}, ${z} male both sides, install vertically` },
      warn: W_TW_ONLY, ports: inl(ag(s), ag(s), 0.6) });
    arm({ id: `tmix-${k}`, cat: 'twarm', sym: 'tmix', de: `Thermostatischer Mischer / Verbrühschutz ${z}`, en: `Thermostatic mixing valve ${z}`,
      desc: { de: `Thermostatischer Brauchwassermischer (Verbrühschutz) DN ${dn}, einstellbar ca. 35–60 °C, Anschlüsse ${z} AG: Warm, Kalt, Mischwasser – in den Zuläufen Rückflussverhinderer vorsehen`, en: `Thermostatic mixing valve DN ${dn}, approx. 35–60 °C, ${z} male: hot, cold, mixed – use check valves in the inlets` },
      warn: W_TW_ONLY, ports: [L(-0.6, 0, -1, 0, ag(s), 'Warm'), L(0, 0.6, 0, 1, ag(s), 'Kalt'), L(0.6, 0, 1, 0, ag(s), 'Mischwasser')] });
  });
  arm({ id: 'wz-15', cat: 'twarm', sym: 'wz', de: 'Wasserzähler Q3 2,5 (DN 15) ¾″ AG', en: 'Water meter Q3 2.5 (DN 15) ¾″ male',
    desc: { de: 'Hauswasserzähler (Aufputz) Q3 = 2,5 m³/h, DN 15, Baulänge 80 oder 110 mm, Anschlussgewinde ¾″ AG – an Zählerverschraubungen ¾″ × ½″ oder Zähler-Anschlussbügel; Hauptwasserzähler stellt der Wasserversorger', en: 'Surface water meter Q3 2.5, DN 15, 80/110 mm, connection thread ¾″ male – main meter is provided by the utility' },
    warn: W_TW_ONLY, ports: inl(ag('3/4'), ag('3/4'), 0.6) });
  arm({ id: 'wz-20', cat: 'twarm', sym: 'wz', de: 'Wasserzähler Q3 4 (DN 20) 1″ AG', en: 'Water meter Q3 4 (DN 20) 1″ male',
    desc: { de: 'Hauswasserzähler (Aufputz) Q3 = 4 m³/h, DN 20, Baulänge 130 mm, Anschlussgewinde 1″ AG – an Zählerverschraubungen 1″ × ¾″', en: 'Surface water meter Q3 4, DN 20, 130 mm, connection thread 1″ male' },
    warn: W_TW_ONLY, ports: inl(ag('1'), ag('1'), 0.65) });
  [['3/4', '1/2'], ['1', '3/4']].forEach(([a, b]) => arm({ id: `wzv-${KZ(a)}-${KZ(b)}`, cat: 'twarm', shape: 'union', de: `Zählerverschraubung ${ZOLL[a]} ÜM × ${ZOLL[b]} AG`, en: `Meter union ${ZOLL[a]} nut × ${ZOLL[b]} male`,
    desc: { de: `Wasserzähler-Verschraubung Messing, Überwurfmutter ${ZOLL[a]} flachdichtend (mit Dichtung) × ${ZOLL[b]} AG, je Zähler 2 Stück`, en: `Water meter union, ${ZOLL[a]} nut flat seal × ${ZOLL[b]} male, 2 per meter` },
    ports: [L(-0.5, 0, -1, 0, ig(a), 'Zähler'), L(0.5, 0, 1, 0, ag(b), 'Leitung')] }));
  [['3/4', '15', '110'], ['1', '20', '130']].forEach(([s, dn, bl]) => arm({ id: `wzb-${KZ(s)}`, cat: 'twarm', sym: 'wzb', de: `Zähler-Anschlussbügel ${ZOLL[s]} mit Absperrungen`, en: `Meter connection bracket ${ZOLL[s]} with shut-offs`,
    desc: { de: `Wasserzähler-Anschlussbügel / Zählerbausatz für Zähler DN ${dn} (Baulänge ${bl} mm), mit Absperrventilen und Wandbefestigung, Leitungsanschluss ${ZOLL[s]} IG beidseitig – Zähler separat`, en: `Water meter bracket for DN ${dn} meters (${bl} mm) with shut-off valves, pipe connection ${ZOLL[s]} F – meter separate` },
    warn: W_TW_ONLY, ports: inl(ig(s), ig(s), 1.25) }));
  arm({ id: 'wsd-12', cat: 'twarm', sym: 'wsd', de: 'Wasserschlagdämpfer ½″ AG', en: 'Water hammer arrestor ½″ male',
    desc: { de: 'Wasserschlagdämpfer (Druckstoßdämpfer) ½″ AG, nahe an schnell schließenden Ventilen (Waschmaschine, Spülmaschine, Magnetventile) einbauen', en: 'Water hammer arrestor ½″ male, install close to fast-closing valves' },
    ports: [L(0, 0.5, 0, 1, ag('1/2'), 'Anschluss')] });
  arm({ id: 'fj-34', cat: 'twarm', sym: 'fj', de: 'Durchströmungsarmatur (Flow-Jet) ¾″ für TW-Ausdehnungsgefäß', en: 'Flow-through fitting ¾″ for potable expansion vessel',
    desc: { de: 'Durchströmungsarmatur mit Absperrung und Entleerung für Trinkwasser-Ausdehnungsgefäße (DIN 4807-5), Leitung ¾″ AG beidseitig, Gefäßanschluss ¾″ IG oben – sorgt für Durchströmung (Hygiene)', en: 'Flow-through valve with shut-off and drain for potable expansion vessels, line ¾″ male both sides, vessel connection ¾″ female on top' },
    warn: W_TW_ONLY, ports: [L(-0.75, 0, -1, 0, ag('3/4'), 'Leitung'), L(0.75, 0, 1, 0, ag('3/4'), 'Leitung'), L(0, -0.5, 0, -1, ig('3/4'), 'Gefäß')] });
  [2, 3, 4].forEach((n) => arm({ id: `vt-${n}`, cat: 'twarm', sym: 'vt', de: `Verteiler 1″ mit ${n} Abgängen ¾″ AG`, en: `Manifold 1″ with ${n} outlets ¾″ male`,
    desc: { de: `Messing-Verteiler 1″ IG × 1″ AG (mehrere Verteiler kombinierbar), ${n} Abgänge ¾″ AG Eurokonus (Abstand 50 mm) – für Rohranschluss Eurokonus-Klemmverschraubungen verwenden`, en: `Brass manifold 1″ F × 1″ M, ${n} outlets ¾″ male Eurocone (50 mm spacing) – use Eurocone compression adapters` },
    ports: [L(-(n + 1) * 0.25, 0, -1, 0, ig('1'), 'Zulauf'), L((n + 1) * 0.25, 0, 1, 0, ag('1'), 'Weiter')].concat(Array.from({ length: n }, (_, i) => L(-(n - 1) * 0.25 + i * 0.5, 0.5, 0, 1, ag('3/4'), 'Abgang ' + (i + 1)))) }));
  arm({ id: 'zp-12', cat: 'twarm', sym: 'pump', mat: 'ms', de: 'Zirkulationspumpe Trinkwasser ½″ IG', en: 'DHW circulation pump ½″ F',
    desc: { de: 'Trinkwasser-Zirkulationspumpe (Gehäuse Edelstahl/Messing), Baulänge 110 mm, inkl. Verschraubungen ½″ IG, mit Zeitschaltuhr/Thermostat – Pfeil = Förderrichtung', en: 'DHW circulation pump (stainless/brass body), 110 mm, incl. unions ½″ F – arrow = flow direction' },
    warn: W_TW_ONLY, ports: inl(ig('1/2'), ig('1/2'), 0.8) });

  /* Hähne & Ventile (Ergänzungen) */
  add({ id: 'kfe-34', cat: 'valve', mat: 'ms', shape: 'kfe', de: 'KFE-Hahn ¾″ AG', en: 'Fill & drain valve ¾″ male',
    desc: { de: 'Kessel-Füll- und Entleerhahn (KFE-Kugelhahn) Messing, ¾″ AG, mit Schlauchtülle und Kappe', en: 'Fill & drain ball valve ¾″ male with hose tail' },
    ports: [L(-0.5, 0, -1, 0, ag('3/4'))] });
  add({ id: 'keckv-12', cat: 'valve', mat: 'vc', shape: 'eckv', de: 'Kombi-Eckventil ½″ × ⅜″ + ¾″', en: 'Combi angle valve ½″ × ⅜″ + ¾″',
    desc: { de: 'Kombi-Eckventil verchromt, ½″ AG Wand × ⅜″ AG (Armatur) + ¾″ AG Geräteanschluss mit Rückflussverhinderer (Geschirrspüler)', en: 'Combi angle valve ½″ wall × ⅜″ tap + ¾″ appliance outlet with check valve' },
    warn: W_TW_ONLY, ports: [L(-0.5, 0, -1, 0, ag('1/2'), 'Wand'), L(0, 0.5, 0, 1, ag('3/8'), 'Armatur'), L(0.5, 0, 1, 0, ag('3/4'), 'Gerät')] });

  /* Heizungs-Armaturen & Pumpen */
  arm({ id: 'pump-15-130', cat: 'hzarm', sym: 'pump', mat: 'rd', de: 'Heizungs-Umwälzpumpe 15/60, 130 mm, ½″ IG', en: 'Heating circulator 15/60, 130 mm, ½″ F',
    desc: { de: 'Hocheffizienz-Umwälzpumpe Heizung, Baulänge 130 mm, Pumpengewinde G 1″, inkl. Pumpenverschraubungen G 1″ × ½″ IG – Pfeil = Förderrichtung', en: 'High-efficiency heating circulator, 130 mm, G 1″, incl. pump unions G 1″ × ½″ F – arrow = flow direction' },
    warn: { tw: { de: 'Heizungspumpen (Grauguss) nicht für Trinkwasser – dort eine Zirkulationspumpe aus Edelstahl/Messing verwenden.', en: 'Cast-iron heating pumps are not for drinking water – use a stainless/brass circulation pump.' }, tww: { de: 'Heizungspumpen (Grauguss) nicht für Trinkwasser – dort eine Zirkulationspumpe aus Edelstahl/Messing verwenden.', en: 'Cast-iron heating pumps are not for drinking water.' } },
    ports: inl(ig('1/2'), ig('1/2'), 1) });
  arm({ id: 'pump-25-180', cat: 'hzarm', sym: 'pump', mat: 'rd', de: 'Heizungs-Umwälzpumpe 25/60, 180 mm, 1″ IG', en: 'Heating circulator 25/60, 180 mm, 1″ F',
    desc: { de: 'Hocheffizienz-Umwälzpumpe Heizung, Baulänge 180 mm, Pumpengewinde G 1½″, inkl. Pumpenverschraubungen G 1½″ × 1″ IG – Pfeil = Förderrichtung', en: 'High-efficiency heating circulator, 180 mm, G 1½″, incl. pump unions G 1½″ × 1″ F – arrow = flow direction' },
    warn: { tw: { de: 'Heizungspumpen (Grauguss) nicht für Trinkwasser.', en: 'Cast-iron heating pumps are not for drinking water.' }, tww: { de: 'Heizungspumpen (Grauguss) nicht für Trinkwasser.', en: 'Cast-iron heating pumps are not for drinking water.' } },
    ports: inl(ig('1'), ig('1'), 1.15) });
  ['3/4', '1'].forEach((s) => {
    const z = ZOLL[s], k = KZ(s);
    arm({ id: `mix3-${k}`, cat: 'hzarm', sym: 'mix3', de: `3-Wege-Mischer ${z} IG`, en: `3-way mixing valve ${z} F`,
      desc: { de: `3-Wege-Drehmischer Messing DN ${DN[s]}, ${z} IG an allen drei Anschlüssen, Handgriff mit Skala, für Stellmotor vorbereitet – Anschlusslage (Vorlauf/Rücklauf/Mischer) laut Hersteller`, en: `3-way rotary mixing valve DN ${DN[s]}, ${z} F all ports, manual knob, actuator-ready` },
      warn: W_HZ_ONLY, ports: [L(-0.6, 0, -1, 0, ig(s), 'Kessel-Vorlauf'), L(0, 0.6, 0, 1, ig(s), 'Rücklauf'), L(0.6, 0, 1, 0, ig(s), 'Heizkreis')] });
    arm({ id: `sla-${k}`, cat: 'hzarm', sym: 'sla', de: `Schlammabscheider mit Magnet ${z} IG`, en: `Dirt separator with magnet ${z} F`,
      desc: { de: `Schlamm- und Magnetitabscheider mit Magnet, Entlüfter und Entleerhahn, ${z} IG/IG, im Rücklauf vor dem Wärmeerzeuger einbauen`, en: `Dirt & magnetite separator with magnet, vent and drain, ${z} F/F, install in the return before the boiler` },
      warn: W_HZ_ONLY, ports: inl(ig(s), ig(s)) });
    arm({ id: `kv-${k}`, cat: 'safety', sym: 'kv', de: `Kappenventil ${z} IG/IG`, en: `Cap valve ${z} F/F`,
      desc: { de: `Messing-Kappenventil ${z} IG/IG mit Entleerung und Plombiervorrichtung – gesicherte Absperrung zum Ausdehnungsgefäß (Heizung, nur mit Werkzeug zu schließen)`, en: `Brass cap valve ${z} F/F with drain – secured shut-off to the expansion vessel` },
      warn: W_HZ_ONLY, ports: inl(ig(s), ig(s), 0.6) });
    arm({ id: `dfb-${k}`, cat: 'hzarm', sym: 'dfb', de: `Durchflussmengenbegrenzer ${z} AG`, en: `Flow limiter ${z} male`,
      desc: { de: `Durchflussmengenbegrenzer mit Schauglas-Anzeige (z. B. 2–12 l/min), 2 × ${z} AG – für hydraulischen Abgleich von Heiz- und Solarkreisen`, en: `Flow limiter/flow meter with sight glass, 2 × ${z} male – for balancing heating & solar circuits` },
      warn: W_HZ_ONLY, ports: inl(ag(s), ag(s)) });
  });
  ['1/2', '3/4', '1'].forEach((s) => {
    const z = ZOLL[s], k = KZ(s);
    arm({ id: `strv-${k}`, cat: 'hzarm', sym: 'strv', de: `Strangregulierventil ${z} IG/IG`, en: `Balancing valve ${z} F/F`,
      desc: { de: `Strangregulierventil DN ${DN[s]} mit Voreinstellung, Messnippeln und Absperrfunktion, ${z} IG/IG – für den hydraulischen Abgleich (Heizung; Trinkwasser-Zirkulation nur mit DVGW-Zulassung)`, en: `Balancing valve DN ${DN[s]} with presetting, test points and shut-off, ${z} F/F` },
      ports: inl(ig(s), ig(s)) });
    arm({ id: `sf-${k}`, cat: 'hzarm', sym: 'sf', de: `Schmutzfänger ${z} IG/IG`, en: `Y-strainer ${z} F/F`,
      desc: { de: `Messing-Schmutzfänger mit Edelstahlsieb, ${z} IG/IG, Siebkappe nach unten einbauen – Pfeil = Fließrichtung`, en: `Brass Y-strainer with stainless screen, ${z} F/F, screen cap pointing down – arrow = flow direction` },
      ports: inl(ig(s), ig(s), 0.6) });
  });
  arm({ id: 'usv-34', cat: 'hzarm', sym: 'usv', de: 'Überströmventil ¾″ IG/IG', en: 'Differential bypass valve ¾″ F/F',
    desc: { de: 'Differenzdruck-Überströmventil ¾″ IG/IG, einstellbar ca. 0,1–0,6 bar, zwischen Vor- und Rücklauf (Bypass) – Pfeil = Fließrichtung', en: 'Differential pressure bypass valve ¾″ F/F, adjustable approx. 0.1–0.6 bar, between flow and return' },
    warn: W_HZ_ONLY, ports: inl(ig('3/4'), ig('3/4'), 0.6) });
  add({ id: 'tv-e-12', cat: 'hzarm', shape: 'arm', sym: 'tv', mat: 'vc', de: 'Thermostatventil ½″ Eckform + Kopf', en: 'Thermostatic radiator valve ½″ angle + head',
    desc: { de: 'Heizkörper-Thermostatventil Eckform mit Voreinstellung, ½″ IG Rohranschluss × ½″ AG Heizkörper (mit Verschraubung), inkl. Thermostatkopf M30×1,5', en: 'Thermostatic radiator valve, angle, ½″ F pipe × ½″ M radiator (with union), incl. head M30x1.5' },
    warn: W_HZ_ONLY, ports: [L(0, 0.5, 0, 1, ig('1/2'), 'Rohr'), L(0.5, 0, 1, 0, ag('1/2'), 'Heizkörper')] });
  add({ id: 'tv-d-12', cat: 'hzarm', shape: 'arm', sym: 'tv', mat: 'vc', de: 'Thermostatventil ½″ Durchgang + Kopf', en: 'Thermostatic radiator valve ½″ straight + head',
    desc: { de: 'Heizkörper-Thermostatventil Durchgangsform mit Voreinstellung, ½″ IG Rohranschluss × ½″ AG Heizkörper (mit Verschraubung), inkl. Thermostatkopf M30×1,5', en: 'Thermostatic radiator valve, straight, ½″ F pipe × ½″ M radiator, incl. head' },
    warn: W_HZ_ONLY, ports: [L(-0.6, 0, -1, 0, ig('1/2'), 'Rohr'), L(0.6, 0, 1, 0, ag('1/2'), 'Heizkörper')] });
  add({ id: 'rlv-e-12', cat: 'hzarm', shape: 'arm', sym: 'rlv', mat: 'vc', de: 'Rücklaufverschraubung ½″ Eckform', en: 'Lockshield valve ½″ angle',
    desc: { de: 'Heizkörper-Rücklaufverschraubung Eckform, absperrbar und regulierbar (hydraulischer Abgleich), ½″ IG Rohr × ½″ AG Heizkörper', en: 'Radiator lockshield valve, angle, ½″ F pipe × ½″ M radiator' },
    warn: W_HZ_ONLY, ports: [L(0, 0.5, 0, 1, ig('1/2'), 'Rohr'), L(0.5, 0, 1, 0, ag('1/2'), 'Heizkörper')] });
  add({ id: 'rlv-d-12', cat: 'hzarm', shape: 'arm', sym: 'rlv', mat: 'vc', de: 'Rücklaufverschraubung ½″ Durchgang', en: 'Lockshield valve ½″ straight',
    desc: { de: 'Heizkörper-Rücklaufverschraubung Durchgangsform, absperrbar und regulierbar, ½″ IG Rohr × ½″ AG Heizkörper', en: 'Radiator lockshield valve, straight, ½″ F pipe × ½″ M radiator' },
    warn: W_HZ_ONLY, ports: [L(-0.6, 0, -1, 0, ig('1/2'), 'Rohr'), L(0.6, 0, 1, 0, ag('1/2'), 'Heizkörper')] });
  add({ id: 'hblk-e', cat: 'hzarm', shape: 'arm', sym: 'hblk', mat: 'vc', de: 'Hahnblock (H-Block) Eckform ½″ × ¾″', en: 'H-block angle ½″ × ¾″',
    desc: { de: 'Anschlussarmatur (H-Block) für Ventil-Heizkörper mit Mittenanschluss, Eckform, absperrbar, Heizkörperseite ½″ Überwurfmutter, Rohrseite ¾″ AG Eurokonus (Abstand 50 mm)', en: 'H-block for valve radiators, angle, shut-off, radiator side ½″ nut, pipe side ¾″ male Eurocone (50 mm spacing)' },
    warn: W_HZ_ONLY, ports: [L(-0.25, -0.5, 0, -1, ig('1/2'), 'Heizkörper VL'), L(0.25, -0.5, 0, -1, ig('1/2'), 'Heizkörper RL'), L(-0.25, 0.5, 0, 1, ag('3/4'), 'Rohr VL'), L(0.25, 0.5, 0, 1, ag('3/4'), 'Rohr RL')] });
  ['3/8', '1/2'].forEach((s) => {
    const z = ZOLL[s], k = KZ(s);
    arm({ id: `sent-${k}`, cat: 'hzarm', sym: 'sent', de: `Schnellentlüfter automatisch ${z} AG`, en: `Automatic air vent ${z} male`,
      desc: { de: `Automatischer Schwimmer-Schnellentlüfter Messing, ${z} AG, mit Rückhalte-/Absperrventil, senkrecht am höchsten Punkt einbauen`, en: `Automatic float air vent, ${z} male, with check/isolation valve, install vertically at the highest point` },
      warn: W_HZ_ONLY, ports: [L(0, 0.5, 0, 1, ag(s), 'Anschluss')] });
    arm({ id: `ment-${k}`, cat: 'hzarm', sym: 'ment', mat: 'vc', de: `Entlüftungsventil manuell ${z} AG`, en: `Manual air vent ${z} male`,
      desc: { de: `Entlüftungsventil (Vierkant, mit Entlüfterschlüssel) Messing vernickelt, drehbar, ${z} AG mit O-Ring selbstdichtend`, en: `Manual air vent (square key), nickel-plated brass, ${z} male, O-ring sealed` },
      warn: W_HZ_ONLY, ports: [L(0, 0.5, 0, 1, ag(s), 'Anschluss')] });
  });

  /* Sicherheit & Ausdehnung (Ergänzungen) */
  add({ id: 'ksg-1', cat: 'safety', shape: 'arm', sym: 'ksg', mat: 'ms', de: 'Kessel-Sicherheitsgruppe 1″ (3 bar)', en: 'Boiler safety group 1″ (3 bar)',
    desc: { de: 'Kessel-Sicherheitsgruppe für Heizungen bis ca. 50 kW: Sicherheitsventil 3 bar, Manometer und Schnellentlüfter auf Verteilerkörper, Anschluss 1″ IG unten, mit Wärmedämmung', en: 'Boiler safety group up to ~50 kW: 3 bar safety valve, gauge and air vent, 1″ F bottom connection' },
    warn: W_HZ_ONLY, ports: [L(0, 0.5, 0, 1, ig('1'), 'Anschluss')] });
  add({ id: 'mag-34', cat: 'safety', mat: 'rd', shape: 'vessel', de: 'Ausdehnungsgefäß Heizung 18–35 l ¾″ AG', en: 'Heating expansion vessel 18–35 l ¾″ male',
    desc: { de: 'Membran-Druckausdehnungsgefäß für geschlossene Heizungsanlagen (rot), 18–35 l, Vordruck ca. 1–1,5 bar (Anlage anpassen), Anschluss ¾″ AG – mit Kappenventil anschließen, Größe nach Anlagenvolumen berechnen', en: 'Diaphragm expansion vessel for sealed heating systems (red), 18–35 l, pre-charge approx. 1–1.5 bar, ¾″ male – connect via cap valve' },
    warn: { tw: { de: 'Heizungs-Ausdehnungsgefäße (rot) sind nicht für Trinkwasser zugelassen – dort ein durchströmtes Trinkwasser-Gefäß verwenden.', en: 'Red heating vessels are not approved for drinking water.' }, tww: { de: 'Heizungs-Ausdehnungsgefäße (rot) sind nicht für Trinkwasser zugelassen – dort ein durchströmtes Trinkwasser-Gefäß verwenden.', en: 'Red heating vessels are not approved for drinking water.' } },
    ports: [L(0, 0.5, 0, 1, ag('3/4'), 'Anschluss')] });

  /* Messen & Anzeigen */
  add({ id: 'thermo-12', cat: 'mess', mat: 'ms', shape: 'gauge', therm: true, de: 'Thermometer 0–120 °C ½″ AG', en: 'Thermometer 0–120 °C ½″ male',
    desc: { de: 'Bimetall-Thermometer Ø 63 mm, 0–120 °C, mit Tauchhülse ½″ AG (Länge 40–100 mm) – in T-Stück oder Muffe einschrauben', en: 'Bimetal thermometer Ø 63 mm, 0–120 °C, with ½″ male immersion pocket' },
    ports: [L(0, 0.5, 0, 1, ag('1/2'), 'Anschluss')] });
  add({ id: 'mano-hz-12', cat: 'mess', mat: 'ms', shape: 'gauge', de: 'Manometer Heizung 0–4 bar ½″ AG', en: 'Heating pressure gauge 0–4 bar ½″ male',
    desc: { de: 'Manometer Ø 63 mm, 0–4 bar (Heizung), Anschluss unten ½″ AG über Reduzierung, am besten mit Manometer-Absperrhahn', en: 'Pressure gauge Ø 63 mm, 0–4 bar for heating, ½″ male bottom connection' },
    warn: W_HZ_ONLY, ports: [L(0, 0.5, 0, 1, ag('1/2'), 'Anschluss')] });

  window.RP_DATA = { CATEGORIES, PARTS: P, ZOLL, MVN };
})();
