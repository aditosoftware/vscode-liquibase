import * as vscode from "vscode";
import { executeJar } from "./executeJar";
import { getWorkFolder } from "./handleChangelogFileInput";
import * as path from "path";
import { resourcePath } from "./extension";
import { DialogValues, InputBase, InputBaseOptions, handleMultiStepInput } from "@aditosoftware/vscode-input";
import { Logger } from "@aditosoftware/vscode-logging";
import { PROPERTY_FILE } from "./input/ConnectionType";

/**
 * Interface defining the configuration for pick panels.
 */
export interface PickPanelConfig {
  /**
   * The input which should be used to get the values.
   */
  input: InputBase<InputBaseOptions>;
  /**
   * Any fix command line arguments. There will be filled after all the values where given with
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
   *
   * @param dialogValues - the dialog values after all dialogs where given to the user
   * @returns an array of the command line arguments. Each element in the array is one argument.
   */
  createCmdArgs?: (dialogValues: DialogValues) => string[] | undefined;
}

/**
 * Any optional additional elements for any liquibase command.
 */
export interface AdditionalCommandAction {
  /**
   * Additional command-line arguments for Liquibase, which don't need any input from any `PickPanelConfig`.
   */
  commandLineArgs?: ReadonlyArray<string>;

  /**
   * Any action that should be executed after the command was run successful, e.g. opening created files.
   *
   * @param dialogValues - the dialog values which contains all the user input from the dialog
   */
  afterCommandAction?: (dialogValues: DialogValues) => void;

  /**
   * Adds the "searchPath"-parameter to the command when needed.
   */
  searchPathRequired?: boolean;
}

/**
 * Registers a Liquibase command with VSCode, prompting the user with a series of pick panels
 * based on the provided configurations and then executes Liquibase update with the selected values.
 *
 * @param action - Liquibase action to perform (e.g., "update").
 * @param pOriginPickPanelConfigs - Array of PickPanelConfig objects representing different user interaction steps.
 * @param additionalCommandAction - any optional additional elements for registering any command
 * @returns The registered command.
 */
export function registerLiquibaseCommand(
  action: string,
  pOriginPickPanelConfigs: ReadonlyArray<PickPanelConfig>,
  additionalCommandAction?: AdditionalCommandAction
): vscode.Disposable {
  return vscode.commands.registerCommand("liquibase." + action, async (...commandArgs) => {
    // copy the origin pickPanelConfigs, because we might delete an element from them
    const pickPanelConfigs = Array.from(pOriginPickPanelConfigs);

    const transferActions: TransferActionForCommand[] = [];
    // detect if we are coming from a context menu.
    let isRightClickMenuAction = false;
    // and build any dialog values that we have given from the command args
    const preBuiltDialogValues = new DialogValues();
    // detect any command args. These can be values from the right click menu or from any other command calls during the extension.
    for (const commandArg of commandArgs) {
      if (commandArg instanceof vscode.Uri) {
        // Right click menus has Uri
        preBuiltDialogValues.uri = commandArg;
        isRightClickMenuAction = true;
      } else if (commandArg instanceof TransferDataForCommand) {
        // external data from any other command call

        // find out the config we can delete
        let indexToDelete = -1;
        pickPanelConfigs.forEach((config, index) => {
          if (config.input.inputOptions.name === commandArg.name) {
            indexToDelete = index;

            // if a config was found, set the new value
            preBuiltDialogValues.addValue(config.input.inputOptions.name, commandArg.data);
          }
        });

        // delete the config, if it was found
        if (indexToDelete !== -1) {
          pickPanelConfigs.splice(indexToDelete);
        }
      } else if (commandArg instanceof TransferActionForCommand) {
        transferActions.push(commandArg);
      } else if (typeof commandArg !== "undefined") {
        // Note: this message will also appear, if everything was alright.
        Logger.getLogger().debug({
          message: `Unknown data coming to the command ${commandArg}. Type was ${typeof commandArg}.`,
        });
      }
    }

    // build the additional arguments
    const args: string[] = [];
    if (additionalCommandAction && additionalCommandAction.commandLineArgs) {
      // add any given command line arguments
      additionalCommandAction.commandLineArgs.forEach((pArg) => args.push(pArg));
    }
    if (additionalCommandAction && additionalCommandAction.searchPathRequired && !isRightClickMenuAction) {
      // add the search path to the arguments
      const searchPath: string = "-Dliquibase.searchPath=" + getWorkFolder();
      args.push(searchPath);
    }

    try {
      // Handle the multi-step-input
      const dialogValues = await handleMultiStepInput(
        pickPanelConfigs.map((pConfig) => pConfig.input),
        preBuiltDialogValues
      );
      if (!dialogValues) {
        return;
      }

      let propertyFilePath: string | undefined;
      // go over the dialog values
      dialogValues.inputValues.forEach((value, input) => {
        pOriginPickPanelConfigs
          .filter((pConfig) => pConfig.input.inputOptions.name === input)
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

      if (dialogValues.uri) {
        // if this was called from an right click menu, then handle some parameters differently
        args.push("--changelogFile=" + path.relative(getWorkFolder(), dialogValues.uri.fsPath));

        args.push("-Dliquibase.searchPath=" + getWorkFolder());
      }

      if (propertyFilePath) {
        // Execute Liquibase update with the final selections
        executeJar(resourcePath, action, propertyFilePath, args).then(
          (code) => {
            if (code === 0) {
              vscode.window
                .showInformationMessage(`Liquibase command '${action}' was executed successfully.`, "Show log")
                .then(
                  (result) => {
                    if (result && result === "Show log") {
                      Logger.getLogger().showOutputChannel(true);
                    }
                  },
                  (error) =>
                    Logger.getLogger().error({ message: `error showing success message for action ${action}`, error })
                );
            } else {
              Logger.getLogger().warn({
                message: `Liquibase command '${action}' was not executed successfully. Please see logs for more information.`,
                notifyUser: true,
              });
              Logger.getLogger().showOutputChannel();
            }

            // execute any action after the execution
            if (additionalCommandAction && additionalCommandAction.afterCommandAction) {
              additionalCommandAction.afterCommandAction(dialogValues);
            }

            // Execute all Transfer Actions from any command calls
            transferActions.forEach((pTransferAction) => pTransferAction.executeAfterCommandAction());
          },
          (error) => Logger.getLogger().error({ message: "error executing jar", error })
        );
      } else {
        Logger.getLogger().info({ message: "No property file path given. Command could not be executed" });
      }
    } catch (error) {
      Logger.getLogger().error({ message: "Error:", error });
    }
  });
}

/**
 * Any transfer data that should be given when calling a liquibase command.
 *
 * This should be used when you call any liquibase command from another command.
 *
 * Example call:
 *
 * @example
 * await vscode.commands.executeCommand("liquibase.validate", new TransferDataForCommand(PROPERTY_FILE, file));
 */
export class TransferDataForCommand {
  /**
   * Creates the transfer data.
   *
   * @param name - The name of the data. This should be identical to `InputBase.name`.
   * This will be used to set the data and prevent the dialog element with data name.
   * @param data - The data which should be set for the given name.
   */
  constructor(public name: string, public data: string | boolean | string[]) {}
}

/**
 * Any action that should be executed after the command.
 *
 * This should be used when you call any liquibase command from another command.
 *
 * Example call:
 *
 * @example
 * await vscode.commands.executeCommand("liquibase.validate", new MyTransferActionForCommand());
 */
export abstract class TransferActionForCommand {
  /**
   * Command that should be executed after the liquibase command was finished.
   */
  abstract executeAfterCommandAction(): void;
}
