import * as vscode from "vscode";
import { executeJar } from "./executeJar";
import { getWorkFolder } from "./readChangelogFile";
import path from "path";

/**
 * Enum defining different input types for user interaction panels.
 */
export enum InputType {
  InputBox,
  OpenDialog,
  QuickPick,
  SaveDialog,
  TextDocument,
  WorkspaceFolderPick,
}

/**
 * Interface defining the configuration for pick panels.
 */
export interface PickPanelConfig {
  panelType: InputType;
  currentStep: number;
  items: any;
  allowMultiple?: boolean;
  cmdArgs?: string;
  resultShouldBeExposed?: boolean;
}

/**
 * Registers a Liquibase command with VSCode, prompting the user with a series of pick panels
 * based on the provided configurations and then executes Liquibase update with the selected values.
 *
 * @param commandId - Unique identifier for the command.
 * @param action - Liquibase action to perform (e.g., "update").
 * @param pickPanelConfigs - Array of PickPanelConfig objects representing different user interaction steps.
 * @param context - VSCode extension context.
 * @param resourcePath - Path to the Liquibase JAR file.
 * @param args - Additional command-line arguments for Liquibase.
 * @param message - Replaces the "success"-message when command was successfully executed
 * @returns The registered command.
 */
export function registerLiquibaseCommand(
  commandId: string,
  action: string,
  pickPanelConfigs: PickPanelConfig[],
  context: vscode.ExtensionContext,
  resourcePath: string,
  args?: string[], //auslagern weil sonst überschreibbar
  message?: string
) {
  return vscode.commands.registerCommand(commandId, async () => {
    const searchPath: string = "-Dliquibase.searchPath=" + getWorkFolder();
    //TODO: write why
    if (!args) {
      args = [searchPath];
    } else {
      args.push(searchPath);
    }

    try {
      // Use for...of to iterate over async functions sequentially
      for (const config of pickPanelConfigs) {
        let result = await getInputByType(config, pickPanelConfigs.length);

        if (!result) {
          // User canceled the selection
          vscode.window.showInformationMessage("Command was cancelled");
          return;
        }

        // Handle the selected result as needed
        if (config.cmdArgs) {
          let test = Object.values(result).map((pEe: Object) => {
            return Object.values(pEe).join(",");
          });
          console.log(test.join(","));
          args.push(config.cmdArgs + "=" + result);
        }

        if (config.resultShouldBeExposed) {
          setResultValue(result);
        }
      }

      // Execute Liquibase update with the final selections
      executeJar(resourcePath, action, args, "") //TODO: replace empty String with liquibase.property-File-Path
        .then(() => {
          if (message) {
            vscode.window.showInformationMessage(
              message //TODO: erkennen was man reinschreiben will (notwendig?) s.u.
            );
          } else {
            vscode.window.showInformationMessage(
              `Liquibase ${action} was successful` //TODO: Entweder mit Info, was war oder garnicht und ins Log schauen
            );
          }
          args = []; //empty the args array for continues usage
        })
        .catch((error) => console.error("Error:", error.message));
    } catch (error) {
      console.error("Error: " + error);
    }
  });
}

/**
 * Asynchronously retrieves user input based on the specified panel type.
 *
 * @param config - Configuration for the pick panel.
 * @param maximumSteps - Total number of steps in the user interaction process.
 * @returns Resolved user input.
 */
async function getInputByType(config: PickPanelConfig, maximumSteps: number) {
  switch (config.panelType) {
    case InputType.QuickPick:
      const options: vscode.QuickPickOptions = {
        placeHolder: `Select one item${
          config.allowMultiple ? " or more items" : ""
        } - (Step ${config.currentStep} of ${maximumSteps})`,
        canPickMany: config.allowMultiple,
      };

      // Executing config.items to get possible values when defined.
      // You might need this, if you want to listen to an input from an earlier prompt
      if (typeof config.items === "function") {
        config.items = config.items();
      }

      return await vscode.window
        .showQuickPick(config.items, options)
        .then((selectedItems) => {
          return selectedItems;
        });
    case InputType.OpenDialog:
      config.items.openLabel = `Select Directory - (Step ${config.currentStep} of ${maximumSteps})`;
      return await vscode.window.showOpenDialog(config.items).then((uri) => {
        if (uri && uri[0]) {
          return uri[0].fsPath;
        }
      });
    case InputType.InputBox:
      config.items.placeHolder = `Choose a name - (Step ${config.currentStep} of ${maximumSteps})`;
      return await vscode.window.showInputBox(config.items).then((name) => {
        return name;
      });
    case InputType.SaveDialog:
      // TODO: implement this, if needed
      break;
    case InputType.TextDocument:
      // TODO: implement this, if needed
      break;
    case InputType.WorkspaceFolderPick:
      // TODO: implement this, if needed
      break;
    default:
      console.log("InputType not defined");
      return;
  }
}

// TODO: replace it, with a more "stable" approach, when needed
let sharedValue: any;

export function setResultValue(value: any) {
  console.log(value.path);
  sharedValue = value.path;
}

export function getResultValue() {
  return sharedValue;
}
