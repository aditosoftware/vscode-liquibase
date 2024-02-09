import { QuickPickItem } from "vscode";
import { ConfirmationDialog, DialogValues, PROPERTY_FILE, QuickPick, handleMultiStepInput } from "../input";
import { Cache, readCache, removeCache, removeConnectionsFromCache } from "./handleCache";
import { readConfiguration } from "../configuration/crud/readConfiguration";
import { Logger } from "../logging/Logger";
import * as vscode from "vscode";

/**
 * The input name for the remove option.
 */
const removeOption = "removeOption";

/**
 * The label for removing the whole cache.
 */
const wholeCache = "Invalidate whole cache";

/**
 * The label for removing only the cache for any number of connections.
 */
const removeConnection = "Remove one or more connections";

/**
 * The remove options that are possible in the remove input.
 * The value is the detail message.
 */
const removeOptions = new Map<string, string>([
  [wholeCache, "This will remove the whole cache file."],
  [removeConnection, "This will remove everything that is cached for the selected connections."],
]);

/**
 * Queries the user what to remove from the cache and removes the selected.
 */
export async function removeFromCache() {
  // first, read the current cache, so we know what we are removing
  const cache = readCache();

  if (Object.keys(cache).length === 0) {
    // if we have no cached values, we do not need to query.
    Logger.getLogger().info("There are no elements in the cache to remove", true);
    return;
  }

  let configuration: Record<string, string> = {};

  const result = await handleMultiStepInput([
    new QuickPick(removeOption, "Pick what you want to remove", generateRemoveOptions),

    new QuickPick(
      PROPERTY_FILE,
      "Select any number of connections you want to remove from the cache",
      async () => {
        configuration = (await readConfiguration()) || {};

        return generatePropertiesForCacheRemoving(cache, configuration);
      },
      true,
      shouldShowPropertyFileSelection
    ),

    new ConfirmationDialog(
      "Are you sure to remove the following from the cache?",
      generateDetailMessageForConfirmation,
      "Delete"
    ),
  ]);

  if (!result) {
    Logger.getLogger().debug("Dialog for deleting cache values cancelled");
    return;
  }

  const toRemove = result.inputValues.get(removeOption);

  if (toRemove && toRemove[0]) {
    handleRemoving(toRemove[0], result, configuration);
  }
}

/**
 * Handles the removing of the selected values after the dialog was executed.
 *
 * @param toRemove - the option what should be removed
 * @param result - the results from the dialog input
 * @param configuration - the configuration of the liquibase.properties files the user has saved
 */
function handleRemoving(toRemove: string, result: DialogValues, configuration: Record<string, string>) {
  switch (toRemove) {
    case wholeCache:
      // remove the whole cache
      removeCache();
      break;
    case removeConnection:
      // remove just a few connections
      {
        const propertyFiles = result.inputValues.get(PROPERTY_FILE);

        if (propertyFiles) {
          const connectionsToRemove: string[] = [];

          Object.keys(configuration)
            .filter((configKey) => propertyFiles.includes(configKey))
            .forEach((key) => connectionsToRemove.push(configuration[key]));

          removeConnectionsFromCache(connectionsToRemove);

          Logger.getLogger().info(`Successfully removed ${propertyFiles.join(", ")} from the cache.`, true);
        }
      }
      break;
    default:
      Logger.getLogger().debug(`Not defined use case ${toRemove}`);
  }
}

/**
 * Generates the `QuickPickItems` for the liquibase.properties for cache removing.
 *
 * There will be only items from the configuration available that are also in the cache.
 *
 * @param cache - the cached values
 * @param configuration - the configuration of the liquibase.properties files the user has saved
 * @returns the `QuickPickItems` for the liquibase.properties selection
 */
function generatePropertiesForCacheRemoving(
  cache: Cache,
  configuration: Record<string, string>
): vscode.QuickPickItem[] {
  const cacheKeys: string[] = Object.keys(cache);

  return Object.keys(configuration)
    .filter((key) => cacheKeys.includes(configuration[key]))
    .sort()
    .map((key) => {
      const value = configuration[key];
      return {
        label: key,
        detail: value,
      };
    });
}

/**
 * Generates a detail message for the cache removing dialog.
 *
 * This message will have information about the remove option and - if available - about the selected property files.
 *
 * @param dialogValues - the current dialog values
 * @returns the detail message
 */
function generateDetailMessageForConfirmation(dialogValues: DialogValues): string {
  const toRemove = dialogValues.inputValues.get(removeOption);

  const propertyFiles = dialogValues.inputValues.get(PROPERTY_FILE);

  // Build the details
  let detail = "";
  if (toRemove && toRemove[0]) {
    // add information about the remove option
    detail = removeOptions.get(toRemove[0]) || "";
  }

  if (propertyFiles) {
    // if there are any property files, add them as a list
    const s = "\n - ";
    detail += `${s}${propertyFiles.join(s)}`;
  }

  return detail;
}

/**
 * Checks if property selection is needed for the current remove option.
 *
 * @param currentResults - the current dialog results
 * @returns true, if there is a remove option selected that needs property selection
 */
function shouldShowPropertyFileSelection(currentResults: DialogValues): boolean {
  const toRemove = currentResults.inputValues.get(removeOption);

  if (toRemove && toRemove[0]) {
    return toRemove[0] !== wholeCache;
  } else {
    return false;
  }
}

/**
 * Generates the `QuickPickItems` for the remove options
 * @returns the `QuickPickItems` for the remove option
 */
function generateRemoveOptions(): QuickPickItem[] {
  const items: QuickPickItem[] = [];

  removeOptions.forEach((value, key) => {
    items.push({
      label: key,
      detail: value,
    });
  });

  return items;
}
