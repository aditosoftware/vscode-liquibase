import { QuickPickItem } from "vscode";
import { ConfirmationDialog, DialogValues, QuickPick, handleMultiStepInput } from "@aditosoftware/vscode-input";
import { Cache, CacheHandler } from "./CacheHandler";
import { readConfiguration } from "../configuration/crud/readConfiguration";
import { Logger } from "@aditosoftware/vscode-logging";
import * as vscode from "vscode";
import { PROPERTY_FILE } from "../input/ConnectionType";

/**
 * Class used for removing the whole cache.
 * This will be used to show the user the dialogs for removing. The logic how to remove is in `CacheHandler`.
 */
export class CacheRemover {
  /**
   * The input name for the remove option.
   */
  private static readonly removeOption = "removeOption";

  /**
   * The label for removing the whole cache.
   */
  private static readonly wholeCache = "Invalidate every recently loaded value";

  /**
   * The label for removing only the cache for any number of connections.
   */
  private static readonly removeConnection = "Remove one or more connections";

  /**
   * The remove options that are possible in the remove input.
   * The value is the detail message.
   */
  private static readonly removeOptions = new Map<string, string>([
    [CacheRemover.wholeCache, "This will remove the whole file."],
    [
      CacheRemover.removeConnection,
      "This will remove everything that is saved as recently loaded values for the selected connections.",
    ],
  ]);

  /**
   * The configuration of the liquibase.properties files the user has saved.
   */
  configuration: Record<string, string> = {};

  /**
   * Constructor.
   * @param cacheHandler - the cache handler
   */
  constructor(private readonly cacheHandler: CacheHandler) {}

  /**
   * Queries the user what to remove from the cache and removes the selected.
   */
  async removeFromCache(): Promise<void> {
    // first, read the current cache, so we know what we are removing
    const cache = this.cacheHandler.readCache();

    if (Object.keys(cache).length === 0) {
      // if we have no cached values, we do not need to query.
      Logger.getLogger().info({ message: "There are no elements stored to remove", notifyUser: true });
      return;
    }

    const result = await handleMultiStepInput([
      new QuickPick({
        name: CacheRemover.removeOption,
        title: "Pick what you want to remove",
        generateItems: this.generateRemoveOptions,
      }),

      new QuickPick({
        name: PROPERTY_FILE,
        title: "Select any number of connections you want to remove from the recently loaded elements",
        generateItems: () => this.generatePropertiesForCacheRemoving(cache),
        allowMultiple: true,
        onBeforeInput: this.shouldShowPropertyFileSelection,
      }),

      new ConfirmationDialog({
        name: "Confirmation",
        message: "Are you sure to remove the following from the recently loaded elements?",
        detail: this.generateDetailMessageForConfirmation,
        confirmButtonName: "Delete",
      }),
    ]);

    if (!result) {
      Logger.getLogger().debug({ message: "Dialog for deleting recently loaded values cancelled" });
      return;
    }

    const toRemove = result.inputValues.get(CacheRemover.removeOption);

    if (toRemove && toRemove[0]) {
      this.handleRemoving(toRemove[0], result);
    }
  }

  /**
   * Handles the removing of the selected values after the dialog was executed.
   *
   * @param toRemove - the option what should be removed
   * @param result - the results from the dialog input
   */
  private handleRemoving(toRemove: string, result: DialogValues): void {
    switch (toRemove) {
      case CacheRemover.wholeCache:
        // remove the whole cache
        this.cacheHandler.removeCache();
        break;
      case CacheRemover.removeConnection:
        // remove just a few connections
        {
          const propertyFiles = result.inputValues.get(PROPERTY_FILE);

          if (propertyFiles) {
            const connectionsToRemove: string[] = [];

            Object.keys(this.configuration)
              .filter((configKey) => propertyFiles.includes(configKey))
              .forEach((key) => connectionsToRemove.push(this.configuration[key]));

            this.cacheHandler.removeConnectionsFromCache(connectionsToRemove);

            Logger.getLogger().info({
              message: `Successfully removed ${propertyFiles.join(", ")} from the recently loaded elements.`,
              notifyUser: true,
            });
          }
        }
        break;
      default:
        Logger.getLogger().debug({ message: `Not defined use case ${toRemove}` });
    }
  }

  /**
   * Generates the `QuickPickItems` for the liquibase.properties for cache removing.
   *
   * There will be only items from the configuration available that are also in the cache.
   *
   * @param cache - the cached values
   * @returns the `QuickPickItems` for the liquibase.properties selection
   */
  private generatePropertiesForCacheRemoving(cache: Cache): vscode.QuickPickItem[] {
    readConfiguration().then((result) => {
      this.configuration = result ?? {};
    });

    const cacheKeys: string[] = Object.keys(cache);

    return Object.keys(this.configuration)
      .filter((key) => cacheKeys.includes(this.configuration[key]))
      .sort()
      .map((key) => {
        const value = this.configuration[key];
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
  private generateDetailMessageForConfirmation(dialogValues: DialogValues): string {
    const toRemove = dialogValues.inputValues.get(CacheRemover.removeOption);

    const propertyFiles = dialogValues.inputValues.get(PROPERTY_FILE);

    // Build the details
    let detail = "";
    if (toRemove && toRemove[0]) {
      // add information about the remove option
      detail = CacheRemover.removeOptions.get(toRemove[0]) || "";
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
  private shouldShowPropertyFileSelection(currentResults: DialogValues): boolean {
    const toRemove = currentResults.inputValues.get(CacheRemover.removeOption);

    if (toRemove && toRemove[0]) {
      return toRemove[0] !== CacheRemover.wholeCache;
    } else {
      return false;
    }
  }

  /**
   * Generates the `QuickPickItems` for the remove options
   * @returns the `QuickPickItems` for the remove option
   */
  private generateRemoveOptions(): QuickPickItem[] {
    const items: QuickPickItem[] = [];

    CacheRemover.removeOptions.forEach((value, key) => {
      items.push({
        label: key,
        detail: value,
      });
    });

    return items;
  }
}