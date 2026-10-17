/* =====================================================================
   Rohrplaner – Teilebibliothek
   ---------------------------------------------------------------------
   Diese Datei kann frei erweitert werden. Jedes Teil hat:
     id        eindeutige Kennung (Text)
     de / en   Name deutsch / englisch
     cat       Kategorie-Schlüssel (siehe CATEGORIES)
     mat       Material: 'mv' (Alu-Verbund), 'cu' (Kupfer), 'st' (Stahl verzinkt),
               'ms' (Messing), 'tg' (Temperguss verzinkt), 'vc' (verchromt), 'es' (Edelstahl)
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
    { id: 'cupress', de: 'Pressfittinge Kupfer', en: 'Press fittings copper' },
    { id: 'msgew', de: 'Gewindefittinge Messing', en: 'Brass threaded fittings' },
    { id: 'tg', de: 'Gewindefittinge Temperguss (verzinkt)', en: 'Malleable iron threaded fittings' },
    { id: 'valve', de: 'Hähne & Ventile', en: 'Valves' },
    { id: 'safety', de: 'Sicherheit', en: 'Safety' },
    { id: 'hose', de: 'Panzerschläuche', en: 'Braided hoses' },
  ];

  const ZOLL = { '3/8': '⅜″', '1/2': '½″', '3/4': '¾″', '1': '1″' };
  const MVN = { MV16: '16×2', MV20: '20×2', MV26: '26×3' };
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
  ['CU15', 'CU18', 'CU22'].forEach((s) => add({
    id: 'rohr-' + s.toLowerCase(), cat: 'pipe', mat: 'cu', shape: 'pipe', pipe: { bar: 5 },
    de: `Kupferrohr ${s.slice(2)} mm`, en: `Copper pipe ${s.slice(2)} mm`,
    desc: { de: `Kupferrohr ${s.slice(2)}×1 mm halbhart, Stange 5 m, für Heizung und Trinkwasser`, en: `Copper tube ${s.slice(2)}x1 mm, 5 m bar` },
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
    { cat: 'mvpress', mat: 'mvp', tech: 'Press', sizes: ['MV16', 'MV20', 'MV26'], red: [['MV20', 'MV16'], ['MV26', 'MV20'], ['MV26', 'MV16']],
      tr: { MV16: ['1/2', '3/4'], MV20: ['1/2', '3/4'], MV26: ['3/4', '1'] }, nameDe: 'Press', nameEn: 'press', pre: 'mvp',
      sysDe: 'Alu-Verbund', sysEn: 'multilayer' },
    { cat: 'mvschraub', mat: 'ms', tech: 'Schraub', sizes: ['MV16', 'MV20', 'MV26'], red: [['MV20', 'MV16'], ['MV26', 'MV20']],
      tr: { MV16: ['1/2', '3/4'], MV20: ['1/2', '3/4'], MV26: ['3/4', '1'] }, nameDe: 'Schraub', nameEn: 'compression', pre: 'mvs',
      sysDe: 'Alu-Verbund', sysEn: 'multilayer' },
    { cat: 'cupress', mat: 'cup', tech: 'Press', sizes: ['CU15', 'CU18', 'CU22'], red: [['CU18', 'CU15'], ['CU22', 'CU18'], ['CU22', 'CU15']],
      tr: { CU15: ['1/2'], CU18: ['1/2', '3/4'], CU22: ['3/4', '1'] }, nameDe: 'Press', nameEn: 'press', pre: 'cup',
      sysDe: 'Kupfer', sysEn: 'copper' },
  ];
  SYS.forEach((S) => {
    const dsz = (s) => (s.startsWith('MV') ? MVN[s] : s.slice(2));
    const descBase = (S.tech === 'Press'
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
      add({ ...base, id: `${S.pre}-k-${s}`, shape: 'fit', de: `${S.pre === 'cup' ? 'Muffe' : 'Kupplung'} ${S.nameDe} ${dsz(s)}`, en: `Coupling ${S.nameEn} ${dsz(s)}`,
        desc: { de: `${descBase}. ${S.pre === 'cup' ? 'Muffe' : 'Kupplung'} gerade, ${dsz(s)} mm`, en: `Straight coupling, ${dsz(s)} mm` }, ports: [L(-0.5, 0, -1, 0, T()), L(0.5, 0, 1, 0, T())] });
      (S.tr[s] || []).forEach((z) => {
        add({ ...base, id: `${S.pre}-uag-${s}-${z.replace('/', '')}`, shape: 'fit', de: `Übergang ${S.nameDe} ${dsz(s)} × ${ZOLL[z]} AG`, en: `Adapter ${S.nameEn} ${dsz(s)} × ${ZOLL[z]} male`,
          desc: { de: `${descBase}. Übergang auf Außengewinde ${ZOLL[z]}`, en: `Adapter to male thread ${ZOLL[z]}` }, ports: [L(-0.5, 0, -1, 0, T()), L(0.5, 0, 1, 0, ag(z))] });
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
      add({ ...base, id: `${pre}-st-${k}`, shape: 'plug', de: `Stopfen ${z} AG`, en: `Plug ${z} male`, desc: { de: `${D}. Stopfen mit Vierkant, ${z} AG`, en: `Plug ${z}` }, ports: [L(-0.5, 0, -1, 0, ag(s))] });
      add({ ...base, id: `${pre}-ka-${k}`, shape: 'cap', de: `Kappe ${z} IG`, en: `Cap ${z} female`, desc: { de: `${D}. Kappe, ${z} IG`, en: `Cap ${z}` }, ports: [L(-0.5, 0, -1, 0, ig(s))] });
    });
    [['3/4', '1/2'], ['1', '3/4']].forEach(([a, b]) => {
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

  /* ---------------- Panzerschläuche ---------------- */
  [['1/2', 'ig'], ['3/4', 'ig'], ['1/2', 'ag']].forEach(([s, kind]) => [30, 50, 100].forEach((len) => {
    const z = ZOLL[s], c = len / 10;
    add({ id: `ps-${s.replace('/', '')}-${kind}-${len}`, cat: 'hose', mat: 'es', shape: 'hose', len,
      de: `Panzerschlauch ${z} ${kind === 'ig' ? 'ÜM/ÜM' : 'ÜM/AG'} ${len} cm`, en: `Braided hose ${z} ${kind === 'ig' ? 'F/F' : 'F/M'} ${len} cm`,
      desc: { de: `Edelstahl-Panzerschlauch EPDM-Seele, ${z} Überwurfmutter flachdichtend × ${kind === 'ig' ? 'Überwurfmutter' : 'Außengewinde'}, Länge ${len} cm`, en: `Stainless braided hose ${z}, ${len} cm` },
      ports: [L(-c / 2, 0, -1, 0, ig(s)), L(c / 2, 0, 1, 0, kind === 'ig' ? ig(s) : ag(s))] });
  }));

  window.RP_DATA = { CATEGORIES, PARTS: P, ZOLL, MVN };
})();
