# Change Log

All notable changes to the "liquibase" extension will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) and and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- Added a info message on first startup to inform the user about the existence of a walkthrough
- Opened the output channel per default, if a command was executed. Behavior can be changed with the setting `openOutputChannelOnCommandStart`

### Changed

- Disguise the password in the preview of the configuration
- Used loading dialog for the contexts
- Wording improved: changed cache to recently loaded
- Moved logging into extra dependency
- database url can be inputted in parts
- removed "Classpath" from the visual Liquibase configurator
- changed "Additional Elements" to "Advanced properties"
- Upgraded "liquibase-core"-dependency from 4.24.0 to 4.28.0
- changed changelog selection from a folder selection to a cached selection with the recent used changelogs saved
- changed titles and placeholders in various inputs

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
