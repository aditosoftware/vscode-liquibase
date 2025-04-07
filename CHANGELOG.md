# Change Log

All notable changes to the "Liquibase" extension will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) and and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.1.1

### Added

- Added update mechanism to cache when contexts are loaded and point to the same changelog so every property file is updated and does not have to be loaded for each file

## 1.1.0

### Changed

- Removed input validation to allow empty tablename to generate changelogs for all available tables

## 1.0.2

### Added

- Added repository information to the package.json
- Added images to README.md

### Changed

- Upgraded dependencies:
  - @aditosoftware/driver-dependencies to 1.0.4
  - @aditosoftware/vscode-input to 2.0.1
  - @aditosoftware/vscode-logging to 1.0.3
  - immer to 10.1.1
  - properties-file to 3.5.7
- Upgraded devDependencies:
  - @types/chai to 4.3.19
  - @types/mocha to 10.0.8
  - @vscode/test-cli to 0.0.10
  - @vscode/test-electron to 2.4.1
  - concurrently to 9.0.1
  - mariadb to 3.3.1
  - rimraf to 6.0.1
  - sinon to 19.0.2
  - vscode-extension-tester to 8.7.0
  - webpack to 5.94.0
  - webpack-shell-plugin-next to 2.3.2"

## 1.0.1

### Changed

- Changed the labels of a few OpenDialog buttons
- Improved extension icon so that it also looks good in dark themes

## 1.0.0

### Added

- Better support when changelogs without any contexts are loaded and cached
- Loading dialog for any long loading processes
- Indicator in the context dialog where the context was loaded from
- Reload option for all loading dialogs
- Setting to clear the output "clearOutputChannelOnStart" was added
- Added execution time for commands
- Added a "help"-button to the "Advanced properties" inside the visual Liquibase configurator
- Added diff-types and include-objects filter to generate-changelog command
- Added a command to convert a file or a folder from one liquibase format to another format
- Added a status bar item to execute all liquibase commands
- Added an overview action in the status bar to create the db-doc of the database
- Opened the output channel per default, if a command was executed. Behavior can be changed with the setting `openOutputChannelOnCommandStart`
- Added the selection of the contexts to the cache
- Better output when conversion of files with include/includeAll is attempted

### Changed

- Disguise the password in the preview of the configuration
- Used loading dialog for the contexts
- Wording improved: changed cache to recently loaded
- Moved logging into extra dependency
- Database url can be inputted in parts
- Removed "Classpath" from the visual Liquibase configurator
- Changed "Additional Elements" to "Advanced properties"
- Upgraded "liquibase-core"-dependency from 4.24.0 to 4.28.0
- Changed changelog selection from a folder selection to a cached selection with the recent used changelogs saved
- Changed titles and placeholders in various inputs
- Changed the order of the cache selection: "Use any of the recently loaded contexts" is now the top-most item, and "Do not use any contexts" is now the last item
- Improved the names of the commands `liquibase.history`, `liquibase.diff`, `liquibase.status`, `liquibase.changelog-sync` and `liquibase.clear-checksums` to be more user-friendly
- Changed order of the `Drivers...` menu to have add, delete and edit custom drivers on the top of the menu
- When logging during the command execution, the logs written to the output channel will be written without any timestamp or level
- Improved position of a few elements in the configuration

### Fixed

- Fixed a typo in the settings
- Removed a false second changelog selection at the generate changelog command
- Parameters for changelogPath and searchPath were alternated to be based off of the opened workspace
- "Advanced properties" now only allows key that are not included in the visual Liquibase configurator

## 0.0.4

### Added

- Caching of contexts
- Liquibase context menu is available for SQL

### Changed

- Contexts are now detected from every changelog, not just the root changelog

### Fixed

- No selected context will now result in only executing changesets without context

## 0.0.3

### Added

- Support of YAML changelog files
- User selection for changelog file, if none is given in the liquibase.properties file

### Changed

- Creation of liquibase.properties files highlights better the required fields
- Better highlighting of the confirmation dialogs

## 0.0.2

### Added

- Logging for any messages to the output and log file
- Walkthrough for better understanding how to use the extension
- Liquibase context menu in files and the explorer for file types json, xml and yaml

### Changed

- Downloading jars now to the global storage to not have version depending paths
- diff command has now more options and is now writing in a file, not just output
- db-doc output corrected location of some links in the html files

## 0.0.1

### Added

- Support for the following liquibase commands:
  - changelog-sync
  - clear-checksums
  - db-doc
  - diff
  - drop-all
  - generate-changelog
  - history
  - rollback
  - status
  - tag
  - tag-exists
  - unexpected-changesets
  - update
  - update-sql
  - validate
- Creation and storing of liquibase.properties files
- Downloading of necessary jars for drivers and liquibase execution
