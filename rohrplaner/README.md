# Rohrplaner (Prototyp v0.1)

Kostenlose Web-App: Rohre und Fittinge bis 1″ für Heizung und Trinkwasser zusammenstecken, Teileliste erzeugen.
Reine statische Seite (HTML/JS/CSS), kein Server, kein Build-Schritt, offline nutzbar (PWA).

## Dateien
- `index.html`, `styles.css`, `app.js` – App
- `parts.js` – **Teilebibliothek** (hier neue Teile ergänzen, Format oben in der Datei erklärt)
- `examples.js` – Beispielprojekte, `i18n.js` / `info.js` – Texte DE/EN
- `ai-stub.js` – Platzhalter für späteren KI-Vorschlag (aus, ohne API-Schlüssel)
- `sw.js`, `manifest.webmanifest`, `icons/` – Offline/Installieren

## Veröffentlichen
- **Netlify Drop:** https://app.netlify.com/drop öffnen und den Ordner (oder die ZIP entpackt) hineinziehen.
- **GitHub Pages:** Dateien in ein Repo (oder Unterordner von apodis23.github.io) legen → Settings → Pages.
Lokal testen: `python3 -m http.server` im Ordner, dann http://localhost:8000 (Service Worker braucht http/https).
