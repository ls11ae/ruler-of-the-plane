# Checkliste: erster Test auf den Stand-Laptops

Abnahme von Phase 7: **Das Release läuft auf jedem Stand-Laptop und dem Ersatz-Laptop offline nach einem
Kaltstart.** Eine Liste pro Laptop; was nicht klappt, unten notieren (mit Uhrzeit, Foto vom Bildschirm,
und `start.log`/`server.log` aus `%LOCALAPPDATA%\RulerOfThePlane`).

Laptop: ____________________ Windows-Version: ____________ Chrome: ________ Firefox: ________

## 1. Vorbereitung (einmal pro Laptop)

- [ ] Windows-Updates installiert, neu gestartet; in Windows Update keine ausstehenden Neustarts.
- [ ] Updates bis nach dem 7. 11. aussetzen (Einstellungen → Windows Update → „Updates aussetzen“), falls
      erlaubt; sonst Nutzungszeit auf 7–22 Uhr.
- [ ] Chrome und Firefox installiert und aktuell (danach keine Browser-Updates mehr nötig).
- [ ] Datum, Uhrzeit und Zeitzone stimmen (die Bestenlisten gelten pro Tag).
- [ ] Benachrichtigungen aus („Nicht stören“), Ton leise oder aus.
- [ ] Maus angeschlossen; Touchpad: „Touchpad eingeschaltet lassen, wenn eine Maus angeschlossen ist“
      aus, oder Gesten mit drei und vier Fingern aus (Einstellungen → Bluetooth und Geräte → Touchpad).
- [ ] Zuklappen des Deckels bei Netzbetrieb: „Nichts unternehmen“ (oder den Deckel offen lassen).
- [ ] Stand-Paket aus dem Release `phase-6` geladen (am Stand dann das neueste `phase-7…`); ZIP:
      Rechtsklick → Eigenschaften → „Zulassen“, dann „Alle extrahieren“; Ordner `Stand` auf den Desktop.
      `VERSION.txt` notiert: ____________________

## 2. Kaltstart ohne Internet (die Abnahme)

- [ ] WLAN aus bzw. Flugmodus an, kein Netzwerkkabel. Laptop ganz herunterfahren und neu starten.
- [ ] `Start-Stand.cmd`: Das Stand-Fenster meldet „Paket vollständig“, „Server“, „Bildschirm bleibt an“
      und den Browser; keine roten Zeilen. Gelbe Hinweise notieren und, wo möglich, von Hand einstellen.
- [ ] Chrome zeigt nach höchstens 10 s das Startbild im Kiosk-Modus, ohne Leiste oder Hinweisfenster
      (Willkommen, Standardbrowser, Übersetzen, „Seiten wiederherstellen“).
- [ ] Jeder der fünf Orte öffnet sein Spiel, „So geht's“ erscheint; je ein Level angespielt.
- [ ] „Rundreise“: das TSP-Spiel erscheint im Rahmen, ein Rätsel startet und rechnet; „‹ Karte“ zurück.
- [ ] „Alte Ruinen“ zeigt nur die Adresse; „Impressum · Datenschutz“ zeigt drei QR-Codes; ein QR-Code
      lässt sich mit einem Handy lesen.
- [ ] „Mitwirkende“ → „Alle Dateien und Lizenztexte“ lädt den Text.
- [ ] Personalmenü (Strg+Umschalt+S oder Kompass 3 s) fragt die PIN; die Version unten passt zu
      `VERSION.txt`.
- [ ] 90 s nichts tun: zurück zum Startbild, Sprache Deutsch.
- [ ] Mit `Start-Stand-Firefox.cmd` (nach `Stop-Stand.cmd`) dasselbe kurz mit Firefox.

## 3. Tastatur

- [ ] Personalmenü → Tastentest: alle 9 Paare unter „Spieltasten zusammen erkannt“ grün: **A + L** und
      **W A S D** jeweils mit den Pfeiltasten (W+↑, S+↓, A+←, D+→, W+↓, S+↑, A+→, D+←).
- [ ] „Gassi gehen“ zu zweit mit A und L gespielt; „Rasenmähen“ zu zweit mit WASD und Pfeiltasten.
- [ ] Meiste gleichzeitig gehaltene Tasten: ______

## 4. Maus und Touchpad

- [ ] „Licht ins Verlies“: Fackel setzen (Klick), ziehen, aus dem Verlies ziehen (weg).
- [ ] „Erobere das Land“: Vorschau unter der Maus, Klick setzt eine Burg.
- [ ] „Straßenbau“: Straße ziehen, Straße anklicken (abreißen).
- [ ] Wischen mit zwei Fingern auf dem Touchpad blättert nicht zurück; Zusammenziehen zoomt nicht.
- [ ] Strg+Mausrad: notieren, ob es zoomt (Strg+0 stellt zurück): ______

## 5. Messen

- [ ] „Erobere das Land“ gegen „Schwer“ mit 10 Burgen, Theorie öffnen: Rechenzeit des Computerzugs unter
      200 ms (die ersten Züge sind die langsamsten): ______ ms

## 6. Robust bleiben

- [ ] Alt+F4 im Browser: Nach etwa 5 s ist er wieder da.
- [ ] F5 in einem Spiel: lädt neu, Bestenlisten bleiben.
- [ ] Stand-Fenster mit × geschlossen: `Stop-Stand.cmd` räumt trotzdem auf, `Start-Stand.cmd` startet
      wieder.
- [ ] Vorher und nachher in Einstellungen → System → Bildschirm und Energie nachgesehen: Nach
      `Stop-Stand.cmd` stehen die alten Zeiten wieder da.

## 7. Zwei Stunden allein (am Netzteil)

- [ ] `Start-Stand.cmd`, Startbild laufen lassen, **2 Stunden** nichts anfassen. Start: ______ Ende: ______
- [ ] Bildschirm blieb an, kein Sperrbildschirm, kein Bildschirmschoner, kein Neustart, keine
      Meldung über dem Spiel.
- [ ] Die Demo läuft noch (Burgen kommen dazu); danach jedes Spiel einmal geöffnet, alles flüssig.
- [ ] Task-Manager: Arbeitsspeicher von Chrome am Anfang ______ MB, nach 2 h ______ MB.
- [ ] 30 Minuten im Akkubetrieb: kein Energiesparmodus; Akkustand nach 30 min: ______ %

## 8. Ersatz-Laptop

- [ ] Abschnitte 1, 2 und 3 auch auf dem Ersatz-Laptop.

## Notizen

&nbsp;

&nbsp;

&nbsp;
