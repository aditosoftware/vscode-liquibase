import { removeConnectionsFromCache } from "../cache/handleCache";
import { updateConfiguration } from "../configuration/crud/readConfiguration";
import { ConfirmationDialog, DialogValues, QuickPick, handleMultiStepInput } from "@aditosoftware/vscode-input";
import { Logger } from "@aditosoftware/vscode-logging";
import * as fs from "fs";
import { ConnectionType, PROPERTY_FILE } from "../input/ConnectionType";

/**
 * The option to remove the cache.
 */
const cache = "Remove recently loaded elements";

/**
 * The option to remove the setting entry.
 */
const setting = "Remove configuration from settings";

/**
 * The option to remove everything.
 */
const deleteAll = "Delete configuration";

/**
 * Information what will be deleted when choosing each option.
 */
const whatDeleted = new Map<string, string[]>([
  [cache, [cache]],
  [setting, [cache, setting]],
  [deleteAll, [cache, setting, deleteAll]],
]);

/**
 * The name of the QuickPick for picking the remove type.
 */
const removeType = "removeType";

/**
 * Removes an existing configuration from the setting configuration file.
 *
 * This will show dialogs for the user what to remove and then handle the removing.
 *
 */
export function removeConfiguration() {
  const inputs = [
    new ConnectionType({ name: "propertyFile" }),
    new QuickPick({
      name: removeType,
      title: "Choose how you wish to remove the configuration",
      generateItems: () => {
        return [
          {
            label: cache,
            detail: "Configuration file and setting will still exist.",
          },
          {
            label: setting,
            detail: "Configuration file will still exist, but the recently loaded elements will be also deleted.",
          },
          {
            label: deleteAll,
          },
        ];
      },
    }),
    new ConfirmationDialog({
      name: "confirmation",
      message: "Are you sure you want to delete your configuration?",
      detail: generateDetailMessageForDeleteConfiguration,
      confirmButtonName: "Delete",
    }),
  ];

  handleMultiStepInput(inputs)
    .then((dialogResult) => {
      if (dialogResult) {
        handleDialogResults(dialogResult);
      }
    })
    .catch((error) => {
      Logger.getLogger().error({ message: "error handling multi step input", error });
    });
}

/**
 * Handles the dialog results. This will delete depending on the mode the desired elements.
 * @param dialogResult - the results of the dialogs
 */
function handleDialogResults(dialogResult: DialogValues): void {
  const path = dialogResult.inputValues.get(PROPERTY_FILE)?.[0];
  const deletionMode = dialogResult.inputValues.get(removeType);

  if (path && deletionMode) {
    updateConfiguration(deleteConfig(path, deletionMode))
      .then((success) => {
        if (success) {
          Logger.getLogger().info({
            message: `Configuration was successfully removed with the option "${deletionMode}".`,
            notifyUser: true,
          });
        } else {
          Logger.getLogger().error({
            message: `Error while removing the configuration with the option "${deletionMode}".`,
            notifyUser: true,
          });
        }
      })
      .catch((error) => {
        Logger.getLogger().error({ message: "Error removing connection", error, notifyUser: true });
      });
  }
}

/**
 * Deletes the values from the configuration.
 * @param path - the path of the configuration
 * @param deletionMode - the modes what should be deleted. This was selected by the user.
 * @returns a function that has as parameter the jsonData from the setting and removes async the values from it.
 */
function deleteConfig(path: string, deletionMode: string[]): (pJsonData: Record<string, string>) => Promise<void> {
  return async (pJsonData) => {
    // find out the key from the setting for the given path
    const foundKey = Object.keys(pJsonData).find((pKey) => {
      return pJsonData[pKey] === path;
    });

    // get all information about what to delete
    const deleteOptions = whatDeleted.get(deletionMode[0]);

    if (foundKey && deleteOptions) {
      if (deleteOptions.includes(cache)) {
        // remove the cache
        removeConnectionsFromCache([path]);
      }
      if (deleteOptions.includes(setting)) {
        // remove the setting
        delete pJsonData[foundKey];
      }
      if (deleteOptions.includes(deleteAll)) {
        // remove the configuration file
        fs.rmSync(path);
      }
    }
  };
}

/**
 * Generates a detail message for the deletion of the contexts.
 * @param dialogValues - the current dialog values
 * @returns detail message what will be deleted
 */
function generateDetailMessageForDeleteConfiguration(dialogValues: DialogValues): string {
  const deletionMode = dialogValues.inputValues.get(removeType)?.[0];

  let deletedDetail: string = "";
  if (deletionMode) {
    deletedDetail =
      whatDeleted
        .get(deletionMode)
        ?.map((pElement) => "- " + pElement)
        .join("\n") || "";
  }

  return `This will remove the configuration from the following:\n${deletedDetail}`;
}
