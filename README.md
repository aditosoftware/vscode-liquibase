# Liquibase

A Visual Studio Code extension that supports executing Liquibase commands without needing to use the command line.

You can also create and edit `liquibase.properties` files, which are used as a foundation for any command execution.

## Executing commands with and without contexts

Many liquibase commands can be executed with a context. After a connection and a changelog file was selected, you might be prompted with a context selection. There you have different options:

- **Do not use any contexts**: This will execute all changesets that **does not have any context** given. Every changeset with a context will be ignored. This option should be used, if you are certain that you don't need want to execute the command with an context.
- **Load all contexts from the changelog file**: This will **parse and read all changelog files** based on your root changelog file. Anytime you load new contexts, the old ones for this connection will be discarded. This option should be used, if you never have loaded your contexts before or your contexts have changed from any recently loaded context and you want to execute the query with contexts.
- **Use any of the recently loaded contexts**: This will give you **all contexts that were recently loaded** by "Load all contexts from the changelog file". You should use this option, if you want to use contexts and these have not changed from any recently loaded contexts.

Both "Load all contexts from the changelog file" and "Use any of the recently loaded contexts" will not use any contexts for your command, if there is no context selected.

The recently loaded contexts are saved per database connection. That means, if you have three connections, then you have three sections of the contexts.

You can see the file where the recently loaded contexts are stored by executing the command `Liquibase: Cache: Opens the file with the recently loaded elements`.

These elements can be deleted via the `Liquibase: Cache: Removes any values from the recently loaded elements` command.

## Converting changelogs from one liquibase format to another format

With the two commands `Liquibase: Converts a file from one liquibase format to another` and `Liquibase: Converts a folder and its subfolders from one liquibase format to another`, you can convert changelogs from one format to another.

**NOTE:** It is very important, that you check to produced results by the command. We do not guarantee the accuracy of the files.

Restrictions:

- Files with `include` / `includeAll` will not be transformed to the new format, due to the limitations of Liquibase. But all path given in the `file` attribute in the `include` elements will be transformed to a new path, if the old path was transformed as well.

- When transforming to YAML or JSON files with `preConditions` will produce invalid results ([Liquibase Issue #4379](https://github.com/liquibase/liquibase/issues/4379))

## View logs

This extensions logs to the output under the name "Liquibase" and an separate log folder.

You can reach the log folder by executing the command `Developer: Open Extension Logs Folder` and then navigating to the liquibase folder.
