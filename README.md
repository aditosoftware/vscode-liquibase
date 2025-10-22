[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=aditosoftware_vscode-liquibase&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=aditosoftware_vscode-liquibase)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=aditosoftware_vscode-liquibase&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=aditosoftware_vscode-liquibase)
[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=aditosoftware_vscode-liquibase&metric=ncloc)](https://sonarcloud.io/summary/new_code?id=aditosoftware_vscode-liquibase)

# Liquibase 4 Integration for Visual Studio Code

A Visual Studio Code extension that supports executing [Liquibase commands](https://docs.liquibase.com/commands/command-list.html) without needing to use the command line.
It invokes the official Liquibase command-line tool to run commands; it does not reimplement Liquibase itself.


You can also create and edit [`liquibase.properties`](https://docs.liquibase.com/concepts/connections/creating-config-properties.html) files, which are used as a foundation for any command execution.

## Disclaimer

This extension integrates Liquibase with VS Code.

Liquibase® is a registered trademark of Liquibase, Inc.

This project is not affiliated with or endorsed by Liquibase, Inc.

Liquibase is licensed separately under the Functional Source License (FSL-1.1).

## Getting started

You can also get a brief overview of the extension with our **Walkthrough**.

### Creating a configuration

All commands that execute Liquibase need a [`liquibase.properties`](https://docs.liquibase.com/concepts/connections/creating-config-properties.html) file. This file contains information about your database connection, including user name and password.

You can create a new configuration via the `Liquibase: Create Liquibase Configuration` command.

If you have pre-existing configurations, then you can use the `Liquibase: Add existing liquibase.properties to the configuration...` command to add this configuration to the workspace.

All the created and added configurations will be stored in the folder `data/liquibase`. You can change this folder with the setting `liquibase.configurationPath`.

> **NOTE:** Do not add your configuration files and folder to your version control system. Instead, add them to your `.gitignore`. These files contain **sensitive information**.

You can later edit your configurations with the `Liquibase: Edit existing Liquibase Configuration` command. This command can be reached via the command palette or by opening the context menu in any `.properties` file.

### Executing a command

All commands can be accessed from the "Liquibase" item in the status bar.

![Status bar item of Liquibase Extension](/media/walkthrough/statusBar.png)

You can also access all commands by using the command palette. It can be accessed with the keyboard shortcut <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> (macOS <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>).

If you execute any command, you notice a general pattern of inputs. You will be always asked the following steps in this order:

1. Select the **configuration of your database**. This is needed for Liquibase to know how to access your database. Liquibase can also extract automatically other parameters from it.
2. Select the **changelog**. This is used for knowing what to execute. Not all commands require this option. If you call a command from a context menu, the changelog will be set to the file where you opened the context menu.
3. Select the **contexts**. Some commands allow you to filter the changelogs by contexts. See ["Executing commands with and without contexts"](#executing-commands-with-and-without-contexts) for more details.
4. Any **additional options** you need to give before you can execute the command.

The extension passes the selected options to the Liquibase CLI and executes the corresponding command.

Some commands are accessible from the context menu. The context menu is available for all `xml`, `json`, `yaml`, `yml` and `sql` files, because those are the languages where you can write Liquibase changelogs. All commands are found in the _"Liquibase"_ sub menu. When executing a command from the context menu, it will use the current file as your changelog.

## Supported Liquibase Commands

Currently, the following Liquibase commands are supported via the Liquibase CLI:

> **Tip:** The link on the command itself will lead you to the Liquibase documentation. This will give you a better understanding of the technical details of each command.
>
> The name in brackets is the real name of the command given by Liquibase. This will be used, if the display name is different than the original name.

- [Compare two databases (diff)](https://docs.liquibase.com/commands/inspection/diff.html)
- [Clear the checksums of all changelogs in the database](https://docs.liquibase.com/commands/utility/clear-checksums.html)
- [Create Tag](https://docs.liquibase.com/commands/utility/tag.html)
- [Drop-all](https://docs.liquibase.com/commands/utility/drop-all.html)
- [Generate Changelog](https://docs.liquibase.com/commands/inspection/generate-changelog.html)
- [Generate database documentation (db-doc)](https://docs.liquibase.com/commands/utility/db-doc.html) - [more details below](#generate-database-documentation--getting-an-overview-about-your-database)
- [Generate SQL File for incoming changes](https://docs.liquibase.com/commands/update/update-sql.html)
- [List all deployed changesets (history)](https://docs.liquibase.com/commands/change-tracking/history.html)
- [List the not deployed changesets (status)](https://docs.liquibase.com/commands/change-tracking/status.html)
- [Mark not deployed changelogs as executed (changelog-sync)](https://docs.liquibase.com/commands/utility/changelog-sync.html)
- [Rollback to Tag](https://docs.liquibase.com/commands/rollback/rollback-by-tag.html)
- [Tag Exists](https://docs.liquibase.com/commands/utility/tag-exists.html)
- [Update](https://docs.liquibase.com/commands/update/update.html) - Default Keyboard shortcut: <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>U</kbd> (macOS <kbd>Cmd</kbd> + <kbd>Alt</kbd> + <kbd>U</kbd>)
- [Unexpected Changesets](https://docs.liquibase.com/commands/change-tracking/unexpected-changesets.html)
- [Validate](https://docs.liquibase.com/commands/utility/validate.html)

Every command that needs a changelog file, can be executed by right clicking on or in any changelog file. These commands that are possible to open in a context menu contains _Update_, _Validate_, _Status_ and many more.

### Generate database documentation / Getting an overview about your database

Sometimes, you want to have an overview about your whole database. For this, we have a useful command in the status bar labeled _"Overview"_.

![Status bar item for the overview of Liquibase Extension](/media/walkthrough/statusBarOverview.png)

This will create an HTML report with a lot of useful information regarding your database and the changelogs.

You can see information about the current table structure, including columns and indexes.

Also, you can see the authors of every changeset referenced into the root changelog and any pending changes.

The overview command will be creating some HTML files in your OS temporary directory (e.g. Windows `%LOCALAPPDATA%\temp\liquibase-overview`). You can view the results by opening the `index.html` file in any web browser. The command will also open this file for you automatically once it is finished.

If you want to control the storage location of the overview output, you can use the `Liquibase: Generate database documentation (db-doc)` command. This will produce the same result as the overview item in the status bar.

### Executing commands with and without contexts

Many Liquibase commands can be executed with a context. After a connection and a changelog file was selected, you might be prompted with a context selection. There you have different options:

- **Use any of the recently loaded contexts**: This will give you **all contexts that were recently loaded** by "Load all contexts from the changelog file". You should use this option, if you want to use contexts and these have not changed from any recently loaded contexts. This option is only visible, if cached contexts are there.
- **Load all contexts from the changelog file**: This will **parse and read all changelog files** based on your root changelog file. Anytime you load new contexts, the old ones for this connection will be discarded. This option should be used, if you never have loaded your contexts before or your contexts have changed from any recently loaded context and you want to execute the query with contexts.
- **Do not use any contexts**: This will execute all changesets that **does not have any context** given. Every changeset with a context will be ignored. This option should be used, if you are certain that you don't need any context(s) to execute the command.

Both "Load all contexts from the changelog file" and "Use any of the recently loaded contexts" will not use any contexts for your command, if there is no context selected.

The recently loaded contexts are saved per database connection. That means, if you have three connections, then you have three sections of the contexts. For more information regarding caching, see [the caching section](#caching).

## Converting changelogs from one Liquibase format to another format

With the two commands `Liquibase: Converts a file from one Liquibase format to another` and `Liquibase: Converts a folder from one Liquibase format to another`, you can convert changelogs from one format to another.

> **NOTE:** It is very important, that you check to produced results by the command. We do not guarantee the completeness and correctness of the files.

Restrictions:

- Files with `include` / `includeAll` will not be transformed to the new format, due to the limitations of Liquibase. But all path given in the `file` attribute in the `include` elements will be transformed to a new path, if the old path was transformed as well.

- When transforming to YAML or JSON files with `preConditions` will produce invalid results ([Liquibase Issue #4379](https://github.com/liquibase/liquibase/issues/4379))

## Caching

During the command execution, we will save the following values for every `liquibase.properties` file:

- last loaded contexts from any context command
- the five last selected changelogs

You can see the cache file with the `Liquibase: Cache: Open the file with the recently loaded elements` command.

You can remove any values from the cache with the `Liquibase: Cache: Remove any values from the recently loaded elements` command. A manual editing of the cache is not recommended.

## View logs

This extension writes to the output. It can be viewed by executing the command `Output: Focus on Output View` and then selecting the channel _"Liquibase"_.

Logs will be also written to a log folder on your OS. You can reach the log folder by executing the command `Developer: Open Extension Logs Folder` and then navigating to the folder containing the log files.
