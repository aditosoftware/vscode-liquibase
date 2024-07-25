import * as vscode from "vscode";
import { executeJar } from "./executeJar";
import { HandleChangelogFileInput, getWorkFolder } from "./handleChangelogFileInput";
import * as path from "path";
import { resourcePath } from "./extension";
import { DialogValues, InputBase, InputBaseOptions, handleMultiStepInput } from "@aditosoftware/vscode-input";
import { Logger } from "@aditosoftware/vscode-logging";
import { PROPERTY_FILE } from "./input/ConnectionType";
import { TransferActionForCommand } from "./TransferActionForCommand";

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
   * Any action that should be done before the command is executed.
   * This will happen right after the inputs were done.
   *
   * @param dialogValues - the dialog values which contains all the user input from the dialog
   */
  beforeCommandAction?: (dialogValues: DialogValues) => Promise<void>;

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
 * @param title - the title that should be displayed over every input
 * @param action - Liquibase action to perform (e.g., "update").
 * @param pOriginPickPanelConfigs - Array of PickPanelConfig objects representing different user interaction steps.
 * @param additionalCommandAction - any optional additional elements for registering any command
 * @returns The registered command.
 */
export function registerLiquibaseCommand(
  title: string,
  action: string,
  pOriginPickPanelConfigs: ReadonlyArray<PickPanelConfig>,
  additionalCommandAction?: AdditionalCommandAction
): vscode.Disposable {
  return vscode.commands.registerCommand("liquibase." + action, async (...commandArgs) => {
    await addCommandAction(title, action, pOriginPickPanelConfigs, commandArgs, additionalCommandAction);
  });
}

/**
 * Adds the command action that should be registered by the command.
 *
 * @param title - the title that should be displayed over every input
 * @param action - Liquibase action to perform (e.g., "update").
 * @param pOriginPickPanelConfigs - Array of PickPanelConfig objects representing different user interaction steps.
 * @param vscodeCommandArgs - the command arguments given by VSCode when trying to start the command execution
 * @param additionalCommandAction - any optional additional elements for registering any command
 */
export async function addCommandAction(
  title: string,
  action: string,
  pOriginPickPanelConfigs: ReadonlyArray<PickPanelConfig>,
  vscodeCommandArgs: VSCodeArguments,
  additionalCommandAction?: AdditionalCommandAction
): Promise<void> {
  // copy the origin pickPanelConfigs, because we might delete an element from them
  const pickPanelConfigs = Array.from(pOriginPickPanelConfigs);

  const {
    isRightClickMenuAction,
    preBuiltDialogValues,
    transferActions,
  }: {
    isRightClickMenuAction: boolean;
    preBuiltDialogValues: DialogValues;
    transferActions: TransferActionForCommand[];
  } = handleCommandArgs(vscodeCommandArgs, pickPanelConfigs);

  // build the additional arguments
  const args: string[] = buildAdditionalCmdArguments(isRightClickMenuAction, additionalCommandAction);

  try {
    // Handle the multi-step-input
    const dialogValues = await handleMultiStepInput(
      title,
      pickPanelConfigs.map((pConfig) => pConfig.input),
      preBuiltDialogValues
    );

    if (!dialogValues) {
      return;
    }

    await additionalCommandAction?.beforeCommandAction?.(dialogValues);

    const propertyFilePath: string | undefined = transformCommandArgsAfterInput(
      dialogValues,
      pOriginPickPanelConfigs,
      args
    );

    if (propertyFilePath) {
      // Execute Liquibase update with the final selections
      executeJar(resourcePath, action, propertyFilePath, args).then(
        (code) => handleResultsOfCommandExecuted(code, action, dialogValues, transferActions, additionalCommandAction),
        (error) => Logger.getLogger().error({ message: "error executing jar", error })
      );
    } else {
      Logger.getLogger().info({ message: "No property file path given. Command could not be executed" });
    }
  } catch (error) {
    Logger.getLogger().error({ message: "Error:", error });
  }
}

/**
 * The arguments of VSCode that can be passed as additional arguments to any command.
 * `any` type is given by VSCode, so it needs to be there.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VSCodeArguments = any[];

/**
 * The results of the `handleCommandArgs` method.
 */
export type HandleCommandArgsResults = {
  /**
   * If the command was triggered from a right click menu.
   */
  isRightClickMenuAction: boolean;

  /**
   * Any dialog values that are already set by the passed arguments.
   */
  preBuiltDialogValues: DialogValues;

  /**
   * Given transfer actions by the command arguments.
   */
  transferActions: TransferActionForCommand[];
};

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
 * Handles the result of the liquibase command that was executed.
 *
 * @param code - the exit code that was given by the command execution
 * @param action - the name of the action that was called
 * @param dialogValues - the dialog values with the values given by the user
 * @param transferActions - the transfer actions that were passed by any arguments
 * @param additionalCommandAction - additional command actions for executing anything after the command execution
 */
export function handleResultsOfCommandExecuted(
  code: number,
  action: string,
  dialogValues: DialogValues,
  transferActions: TransferActionForCommand[],
  additionalCommandAction?: AdditionalCommandAction
): void {
  if (code === 0) {
    vscode.window
      .showInformationMessage(`Liquibase command '${action}' was executed successfully.`, {}, "Show log")
      .then(
        (result) => {
          if (result && result === "Show log") {
            Logger.getLogger().showOutputChannel(true);
          }
        },
        (error) => Logger.getLogger().error({ message: `error showing success message for action ${action}`, error })
      );
  } else {
    Logger.getLogger().warn({
      message: `Liquibase command '${action}' was not executed successfully. Please see logs for more information.`,
      notifyUser: true,
    });
    Logger.getLogger().showOutputChannel();
  }

  // execute any action after the execution
  additionalCommandAction?.afterCommandAction?.(dialogValues);

  // Execute all Transfer Actions from any command calls
  transferActions.forEach((pTransferAction) => pTransferAction.executeAfterCommandAction());
}

/**
 * Handles the command args that were given by calling this command.
 *
 * @param vscodeCommandArgs - the given command args by VSCode. These are given, when the command was called from RMB menu,
 * or when additional args were passed.
 * @param pickPanelConfigs - the `PickPanelConfig` that contains all current inputs. These can be modified by this method,
 * and some values can be removed, if the values for an input are already filled by an `vscodeCommandArgs`.
 * @returns the results of this method.
 * This includes a detection, if the command was triggered from RMB,
 * some dialog values that are already pre-filled and the transfer actions given by the command args.
 */
export function handleCommandArgs(
  vscodeCommandArgs: VSCodeArguments,
  pickPanelConfigs: PickPanelConfig[]
): HandleCommandArgsResults {
  const transferActions: TransferActionForCommand[] = [];
  // detect if we are coming from a context menu.
  let isRightClickMenuAction = false;
  // and build any dialog values that we have given from the command args
  const preBuiltDialogValues = new DialogValues();

  // detect any command args. These can be values from the right click menu or from any other command calls during the extension.
  for (const commandArg of vscodeCommandArgs) {
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
  return { isRightClickMenuAction, preBuiltDialogValues, transferActions };
}

/**
 * Build additional cmd args depending on the `additionalCommandAction`.
 *
 * @param isRightClickMenuAction - if the current command was triggered from a right click menu.
 * @param additionalCommandAction - any optional additional elements for registering any command
 * @returns the created additional cmd args.
 */
export function buildAdditionalCmdArguments(
  isRightClickMenuAction: boolean,
  additionalCommandAction?: AdditionalCommandAction
): string[] {
  const cmdArgs: string[] = [];
  if (additionalCommandAction?.commandLineArgs) {
    // add any given command line arguments
    additionalCommandAction.commandLineArgs.forEach((pArg) => cmdArgs.push(pArg));
  }
  if (additionalCommandAction?.searchPathRequired && !isRightClickMenuAction) {
    // add the search path to the arguments
    const searchPath: string = "-Dliquibase.searchPath=" + getWorkFolder();
    cmdArgs.push(searchPath);
  }
  return cmdArgs;
}

/**
 * Transform the command values after the inputs.
 * This will create `cmdArgs` after all inputs were given.
 *
 * @param dialogValues - the values that the user has given
 * @param pOriginPickPanelConfigs - the configuration of the inputs. These will be used to add the cmd args to the given values.
 * @param cmdArgs - the cmd args that will be extended by the method.
 * @returns the path to the property file.
 */
export function transformCommandArgsAfterInput(
  dialogValues: DialogValues,
  pOriginPickPanelConfigs: readonly PickPanelConfig[],
  cmdArgs: string[]
): string | undefined {
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
          cmdArgs?.push(pConfig.cmdArgs + "=" + value.join(","));
        }

        if (pConfig.createCmdArgs) {
          // if we have a custom function for creating the cmd args, then call it and add them as well
          const additionalArgs = pConfig.createCmdArgs(dialogValues);
          additionalArgs?.forEach((pArg) => cmdArgs?.push(pArg));
        }
      });
  });

  // set the changelog from the dialog to the uri
  const possibleChangelog = dialogValues.inputValues.get(HandleChangelogFileInput.CHANGELOG_NAME)?.[0];
  if (possibleChangelog) {
    dialogValues.uri = vscode.Uri.file(possibleChangelog);
  }

  if (dialogValues.uri) {
    // if this was called from an right click menu, then handle some parameters differently
    cmdArgs.push("--changelogFile=" + path.relative(getWorkFolder(), dialogValues.uri.fsPath));

    cmdArgs.push("-Dliquibase.searchPath=" + getWorkFolder());
  }
  return propertyFilePath;
}
