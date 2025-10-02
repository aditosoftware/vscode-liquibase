import { QuickPickItem } from "vscode";
import { ConfirmationDialog, DialogValues, QuickPick, handleMultiStepInput } from "@aditosoftware/vscode-input";
import { Cache, CacheHandler } from "./CacheHandler";
import { readConfiguration } from "../configuration/handle/readConfiguration";
import { Logger } from "@aditosoftware/vscode-logging";
import * as vscode from "vscode";
import { PROPERTY_FILE } from "../input/ConnectionType";
import { RemoveCacheOptions } from "../constants";

/**
 * Class used for removing the whole cache.
 * This will be used to show the user the dialogs for removal. The logic how to remove is in `CacheHandler`.
 */
export class CacheRemover {
  /**
   * The input name for the remove option.
   */
  private static readonly removeOption = "removeOption";

  /**
   * The remove options that are possible in the remove input.
   * The value is the detail message.
   */
  private static readonly removeOptions = new Map<string, string>([
    [RemoveCacheOptions.WHOLE_CACHE, "This will remove the whole file."],
    [
      RemoveCacheOptions.REMOVE_CONNECTION,
      "This will remove everything that is saved as recently loaded values for the selected connections.",
    ],
  ]);

  /**
   * The configuration of the liquibase.properties files the user has saved.
   */
  configuration: Record<string, string> = {};

  /**
   * Constructor.
   *
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

    const result = await handleMultiStepInput("Remove from cache", [
      new QuickPick({
        name: CacheRemover.removeOption,
        placeHolder: "Pick what you want to remove",
        generateItems: this.generateRemoveOptions,
      }),

      new QuickPick({
        name: PROPERTY_FILE,
        placeHolder: "Select any number of connections you want to remove",
        generateItems: () => this.generatePropertiesForCacheRemoval(cache),
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

    if (toRemove?.[0]) {
      this.handleRemoval(toRemove[0], result);
    }
  }

  /**
   * Handles the removal of the selected values after the dialog was executed.
   *
   * @param toRemove - the option what should be removed
   * @param result - the results from the dialog input
   */
  private handleRemoval(toRemove: string, result: DialogValues): void {
    switch (toRemove) {
      case RemoveCacheOptions.WHOLE_CACHE:
        // remove the whole cache
        this.cacheHandler.removeCache();
        break;
      case RemoveCacheOptions.REMOVE_CONNECTION:
        // remove just a few connections
        {
          const propertyFiles = result.inputValues.get(PROPERTY_FILE);

          if (propertyFiles) {
            const connectionsToRemove: string[] = [];

            const configKeys = Object.keys(this.configuration).filter((configKey) => propertyFiles.includes(configKey));
            for (const key of configKeys) {
              connectionsToRemove.push(this.configuration[key]);
            }

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
   * Generates the `QuickPickItems` for the liquibase.properties for cache removal.
   *
   * There will be only items from the configuration available that are also in the cache.
   *
   * @param cache - the cached values
   * @returns the `QuickPickItems` for the liquibase.properties selection
   */
  private async generatePropertiesForCacheRemoval(cache: Cache): Promise<vscode.QuickPickItem[]> {
    const result = await readConfiguration();
    if (result) {
      this.configuration = result ?? {};
    }

    const cacheKeys: string[] = Object.keys(cache);

    return Object.keys(this.configuration)
      .filter((key) => cacheKeys.includes(this.configuration[key]))
      .sort((a, b) => a.localeCompare(b))
      .map((key) => {
        const value = this.configuration[key];
        return {
          label: key,
          detail: value,
        };
      });
  }

  /**
   * Generates a detail message for the cache removal dialog.
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
    if (toRemove?.[0]) {
      // add information about the remove option
      detail = CacheRemover.removeOptions.get(toRemove[0]) ?? "";
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

    if (toRemove?.[0]) {
      return toRemove[0] !== RemoveCacheOptions.WHOLE_CACHE;
    } else {
      return false;
    }
  }

  /**
   * Generates the `QuickPickItems` for the remove options
   *
   * @returns the `QuickPickItems` for the remove option
   */
  private generateRemoveOptions(): QuickPickItem[] {
    const items: QuickPickItem[] = [];

    for (const [key, value] of CacheRemover.removeOptions) {
      items.push({
        label: key,
        detail: value,
      });
    }

    return items;
  }
}
