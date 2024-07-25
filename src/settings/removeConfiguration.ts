import { updateConfiguration } from "../configuration/handle/readConfiguration";
import { ConfirmationDialog, DialogValues, QuickPick, handleMultiStepInput } from "@aditosoftware/vscode-input";
import { Logger } from "@aditosoftware/vscode-logging";
import * as fs from "fs";
import { ConnectionType, PROPERTY_FILE } from "../input/ConnectionType";
import { cacheHandler } from "../extension";
import { RemoveConfigurationOptions } from "../constants";

/**
 * Information what will be deleted when choosing each option.
 */
const whatDeleted = new Map<string, string[]>([
  [RemoveConfigurationOptions.CACHE, [RemoveConfigurationOptions.CACHE]],
  [RemoveConfigurationOptions.SETTING, [RemoveConfigurationOptions.CACHE, RemoveConfigurationOptions.SETTING]],
  [
    RemoveConfigurationOptions.DELETE_ALL,
    [RemoveConfigurationOptions.CACHE, RemoveConfigurationOptions.SETTING, RemoveConfigurationOptions.DELETE_ALL],
  ],
]);

/**
 * The name of the QuickPick for picking the remove type.
 */
export const removeType = "removeType";

/**
 * Removes an existing configuration from the setting configuration file.
 *
 * This will show dialogs for the user what to remove and then handle the removing.
 *
 */
export async function removeConfiguration(): Promise<void> {
  const inputs = [
    new ConnectionType({ name: "propertyFile" }),
    new QuickPick({
      name: removeType,
      placeHolder: "Choose what you want to remove",
      generateItems: () => {
        return [
          {
            label: RemoveConfigurationOptions.CACHE,
            detail: "Configuration file and setting will still exist.",
          },
          {
            label: RemoveConfigurationOptions.SETTING,
            detail: "Configuration file will still exist, but the recently loaded elements will be also deleted.",
          },
          {
            label: RemoveConfigurationOptions.DELETE_ALL,
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

  try {
    const dialogResult = await handleMultiStepInput("Remove existing configuration", inputs);
    if (dialogResult) {
      await handleDialogResults(dialogResult);
    }
  } catch (error) {
    Logger.getLogger().error({ message: "error handling multi step input", error });
  }
}

/**
 * Handles the dialog results. This will delete the desired elements depending on the mode.
 *
 * @param dialogResult - the results of the dialogs
 * @returns a promise if the dialog values were there, otherwise `undefined`
 */
function handleDialogResults(dialogResult: DialogValues): Promise<void> | undefined {
  const path = dialogResult.inputValues.get(PROPERTY_FILE)?.[0];
  const deletionMode = dialogResult.inputValues.get(removeType);

  if (path && deletionMode) {
    return updateConfiguration(deleteConfig(path, deletionMode))
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
 *
 * @param path - the path of the configuration
 * @param deletionMode - the modes what should be deleted. This was selected by the user.
 * @returns a function that has as parameter the jsonData from the setting and removes async the values from it.
 */
function deleteConfig(path: string, deletionMode: string[]): (pJsonData: Record<string, string>) => void {
  return (pJsonData) => {
    // find out the key from the setting for the given path
    const foundKey = Object.keys(pJsonData).find((pKey) => {
      return pJsonData[pKey] === path;
    });

    // get all information about what to delete
    const deleteOptions = whatDeleted.get(deletionMode[0]);

    if (foundKey && deleteOptions) {
      if (deleteOptions.includes(RemoveConfigurationOptions.CACHE)) {
        // remove the cache
        cacheHandler.removeConnectionsFromCache([path]);
      }
      if (deleteOptions.includes(RemoveConfigurationOptions.SETTING)) {
        // remove the setting
        delete pJsonData[foundKey];
      }
      if (deleteOptions.includes(RemoveConfigurationOptions.DELETE_ALL)) {
        // remove the configuration file
        fs.rmSync(path);
      }
    }
  };
}

/**
 * Generates a detail message for the deletion of the contexts.
 *
 * @param dialogValues - the current dialog values
 * @returns detail message what will be deleted
 */
export function generateDetailMessageForDeleteConfiguration(dialogValues: DialogValues): string {
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
