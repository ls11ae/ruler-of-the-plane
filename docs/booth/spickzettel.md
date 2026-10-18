# Spickzettel: Stand „Ruler of the Plane“

Tag der offenen Tür, Samstag 7. November 2026 · Lehrstuhl 11 · Algorithm Engineering · TU Dortmund

## Starten und beenden

- **Starten:** im Ordner `Stand` (auf dem Desktop) **Start-Stand.cmd** doppelklicken. Chrome öffnet die
  Spiele im Kiosk-Modus (Vollbild, keine Adressleiste). Das schwarze Fenster **„Ruler of the Plane –
  Stand“** offen lassen: Es hält den Laptop wach und öffnet den Browser wieder, wenn ihn jemand schließt.
- **Beenden:** Windows-Taste (oder Alt+Tab) → **Stop-Stand.cmd** doppelklicken. Browser und Server gehen
  aus, Bildschirm- und Energiespar-Einstellungen werden zurückgestellt.
- **Firefox statt Chrome:** Stop-Stand.cmd, dann **Start-Stand-Firefox.cmd**.
- Alles läuft **ohne Internet**, von `http://localhost:8137/ruler-of-the-plane/?kiosk`.

## Kiosk-Modus

- Das **Startbild** spielt eine Demo; Klick, Tippen oder eine Taste öffnet die Karte.
- **Nach 90 s ohne Eingabe** zurück zum Startbild: Sprache wieder Deutsch, Spielstand zurückgesetzt.
- Niemand kommt aus der App heraus: „Alte Ruinen“ und „Impressum · Datenschutz“ zeigen nur Adressen und
  QR-Codes; die „Rundreise“ (TSP-Spiel) läuft in einem Rahmen, „‹ Karte“ führt zurück.

## Personalmenü

- **Strg+Umschalt+S**, oder den **Kompass** oben links auf der Karte **3 s gedrückt halten**; dann die
  **PIN (PIN von Kevin)**.
- Spiele an/aus („Heute geschlossen“), Schwierigkeit, Kiosk-Modus, Bestenlisten löschen, „Mensch gegen
  Maschine“ auf 0 : 0, Startbild zeigen, Tastentest; unten die Version.

## Tastentest

Personalmenü → **Tastentest**: Jede gehaltene Taste leuchtet. Zusammen halten: **A + L** („Gassi gehen“
zu zweit) und **W A S D + Pfeiltasten** („Rasenmähen“ zu zweit). Was die Tastatur nicht zusammen
erkennt, an diesem Laptop nur allein spielen lassen.

## Wenn etwas hängt

1. **Ein Spiel hängt:** „‹ Karte“, oder 90 s warten. **F5** lädt neu (Bestenlisten bleiben).
2. **Alles zu groß oder zu klein:** **Strg+0**.
3. **Browser weg oder „localhost nicht erreichbar“:** Ist das Stand-Fenster noch offen? Sonst
   Stop-Stand.cmd, dann Start-Stand.cmd.
4. **Gar nichts geht:** Stop-Stand.cmd, Laptop neu starten, Start-Stand.cmd – oder den Ersatz-Laptop.
5. Für später: Protokolle `start.log` und `server.log` in `%LOCALAPPDATA%\RulerOfThePlane`.

## Notlösungen

- **Alte Version** (Unity, braucht Internet): `kbuchin.github.io/ruler` in einem normalen Browserfenster.
- **Online-Version** für die Handys der Besucher: `ls11ae.github.io/ruler-of-the-plane` (QR-Code auf dem
  Druckmaterial von tsp-boards).

## Wo liegt was

- **Stand-Paket:** GitHub → `ls11ae/ruler-of-the-plane` → Releases → das neueste `phase-7…` (`phase-7`,
  `phase-7.1`, …) → `Stand-<Tag>.zip` (am besten auch auf einem USB-Stick). Rechtsklick → „Alle
  extrahieren“, Ordner auf den Desktop.
- **Bestenlisten und Einstellungen** liegen pro Laptop und Browser in `%LOCALAPPDATA%\RulerOfThePlane`;
  sie überstehen einen Neustart und zählen nur für heute.
