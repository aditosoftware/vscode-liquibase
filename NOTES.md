# TODO / Ideen

- pre-requisties: User X Driver geben und nicht mehr manuell downloaden
- besseres required in der webview
- Escapen von Werten: Im Property-File werden Werte wie `!`, `.` oder `\` automatisch escapt. Bei `:` wurde das schon manuell von mir ausgebaut. Wie kann Liquibase damit umgehen?
- tab-reihenfolge bei additional elements anpassen, damit man in die Inputs auch tabben kann: -> RH: Ich habe nur keine Ahnung wie
- webview-ui Ordner anders einbinden? Funktioniert das überhaupt?
- build mit webviews?
- walktrough?
- mehr Error handling !
- Tests
- caching von settings
- Ordner, in dem Liquibase-Dateien liegen, auch zum Classpath hinzufügen? Konfigurierbar? Default workspace?
- In Web-IDE funktionsfähig? Wenn nein, dann Extension einschränken!
- unnötige Readme.md in Unterordner löschen
- db-doc --> Tabelle auswählen -> Column auswählen -> zuzeit ungültige Datei -> Vor Dateiöffnung Ordner noch passend verschieben!

# Sonstige Notizen

- https://code.visualstudio.com/api/ux-guidelines/overview Einhaltung davon prüfen!

# FIXME Wichtig

- Disclaimer bezüglich Liquibase
- License
- Publisher
- Bundeling von Files ?

- Pipeline anpassen, sodass Extensions zumindest gebaut werden über

```shell
npm install -g @vscode/vsce
vsce package --pre-release --skip-license
```

https://code.visualstudio.com/api/working-with-extensions/publishing-extension

# Ideen

- dialoge modal machen, damit sind diese im Vordergrund

```typescript
vscode.window.showInformationMessage(
            "message,
            {
              detail: "detail"
              modal: true,
            },
            "a",
            "b"
          );
```

- output per setting defaultmäßig anzeigen lassen?

---

---

# TODO

- Alle DBs testen (Treiber über IDBTypes vergleiche)
- Macht drop-all auf Kontext Sinn?
- Weitere commands auf Context-Menü-Actions?

# Feedback

## SK

- (done) Create Liquibase Configuration: Bei Auswahl des Datenbanktypes einen Teil der jdbc-Url vorausfüllen? (`jdbc:mariadb://`)
