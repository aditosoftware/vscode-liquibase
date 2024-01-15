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

# Sonstige Notizen

- https://code.visualstudio.com/api/ux-guidelines/overview Einhaltung davon prüfen!

# FIXME Wichtig

- Disclaimer bezüglich Liquibase


# Für README

## liquibase for Visual Studio Code.

A Visual Studio Code extension that supports executing Liquibase Scripts.

You can also create and edit `liquibase.properties` files.

## Contribution points

- `liquibase.configurationPath`: Relative path inside the workspace where liquibase configuration should be stored. **Important**: This folder should not be included in your version control system. The default value is `data/liquibase`.
- `liquibase.liquibaseFolder`: Relative path inside the workspace, where your liquibase changelog files are located.This location will be added the the classpath of newly generated files. If there is no path given, then the project itself will be added to classpath.
- `liquibase.driverLocation`: The location where this extension should download all the drivers and necessary jar files. On Windows, backslashes must be escaped, e.g. `C:\\dev\\myDrivers`. If no configuration is given, then `.drivers` inside the workspace will be used.
- `liquibase.defaultDatabaseForConfiguration`: The default selected database for creating a new liquibase configuration. By default, no pre-configured database will be selected.