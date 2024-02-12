# TODO / Ideen

- besseres required in der webview
- Escapen von Werten: Im Property-File werden Werte wie `!`, `.` oder `\` automatisch escapt. Bei `:` wurde das schon manuell von mir ausgebaut. Wie kann Liquibase damit umgehen?
- tab-reihenfolge bei additional elements anpassen, damit man in die Inputs auch tabben kann: -> RH: Ich habe nur keine Ahnung wie
- webview-ui Ordner anders einbinden? Funktioniert das überhaupt?
- build mit webviews?
- mehr Error handling !
- Tests
- caching von settings
- Ordner, in dem Liquibase-Dateien liegen, auch zum Classpath hinzufügen? Konfigurierbar? Default workspace?
- In Web-IDE funktionsfähig? Wenn nein, dann Extension einschränken!

# Sonstige Notizen

- https://code.visualstudio.com/api/ux-guidelines/overview Einhaltung davon prüfen!

# TODO Abstimmung 30.01.2024

## Changelog-Auwahl: (US #2031837)

Quickpick:

1. Option: Select Changelog -> Öffnet FileChooser für Dateiauswahl
2. Trennlinie
3. Wert aus liquibase.properties (falls vorhanden), vorselektiert
4. Trennlinie
5. Pfade der letzen X hier ausgewählten Changelogs (letzen X === für die gewählte Verbindung)

=> User Story

## Confirmation Dialog (done)

- Drop-All: Mehr Info, was gelöscht werden soll (Datenbank).
- modal machen
- Anstelle Yes/No --> Direkte Option angeben (wie Drop-all)

## VSCODEIGNORE (US #2031843)

- Kann man node_modules ausnehmen? Ausprobiern! Oder Teile davon ausnehmen.
- Oder doch noch mal minifien probieren?
  => Task

## warning dialog bei überschreiben der db url durch generate generic basic ur for selected database type && button für jdbc url komponenten (US #2031845)

## LICSENSE-Angabe

- WG -an-> RL -an-> JB: Rückmeldung noch aussehtend

---

keine Kontexte gefunden -> info, dass nichts gefunden wurde

preview -> passwort als \*\*\* anzeigen

context: -> Recents eines nach oben?

cache/recents => einheitliche benennung -> alles zu recent umbennen?
remove whole cache => invalidate whole cache

in multi step input -> zurückgehen möglich???? untersuchen

oder Kontextakualisierung!
oder irgendwie aktualisierung ermöglichen? Im Promt??? Link oder Button? ---> https://github.com/microsoft/vscode/issues/78335 geht nicht
ähnlich connect to gitlab bei gitkraken

context -> in multi select -> cached dahinterstehen
