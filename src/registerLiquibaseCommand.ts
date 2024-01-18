import * as vscode from "vscode";
import { executeJar } from "./executeJar";
import { getWorkFolder } from "./readChangelogFile";
import * as path from "path";
import { outputStream } from "./extension";
import { ConnectionType, InputBase } from "./input";

/**
 * Interface defining the configuration for pick panels.
 */
export interface PickPanelConfig<ResultType> {
  input: InputBase<ResultType>;
  cmdArgs?: string;
  resultShouldBeExposed?: boolean;
}

// FIXME das kann auch probleme bereiten, wenn mehrere Commands gleichzeitig ausgeführt werden, umbauen!
export let propertyFilePath: string;

/**
 * Registers a Liquibase command with VSCode, prompting the user with a series of pick panels
 * based on the provided configurations and then executes Liquibase update with the selected values.
 *
 * @param action - Liquibase action to perform (e.g., "update").
 * @param pickPanelConfigs - Array of PickPanelConfig objects representing different user interaction steps.
 * @param resourcePath - Path to the Liquibase JAR file.
 * @param args - Additional command-line arguments for Liquibase.
 * @param searchPathRequired - Adds the "searchPath"-parameter to the command (e.g., "update").
 * @returns The registered command.
 */
export function registerLiquibaseCommand(
  action: string,
  pickPanelConfigs: PickPanelConfig<unknown>[],
  resourcePath: string,
  args?: string[],
  searchPathRequired?: boolean,
  isRightClickMenuAction?: boolean
) {
  return vscode.commands.registerCommand("liquibase." + action, async (...commandArgs) => {
    const searchPath: string = "-Dliquibase.searchPath=" + getWorkFolder();
    propertyFilePath = "";

    let currentStep = 1;

    //execute dependant methods to get up-to-date-data
    if (!args && searchPathRequired && !isRightClickMenuAction) {
      args = [searchPath];
    } else if (args && searchPathRequired && !isRightClickMenuAction) {
      args.push(searchPath);
    } else if (!args) {
      args = [];
    }

    // TODO schöner / anders bauen
    if (commandArgs && commandArgs[0] && action === "validate") {
      // adds the property file path from the commandArgs as property file path
      propertyFilePath = commandArgs[0];

      // and removes the question for connection type
      let indexToDelete = -1;
      pickPanelConfigs.forEach((config, index) => {
        if (config.input instanceof ConnectionType) {
          indexToDelete = index;
        }
      });
      if (indexToDelete !== -1) {
        currentStep++;
        pickPanelConfigs.splice(indexToDelete);
      }
    }

    try {
      // Use for...of to iterate over async functions sequentially
      for (const config of pickPanelConfigs) {
        // if (config.items instanceof Function) {
        //   if (commandArgs && commandArgs.length) {
        //     config.items = () => readContextValues(commandArgs[0].fsPath); // TODO Fadler: was hattest du mit diesem Block vor? bei mir funktioniert das nicht
        //   }
        // }
        let result = await getInputByType(config.input, currentStep, pickPanelConfigs.length);

        if (!result) {
          // User canceled the selection
          vscode.window.showInformationMessage("Command was cancelled");
          return;
        }

        // Save property file path for later
        if (config.input instanceof ConnectionType && typeof result === "string" && propertyFilePath.trim() === "") {
          propertyFilePath = result;
        }

        // Handle the selected result as needed
        if (config.cmdArgs) {
          if (Array.isArray(result)) {
            args.push(config.cmdArgs + "=" + result.join(","));
          } else {
            args.push(config.cmdArgs + "=" + result);
          }
        }

        //TODO: notwendig?
        // if (config.resultShouldBeExposed) {
        //   setResultValue(result);
        // }

        currentStep++;
      }

      //TODO Beschreibung
      if (isRightClickMenuAction) {
        if (commandArgs) {
          args.push("--changelogFile=" + path.basename(commandArgs[0].fsPath));
          args.push("-Dliquibase.searchPath=" + path.join(commandArgs[0].fsPath, ".."));
        }
        action = action.replace("RCM", ""); //only change it from here, due to registering unique actions, sorry to anyone who sees this and ask themself why?!?
      }

      // Execute Liquibase update with the final selections
      executeJar(resourcePath, action, args, propertyFilePath).then((code) => {
        if (code === 0) {
          vscode.window
            .showInformationMessage(`Liquibase command '${action}' was executed successfully.`, "Show log")
            .then((result) => {
              if (result && result === "Show log") {
                outputStream.show(true);
              }
            });
        } else {
          vscode.window.showWarningMessage(
            `Liquibase command '${action}' was not executed successfully. Please see logs for more information.`
          );
          outputStream.show();
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
 * @param inputConfig - Configuration for the input.
 * @param maximumSteps - Total number of steps in the user interaction process.
 * @returns Resolved user input.
 */
async function getInputByType<ResultType>(
  inputConfig: InputBase<ResultType>,
  currentStep: number,
  maximumSteps: number
): Promise<ResultType | undefined> {
  // TODO methode ausbauen?
  return await inputConfig.showDialog(currentStep, maximumSteps);
}
