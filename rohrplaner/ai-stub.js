/* Rohrplaner – KI-Vorschlag (PLATZHALTER, standardmäßig AUS)
   ---------------------------------------------------------------
   TODO: Hier könnte später eine kostenlose LLM-Schnittstelle angebunden werden,
   die aus einer Beschreibung ("Waschmaschine an ½″-Wandscheibe") einen Teile-Vorschlag
   im Projektformat (items[] mit pid/x/y/rot bzw. Rohren a/b) erzeugt.
   WICHTIG: Keine API-Schlüssel in den Code schreiben! Ein Schlüssel gehört, wenn überhaupt,
   in einen eigenen kleinen Server/Proxy – nie in eine öffentliche statische Seite.
   Aktuell: gibt immer einen abgelehnten Promise zurück, die App zeigt dann einen Hinweis. */
window.RP_AI = {
  enabled: false,
  suggest(/* text, project */) {
    return Promise.reject(new Error('not implemented'));
  },
};
