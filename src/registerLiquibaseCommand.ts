import * as vscode from "vscode";
import { executeJar } from "./executeJar";
import { getWorkFolder } from "./readChangelogFile";
import * as path from "path";
import { outputStream } from "./extension";
import {
  ConnectionType,
  DialogValues,
  InputBase,
  PROPERTY_FILE,
  handleMultiStepInput,
} from "./input";

/**
 * Interface defining the configuration for pick panels.
 */
export interface PickPanelConfig {
  /**
   * The input which should be used to get the values.
   */
  input: InputBase;
  /**
   * Any fix command line arguments. There will be filled after all the values where given with
   *
   *
   * @example
   * cmdArgs is `--demo`.
   *
   * 1. User input is a single string `foo`. The created output will be `--demo=foo`.
   * 2. User input is a array of the strings `foo` and `bar`. The created output will be `--demo=foo,bar`.
   */
  cmdArgs?: string;

  /**
   * If there is more logic needed while creating the command-line-arguments than provided by `cmdArgs`, then this should be used.
   * You can give any function that will be given the whole dialog values after all the values where processed and can give an array of command line arguments.
   * @param dialogValues - the dialog values after all dialogs where given to the user
   * @returns an array of the command line arguments. Each element in the array is one argument.
   */
  createCmdArgs?: (dialogValues: DialogValues) => string[] | undefined;
}

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
  pickPanelConfigs: PickPanelConfig[],
  resourcePath: string,
  args?: string[],
  searchPathRequired?: boolean,
  isRightClickMenuAction?: boolean
) {
  return vscode.commands.registerCommand("liquibase." + action, async (...commandArgs) => {
    const searchPath: string = "-Dliquibase.searchPath=" + getWorkFolder();

    //execute dependant methods to get up-to-date-data
    if (!args && searchPathRequired && !isRightClickMenuAction) {
      args = [searchPath];
    } else if (args && searchPathRequired && !isRightClickMenuAction) {
      args.push(searchPath);
    } else if (!args) {
      args = [];
    }

    let propertyFilePath;

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
        pickPanelConfigs.splice(indexToDelete);
      }
    }

    try {
      // Handle the multi-step-input
      const dialogValues = await handleMultiStepInput(pickPanelConfigs.map((pConfig) => pConfig.input));
      if (!dialogValues) {
        return;
      }

      // go over the dialog values
      dialogValues.inputValues.forEach((value, input) => {
        pickPanelConfigs
          .filter((pConfig) => pConfig.input.name === input)
          .forEach((pConfig) => {
            if (input === PROPERTY_FILE) {
              // find out property file and save it in an extra variable
              propertyFilePath = value[0];
            }

            if (pConfig.cmdArgs) {
              // if there were values that are needed to include into the args, then add them
              args?.push(pConfig.cmdArgs + "=" + value.join(","));
            }

            if (pConfig.createCmdArgs) {
              // if we have a custom function for creating the cmd args, then call it and add them as well
              const additionalArgs = pConfig.createCmdArgs(dialogValues);
              additionalArgs?.forEach((pArg) => args?.push(pArg));
            }
          });
      });

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
