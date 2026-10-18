/* Rohrplaner – Hilfetext im Info-Dialog ({disc} = Haftungshinweis) */
window.RP_INFO = {
de: `<ol style="padding-left:20px;line-height:1.55;margin-top:0">
<li><b>Medium wählen</b> (oben): Trinkwasser kalt, warm + kalt oder Heizung.</li>
<li><b>Teil hinzufügen:</b> In der Bibliothek antippen. Ist ein Teil markiert, wird das neue Teil <b>automatisch an dessen freies Ende angesteckt</b>. Oder mit der Maus (am Handy: lange drücken) auf die Fläche ziehen.</li>
<li><b>Freies Ende wählen:</b> Am markierten Teil auf einen orangen Kreis tippen (wird blau) – dort wird als Nächstes angesteckt.</li>
<li><b>Rohre:</b> Rohr antippen, während ein Fitting markiert ist = 50 cm Rohr wird angesteckt. Länge unten eingeben oder den blauen Endpunkt ziehen. Ohne Markierung startet der Zeichenmodus: auf der Fläche ziehen.</li>
<li><b>Verbindungen:</b> <span style="color:#1a9e4b">●</span> grün = passt, <span style="color:#d63b3b">●</span> rot = passt nicht (antippen für Tipp), <span style="color:#f08c00">○</span> orange = offenes Ende.</li>
<li><b>Drehen</b> wechselt bei einem angesteckten Teil die Lage (z. B. Winkel nach oben/unten), ohne die Verbindung zu lösen.</li>
<li><b>Teileliste</b> zeigt alle Teile mit Mengen und Rohrlängen – als CSV (Excel) oder zum Drucken/PDF.</li></ol>
<p><b>Tastatur:</b> R drehen · F spiegeln · Entf löschen · Strg+D kopieren · Strg+Z / Strg+Y · Esc abbrechen · Mausrad zoomen · leere Fläche ziehen = verschieben.</p>
<p><b>Farben:</b> weiß/grau = Alu-Verbund · kupfer = Kupfer · grau = Stahl/Temperguss verzinkt · gelb = Messing · silbern geflochten = Panzerschlauch.</p>
<p>Maßstab: 1 Kästchen = 10 cm. Fittinge sind Symbole und nicht maßstäblich.</p>
<div class="disclaimer">{disc}</div>{legal}<p style="color:#8a94a3;font-size:12px;margin-top:14px">Rohrplaner Prototyp v0.1 · ein kostenloses Werkzeug von Pixel Scallywag · funktioniert offline</p>`,
en: `<ol style="padding-left:20px;line-height:1.55;margin-top:0">
<li><b>Choose medium</b> (top): drinking water cold, hot + cold or heating.</li>
<li><b>Add a part:</b> tap it in the library – if a part is selected, the new part is <b>attached to its free port automatically</b>. Or drag it onto the grid (phone: long press).</li>
<li><b>Choose free port:</b> tap an orange circle on the selected part (turns blue).</li>
<li><b>Pipes:</b> tap a pipe while a fitting is selected = 50 cm pipe attached. Enter the length below or drag the blue end handle. Without selection, draw mode starts.</li>
<li><b>Connections:</b> green = fits, red = does not fit (tap for tip), orange = open end.</li>
<li><b>Rotate</b> cycles the orientation of an attached part while keeping the connection.</li>
<li><b>Parts list</b> shows quantities and pipe lengths – CSV or print/PDF.</li></ol>
<p><b>Keys:</b> R rotate · F mirror · Del delete · Ctrl+D copy · Ctrl+Z / Ctrl+Y · Esc · wheel zoom · drag empty area = pan.</p>
<p>Scale: 1 square = 10 cm. Fittings are symbols, not to scale.</p>
<div class="disclaimer">{disc}</div>{legal}<p style="color:#8a94a3;font-size:12px;margin-top:14px">Rohrplaner prototype v0.1 · a free tool by Pixel Scallywag · works offline</p>`,
};
