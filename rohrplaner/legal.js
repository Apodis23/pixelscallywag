/* Rohrplaner – Rechtliches: Impressum, Haftungsausschluss, Partnerlinks, Datenschutz (DE/EN)
   Anzeige im Dialog „Rechtliches“. Direkt aufrufbar über
   …/rohrplaner/#impressum · #haftung · #partnerlinks · #datenschutz */
(function () {
const ADR = 'Wilhelm Klein<br>Pixel Scallywag<br>In der Olk 19<br>54317 Gusterath<br>';
const MAIL = '<a href="mailto:pixel-scallywag@mail.grokbot.com">pixel-scallywag@mail.grokbot.com</a>';
window.RP_LEGAL = {};
window.RP_LEGAL.de = {
  title: 'Rechtliches',
  toc: [['impressum', 'Impressum'], ['haftung', 'Haftungsausschluss'], ['partnerlinks', 'Partnerlinks'], ['datenschutz', 'Datenschutz']],
  html: `
<section id="lg-impressum"><h3>Impressum</h3>
<p><b>Angaben gemäß § 5 DDG</b><br>${ADR}Deutschland</p>
<p><b>Kontakt</b><br>E-Mail: ${MAIL}</p>
<p><b>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</b><br>Wilhelm Klein, Anschrift wie oben</p>
<p><b>Haftung für Links</b><br>Diese Seite kann Links zu Websites Dritter enthalten. Auf deren Inhalte habe ich keinen Einfluss und übernehme dafür keine Gewähr; verantwortlich ist immer der jeweilige Anbieter. Zum Zeitpunkt der Verlinkung waren keine Rechtsverstöße erkennbar. Werden mir Rechtsverletzungen bekannt, entferne ich solche Links umgehend.</p>
<p><b>Urheberrecht</b><br>Programm, Texte und Grafiken des Rohrplaners sind eigene Werke von Pixel Scallywag. Deine eigenen Planungen gehören dir.</p>
<p><b>Verbraucherstreitbeilegung</b><br>Ich bin nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
</section>
<section id="lg-haftung"><h3>Haftungsausschluss</h3>
<p>Der Rohrplaner ist eine <b>kostenlose, vereinfachte Planungshilfe</b>. Er hilft dir zu überlegen, welche Teile du an welcher Stelle brauchst und wie viele.</p>
<ul>
<li><b>Nicht maßstäblich:</b> Fittinge und Armaturen werden als Symbole dargestellt. Maße und Rohrlängen sind Richtwerte – vor Kauf und Zuschnitt immer selbst nachmessen.</li>
<li><b>Kein Ersatz für einen Fachbetrieb:</b> Die App ersetzt keine Fachplanung, keine Beratung und keine Montage durch einen Installateur. Arbeiten an der Trinkwasser-Installation dürfen in Deutschland nur Installateurbetriebe ausführen, die in das Installateurverzeichnis des Wasserversorgers eingetragen sind (§ 12 AVBWasserV); die Anforderungen der Trinkwasserverordnung (TrinkwV) und die anerkannten Regeln der Technik sind einzuhalten. Auch Heizungsanlagen sollten von einem Fachbetrieb geplant, montiert und in Betrieb genommen werden.</li>
<li><b>Teileliste ohne Gewähr:</b> Ich übernehme keine Gewähr für Richtigkeit, Vollständigkeit und Aktualität der Teileliste, der Bezeichnungen oder der Mengen. Dichtungen, Befestigungen, Dämmung, Werkzeug und Kleinteile sind in der Regel nicht enthalten.</li>
<li><b>Hinweise sind nur Hinweise:</b> Die Warnungen zur Verträglichkeit (z. B. passt/passt nicht, Mischinstallation, Sicherheitsgruppe) sind eine Hilfe, aber keine vollständige oder verbindliche Prüfung. Fehlt eine Warnung, heißt das nicht, dass die Planung fachlich richtig ist.</li>
</ul>
<p>Die Nutzung erfolgt auf eigenes Risiko. Für Schäden aus der Nutzung hafte ich nur bei Vorsatz und grober Fahrlässigkeit sowie bei Verletzung von Leben, Körper oder Gesundheit.</p>
</section>
<section id="lg-partnerlinks"><h3>Partnerlinks</h3>
<p>Der Rohrplaner ist kostenlos. Damit das so bleibt, erscheinen in der Teileliste Links zu Online-Shops (Partnerlinks). Dafür gilt:</p>
<p class="aff-note"><b>Enthält Partnerlinks:</b> Kaufst du über einen Link, bekomme ich eine kleine Provision. Für dich ändert sich der Preis nicht.</p>
<p>Partnerlinks werden in der App direkt am Link gekennzeichnet. Welche Shops verlinkt sind, beeinflusst weder die Teileliste noch die Hinweise. Derzeit verlinkt der Rohrplaner in der Teileliste auf HeizungsDiscount24 (Button „bei HeizungsDiscount24 ansehen“, gekennzeichnet mit * und „Anzeige“). Die Links führen über das Partnernetzwerk AWIN zur Shop-Suche; Größe und Ausführung bitte vor dem Kauf selbst prüfen.</p>
</section>
<section id="lg-datenschutz"><h3>Datenschutzerklärung</h3>
<p><b>Verantwortlicher</b><br>${ADR}Deutschland<br>E-Mail: ${MAIL}</p>
<p><b>Kurz gesagt:</b> Der Rohrplaner hat kein Benutzerkonto, setzt keine Cookies und nutzt kein Tracking, keine Analyse-Tools, keine Werbebanner und keine externen Schriften (nur gekennzeichnete Partnerlinks, siehe Punkt 3). Deine Projekte bleiben auf deinem Gerät.</p>
<p><b>1. Hosting bei GitHub Pages</b><br>Die Seite wird über GitHub Pages bereitgestellt (GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA). Beim Aufruf verarbeitet GitHub technisch notwendige Daten, insbesondere deine IP-Adresse, Datum und Uhrzeit, die aufgerufene Datei und Browser-Angaben, um die Seite auszuliefern und vor Angriffen zu schützen; diese Daten können in Server-Logs gespeichert werden. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer sicheren, funktionierenden Website). Dabei können Daten in die USA übermittelt werden; GitHub ist nach dem EU-US Data Privacy Framework zertifiziert. Einzelheiten: <a href="https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">Datenschutzerklärung von GitHub</a>.</p>
<p><b>2. Speicherung in deinem Browser</b><br>Dein aktuelles Projekt, gespeicherte Projekte und Einstellungen (Sprache, Stangen-Option, KI-Schalter, ob der Startbildschirm schon gezeigt wurde) werden nur im lokalen Speicher deines Browsers (localStorage) abgelegt. Für die Offline-Nutzung speichert ein Service Worker die App-Dateien im Browser-Cache. Diese Daten werden nicht an mich oder Dritte übertragen. Du kannst sie jederzeit löschen, indem du die Website-Daten in deinem Browser entfernst. Rechtsgrundlage ist § 25 Abs. 2 Nr. 2 TDDDG (für die von dir gewünschte Funktion unbedingt erforderlich). Exportierte Dateien (CSV, JSON, PDF) entstehen ebenfalls nur auf deinem Gerät.</p>
<p><b>3. Partnerlinks</b><br>Beim bloßen Anzeigen der Links werden keine Daten an Shops übertragen. Erst wenn du auf einen Partnerlink klickst, wirst du über das Partnernetzwerk AWIN (AWIN AG, Eichhornstraße 3, 10785 Berlin) zum jeweiligen Shop weitergeleitet. AWIN und der Shop können dabei Cookies oder ähnliche Techniken einsetzen, um den Kauf dem Rohrplaner zuzuordnen. Dafür sind AWIN und der Shop verantwortlich; es gelten deren Datenschutzerklärungen (<a href="https://www.awin.com/de/datenschutzerklarung" target="_blank" rel="noopener">AWIN</a>).</p>
<p><b>4. Kontakt per E-Mail</b><br>Wenn du mir schreibst, verarbeite ich deine Angaben nur, um deine Anfrage zu beantworten (Art. 6 Abs. 1 lit. b bzw. f DSGVO), und lösche sie, wenn sie nicht mehr gebraucht werden.</p>
<p><b>5. Deine Rechte</b><br>Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch (Art. 15–21 DSGVO). Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren, z. B. beim Landesbeauftragten für den Datenschutz und die Informationsfreiheit Rheinland-Pfalz.</p>
<p class="lg-stand">Stand: Oktober 2026</p>
</section>`,
};
window.RP_LEGAL.en = {
  title: 'Legal',
  toc: [['impressum', 'Imprint'], ['haftung', 'Disclaimer'], ['partnerlinks', 'Affiliate links'], ['datenschutz', 'Privacy']],
  html: `
<section id="lg-impressum"><h3>Imprint (Impressum)</h3>
<p><b>Information pursuant to § 5 DDG (German Digital Services Act)</b><br>${ADR}Germany</p>
<p><b>Contact</b><br>Email: ${MAIL}</p>
<p><b>Responsible for content pursuant to § 18 (2) MStV</b><br>Wilhelm Klein, address as above</p>
<p><b>Liability for links</b><br>This site may contain links to third-party websites. I have no influence on their content and accept no liability for it; the respective provider is always responsible. No legal violations were apparent at the time of linking. If I become aware of any infringement, I will remove such links immediately.</p>
<p><b>Copyright</b><br>The program, texts and graphics of Rohrplaner are original works by Pixel Scallywag. Your own plans belong to you.</p>
<p><b>Consumer dispute resolution</b><br>I am neither willing nor obliged to take part in dispute resolution proceedings before a consumer arbitration board.</p>
</section>
<section id="lg-haftung"><h3>Disclaimer</h3>
<p>Rohrplaner is a <b>free, simplified planning aid</b>. It helps you work out which parts you need where, and how many.</p>
<ul>
<li><b>Not to scale:</b> fittings and valves are shown as symbols. Sizes and pipe lengths are guide values – always measure yourself before buying and cutting.</li>
<li><b>No replacement for a professional:</b> the app does not replace professional planning, advice or installation by a licensed installer. In Germany, work on drinking water installations may only be carried out by installers registered with the local water supplier (§ 12 AVBWasserV); the requirements of the Drinking Water Ordinance (TrinkwV) and accepted engineering standards must be met. Heating systems should also be planned, installed and commissioned by a professional.</li>
<li><b>Parts list without warranty:</b> I give no warranty for the correctness, completeness or timeliness of the parts list, names or quantities. Seals, fixings, insulation, tools and small parts are usually not included.</li>
<li><b>Hints are just hints:</b> the compatibility warnings (fits/does not fit, mixed installation, safety group, etc.) are an aid, not a complete or binding check. A missing warning does not mean the plan is technically correct.</li>
</ul>
<p>Use at your own risk. I am only liable for damage resulting from use in cases of intent or gross negligence and for injury to life, body or health.</p>
</section>
<section id="lg-partnerlinks"><h3>Affiliate links</h3>
<p>Rohrplaner is free. To keep it that way, the parts list shows links to online shops (affiliate links). The following applies:</p>
<p class="aff-note"><b>Contains affiliate links:</b> if you buy through a link, I receive a small commission. The price stays the same for you.</p>
<p>Affiliate links are marked directly at the link in the app. Which shops are linked does not influence the parts list or the hints. The parts list currently links to HeizungsDiscount24 (button “view at HeizungsDiscount24”, marked with * and “Ad”). The links lead via the affiliate network AWIN to the shop search; please check size and type yourself before buying.</p>
</section>
<section id="lg-datenschutz"><h3>Privacy policy</h3>
<p><b>Controller</b><br>${ADR}Germany<br>Email: ${MAIL}</p>
<p><b>In short:</b> Rohrplaner has no user accounts, sets no cookies and uses no tracking, analytics, ad banners or external fonts (only marked affiliate links, see section 3). Your projects stay on your device.</p>
<p><b>1. Hosting on GitHub Pages</b><br>The site is served via GitHub Pages (GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA). When you open it, GitHub processes technically necessary data, in particular your IP address, date and time, the requested file and browser details, to deliver the site and protect it against attacks; this data may be stored in server logs. Legal basis is Art. 6(1)(f) GDPR (legitimate interest in a secure, working website). Data may be transferred to the USA; GitHub is certified under the EU-US Data Privacy Framework. Details: <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">GitHub privacy statement</a>.</p>
<p><b>2. Storage in your browser</b><br>Your current project, saved projects and settings (language, bar option, AI toggle, whether the splash screen was shown) are stored only in your browser's local storage (localStorage). For offline use, a service worker stores the app files in the browser cache. This data is not transmitted to me or third parties. You can delete it at any time by clearing the site data in your browser. Legal basis is § 25(2) no. 2 TDDDG (strictly necessary for the function you requested). Exported files (CSV, JSON, PDF) are also created only on your device.</p>
<p><b>3. Affiliate links</b><br>No data is sent to shops merely by displaying them. Only when you click an affiliate link are you redirected via the affiliate network AWIN (AWIN AG, Eichhornstraße 3, 10785 Berlin, Germany) to the shop. AWIN and the shop may use cookies or similar technologies to attribute the purchase to Rohrplaner. AWIN and the shop are responsible for this; their privacy policies apply (<a href="https://www.awin.com/gb/privacy" target="_blank" rel="noopener">AWIN</a>).</p>
<p><b>4. Contact by email</b><br>If you write to me, I only process your details to answer your request (Art. 6(1)(b) or (f) GDPR) and delete them when no longer needed.</p>
<p><b>5. Your rights</b><br>You have the right of access, rectification, erasure, restriction of processing, data portability and objection (Art. 15–21 GDPR). You can also lodge a complaint with a data protection supervisory authority, e.g. the State Commissioner for Data Protection and Freedom of Information of Rhineland-Palatinate.</p>
<p class="lg-stand">Last updated: October 2026</p>
</section>`,
};
})();
