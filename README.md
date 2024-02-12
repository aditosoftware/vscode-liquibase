# Liquibase

A Visual Studio Code extension that supports executing Liquibase commands without needing to use the command line.

You can also create and edit `liquibase.properties` files, which are used as a foundation for any command execution.

## Executing commands with and without contexts

Many liquibase commands can be executed with a context. After a connection and a changelog file was selected, you might be prompted with a context selection. There you have different options:

- "Do not use any contexts": This will execute all changesets that does not have any context given. Every changeset with a context will be ignored. This option should be used, if you are certain that you don't need want to execute the command with an context.
- "Load all contexts from the changelog file": This will parse and read all changelog files based on your root changelog file. Any mentioned context will be then given in a second dialog. These loaded contexts will be also cached for further querying. Any new caching will remove the old caching. This option should be used, if you never have cached your contexts or your contexts have changed from any cached context and you want to execute the query with contexts.
- "Use any of the cached contexts": These will give you a second dialog where all the cached contexts are loaded. You should use this option, if you want to use contexts and these have not changed from any previous cached contexts. This option will be only visible, if there are cached contexts.

Both "Load all contexts from the changelog file" and "Use any of the cached contexts" will not use any contexts for your command, if there is no context selected.

The cache of the context is saved per database connection. That means, if you have three connections, then you have three section of caches of the context.

You can see the cache file by executing the command `Liquibase: Cache: Opens the cache file for any cached values`.

The cache can be deleted via the `Liquibase: Cache: Removes any values from the cache` command

## View logs

This extensions logs to the output under the name "Liquibase" and an separate log folder.

You can reach the log folder by executing the command `Developer: Open Extension Logs Folder` and then navigating to the liquibase folder.
