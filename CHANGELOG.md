# Change Log

All notable changes to the "liquibase" extension will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) and and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Better support when changelogs without any contexts are loaded and cached
- Loading dialog for any long loading processes
- Indicator in the context dialog where the context was loaded from

### Changed

- Disguise the password in the preview of the configuration
- Used loading dialog for the contexts

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
