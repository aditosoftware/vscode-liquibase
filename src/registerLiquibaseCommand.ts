import * as vscode from "vscode";
import { executeJar } from "./executeJar";
import { getWorkFolder, readContextValues } from "./readChangelogFile";
import * as path from "path";
import { METHODS } from "http";

/**
 * Enum defining different input types for user interaction panels.
 */
export enum InputType {
  ConnectionType,
  InputBox,
  OpenDialog,
  QuickPick,
  SaveDialog,
  TextDocument,
  WorkspaceFolderPick,
  ConfirmationDialog,
}

/**
 * Interface defining the configuration for pick panels.
 */
export interface PickPanelConfig {
  panelType: InputType;
  items: any;
  allowMultiple?: boolean;
  cmdArgs?: string;
  resultShouldBeExposed?: boolean;
}

let propertyFilePath: string;

/**
 * Registers a Liquibase command with VSCode, prompting the user with a series of pick panels
 * based on the provided configurations and then executes Liquibase update with the selected values.
 *
 * @param action - Liquibase action to perform (e.g., "update").
 * @param pickPanelConfigs - Array of PickPanelConfig objects representing different user interaction steps.
 * @param resourcePath - Path to the Liquibase JAR file.
 * @param args - Additional command-line arguments for Liquibase.
 * @param message - Replaces the "success"-message when command was successfully executed
 * @param searchPathRequired - Adds the "searchPath"-parameter to the command (e.g., "update").
 * @returns The registered command.
 */
export function registerLiquibaseCommand(
  action: string,
  pickPanelConfigs: PickPanelConfig[],
  resourcePath: string,
  args?: string[],
  message?: string,
  searchPathRequired?: boolean,
  isRightClickMenuAction?: boolean,
) {
  return vscode.commands.registerCommand("Liquibase." + action, async (...commandArgs) => {
    const searchPath: string = "-Dliquibase.searchPath=" + getWorkFolder();

    let currentStep = 1;

    //execute dependant methods to get up-to-date-data
    if (!args && searchPathRequired && !isRightClickMenuAction) {
      args = [searchPath];
    } else if (args && searchPathRequired && !isRightClickMenuAction) {
      args.push(searchPath);
    } else if (!args) {
      args = [];
    }

    try {
      
      // Use for...of to iterate over async functions sequentially
      for (const config of pickPanelConfigs) {
        if(commandArgs && config.items instanceof Function)
        {
          config.items = () => readContextValues(commandArgs[0].fsPath);
        }
        let result = await getInputByType(
          config,
          currentStep,
          pickPanelConfigs.length
        );

        if (!result) {
          // User canceled the selection
          vscode.window.showInformationMessage("Command was cancelled");
          return;
        }

        // Handle the selected result as needed
        if (config.cmdArgs && result.length > 0) {
          if (Array.isArray(result)) {
            let x = [];
            for (const item of result) {
              x.push(item.label);
            }
            args.push(config.cmdArgs + "=" + x.join(","));
          } else {
            args.push(config.cmdArgs + "=" + result);
          }
        }

        //TODO: Beschreibung
        if (config.resultShouldBeExposed) {
          setResultValue(result);
        }

        currentStep++;
      }

      //TODO Beschreibung
      if(isRightClickMenuAction) {
        if(commandArgs)
        {
          args.push("--changelogFile=" + path.basename(commandArgs[0].fsPath));
          args.push("-Dliquibase.searchPath=" + path.join(commandArgs[0].fsPath, ".."));
        }
        action = action.replace("RCM", ""); //only change it from here, due to registering unique actions, sorry to anyone who sees this and ask themself why?!?
      }
      

      // Execute Liquibase update with the final selections
      executeJar(resourcePath, action, args, propertyFilePath).then(() => {
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
      });
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
async function getInputByType(
  config: PickPanelConfig,
  currentStep: number,
  maximumSteps: number
): Promise<any> {
  switch (config.panelType) {
    case InputType.ConnectionType:
      const x: vscode.QuickPickOptions = {
        placeHolder: `Select one System - (Step ${currentStep} of ${maximumSteps})`,
        canPickMany: false,
      };

      return await vscode.window
        .showQuickPick(config.items, x)
        .then((selectedSystem) => {
          if (selectedSystem) {
            //@ts-ignore - selectedSystem is an object which contains the "path"-key but is interpreted as a string
            propertyFilePath = selectedSystem.path;
          }

          return selectedSystem;
        });

    case InputType.QuickPick:
      const options: vscode.QuickPickOptions = {
        placeHolder: `Select one item${
          config.allowMultiple ? " or more items" : ""
        } - (Step ${currentStep} of ${maximumSteps})`,
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
      config.items.openLabel = `Select Directory - (Step ${currentStep} of ${maximumSteps})`; //TODO: accept Naming from extention.ts
      return await vscode.window.showOpenDialog(config.items).then((uri) => {
        if (uri && uri[0]) {
          return uri[0].fsPath;
        }
      });
    case InputType.InputBox:
      config.items.placeHolder = `Choose a name - (Step ${currentStep} of ${maximumSteps})`;
      return await vscode.window.showInputBox(config.items).then((name) => {
        return name;
      });
    case InputType.SaveDialog:
      // implement this, if needed
      break;
    case InputType.TextDocument:
      // implement this, if needed
      break;
    case InputType.WorkspaceFolderPick:
      // implement this, if needed
      break;
    case InputType.ConfirmationDialog:
      return await vscode.window
        .showInformationMessage(config.items, "Yes", "No")
        .then((answer) => {
          if (answer === "No") {
            return undefined;
          } else {
            return true;
          }
        });
    default:
      console.log("InputType not defined");
      return;
  }
}

// I feel like a criminal for this
let sharedValue: any;

export function setResultValue(value: any) {
  sharedValue = value;
}

export function getResultValue(key?: string) {
  if (key) {
    return sharedValue[key];
  } else {
    return sharedValue;
  }
}