import * as vscode from "vscode";
import * as path from "node:path";
import { prerequisites } from "./prerequisites";
import { getReferenceKeysFromPropertyFile } from "./propertiesToDiff";
import { PickPanelConfig, registerLiquibaseCommand, TransferDataForCommand } from "./registerLiquibaseCommand";
import { HandleChangelogFileInput } from "./handleChangelogFileInput";
import { LiquibaseConfigurationPanel } from "./panels/LiquibaseConfigurationPanel";
import {
  ConfirmationDialog,
  DialogValues,
  InputBox,
  OpenDialog,
  QuickPick,
  initializeLogger,
} from "@aditosoftware/vscode-input";
import * as os from "node:os";
import {
  addExistingLiquibaseConfiguration,
  displayAvailableDrivers,
  editExistingLiquibaseConfiguration,
} from "./settings/configurationCommands";
import {
  changeAndEmptyOutputDirectory,
  fileName,
  generateCommandLineArgs,
  openFileAfterCommandExecution,
  openIndexHtmlAfterCommandExecution,
} from "./liquibaseCommandsUtilities";
import * as fs from "node:fs";
import { Logger } from "@aditosoftware/vscode-logging";
import { readUrl } from "./configuration/data/readFromProperties";
import { openDocument, openLiquibaseDocumentation } from "./utilities/vscodeUtilities";
import { generateContextInputs } from "./handleContexts";
import { ConnectionType, PROPERTY_FILE, REFERENCE_PROPERTY_FILE } from "./input/ConnectionType";
import { CacheHandler, CacheRemover } from "./cache/";
import { removeConfiguration } from "./settings/removeConfiguration";
import { folderSelectionName, selectOutputFolder } from "./constants";
import { convertFormats } from "./convertFormats";

/**
 * The path where all resources (jars) are located from the extension.
 */
export let resourcePath: string;

/**
 * Internal resources folder inside the extension.
 */
export let libFolder: string;

/**
 * The cache handler used for handling the cache.
 */
export let cacheHandler: CacheHandler;

/**
 * Main-Function that will execute all the code within
 *
 * @param context - The context object provided by VSCode to the extension.
 * It represents the lifecycle of the extension and can be used
 * to store and retrieve global state.
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // Constructing the path to the resources folder
  if (context.globalStorageUri) {
    // use the global storage directory for the file system
    if (!fs.existsSync(context.globalStorageUri.fsPath)) {
      fs.mkdirSync(context.globalStorageUri.fsPath, { recursive: true });
    }
    resourcePath = context.globalStorageUri.fsPath;
  } else {
    // Fallback - use home directory
    resourcePath = path.join(os.homedir(), ".liquibase", "resources");
  }

  // construct the cache location and cache handler
  const cacheLocation = path.join(resourcePath, "cache.json");
  cacheHandler = new CacheHandler(cacheLocation);

  // the folder, where additional libraries are included
  libFolder = path.join(context.extensionPath, "lib");

  // initialize the logger
  Logger.initializeLogger(context, "Liquibase");
  // and pass the logger to the input
  initializeLogger(Logger.getLogger());

  // creates the items for the status bar
  context.subscriptions.push(createGeneralStatusBarItem(), createOverviewStatusBarItem());

  // Perform any necessary prerequisites setup before executing the extension logic
  await prerequisites(context, resourcePath);
  // and register all commands
  registerCommands(context);
}

/**
 * Creates a status bar items for the general Liquibase command.
 *
 * @returns the created status bar item
 */
export function createGeneralStatusBarItem(): vscode.StatusBarItem {
  return createStatusBarItem({
    id: "liquibase.general",
    text: "$(default-view-icon) Liquibase Integration",
    name: "Liquibase Commands",
    tooltip: "Execute any Liquibase command",
    command: {
      command: "workbench.action.quickOpen",
      title: "Open command palette",
      arguments: [">Liquibase: "],
    },
  });
}

/**
 * Creates the status bar item for the overview action in the status bar.
 *
 * @returns the created status bar item
 */
export function createOverviewStatusBarItem(): vscode.StatusBarItem {
  return createStatusBarItem({
    id: "liquibase.overview",
    text: "$(book)",
    name: "Liquibase Overview",
    tooltip: "Generate an overview of your Liquibase database",
    command: {
      command: "liquibase.db-doc",
      title: "db-doc",
      arguments: [new TransferDataForCommand(folderSelectionName, path.join(os.tmpdir(), "liquibase-overview"))],
    },
  });
}

/**
 * Creates a status bar item with the given configuration.
 *
 * @param statusBarItemValues - the values that are needed for creating a status bar item
 * @returns the created status bar item. You need to be add this item to `context.subscriptions`. Otherwise, the item will not be available.
 */
function createStatusBarItem(statusBarItemValues: StatusBarItemValues): vscode.StatusBarItem {
  const statusBarItem = vscode.window.createStatusBarItem(statusBarItemValues.id, vscode.StatusBarAlignment.Left);

  statusBarItem.text = statusBarItemValues.text;
  statusBarItem.name = statusBarItemValues.name;
  statusBarItem.tooltip = statusBarItemValues.tooltip;

  // title is not needed for the command for the status bar, but required by the object
  statusBarItem.command = statusBarItemValues.command;

  // show the status bar item
  statusBarItem.show();

  return statusBarItem;
}

/**
 * The values that should be given when creating a status bar item.
 */
type StatusBarItemValues = {
  /**
   * the id for the status bar item
   */
  id: string;

  /**
   * The text to show for the entry. You can embed icons in the text by leveraging the syntax:
   *
   * `My text $(icon-name) contains icons like $(icon-name) this one.`
   *
   * Where the icon-name is taken from the ThemeIcon [icon set](https://code.visualstudio.com/api/references/icons-in-labels#icon-listing), e.g.
   * `light-bulb`, `thumbsup`, `zap` etc.
   */
  text: string;

  /**
   * the name that is used for toggling the item regards its visibility
   */
  name: string;

  /**
   * the tooltip that should be shown when hovering over the element
   */
  tooltip: string;

  /**
   * the command that should be executed.
   *
   * **Note:**  Only the only the `command` and `arguments` elements are used.
   */
  command: vscode.Command;
};

/**
 * Registers all commands for the extension.
 *
 * @param context - the context on which the commands should be registered
 */
function registerCommands(context: vscode.ExtensionContext): void {
  // Register all commands that are needed for handling liquibase properties
  registerCommandsForLiquibasePropertiesHandling(context);

  context.subscriptions.push(
    vscode.commands.registerCommand("liquibase.convertFormatFolder", async () => await convertFormats(false)),

    vscode.commands.registerCommand("liquibase.convertFormatFile", async (...commandArgs) => {
      let selectedFile: vscode.Uri | undefined = undefined;

      // commandArgs will be filled, when called from right button menu.
      if (commandArgs) {
        for (const commandArg of commandArgs) {
          if (commandArg instanceof vscode.Uri) {
            selectedFile = commandArg;
          }
        }
      }

      await convertFormats(true, selectedFile);
    }),

    // Register all commands that are used for showing/deleting the cache
    vscode.commands.registerCommand("liquibase.openCacheFile", async () => {
      await openDocument(cacheHandler.cacheLocation);
    }),
    vscode.commands.registerCommand("liquibase.removeFromCache", async () => {
      await new CacheRemover(cacheHandler).removeFromCache();
    }),

    // Command that will be executed when the extension command is triggered
    registerLiquibaseCommand("Update your database", "update", [...generatePropertyFileDialogOptions(true, true)], {
      searchPathRequired: true,
    }),

    registerLiquibaseCommand("Drop every content from your database", "drop-all", [
      ...generatePropertyFileDialogOptions(false, false),
      {
        input: new ConfirmationDialog({
          name: "confirmation",
          message: "Do you really want to execute 'drop-all'?",
          detail: (dialogValues: DialogValues) => {
            const propertyFile = dialogValues.inputValues.get(PROPERTY_FILE)?.[0];

            let detail: string = "";
            if (propertyFile) {
              const url = readUrl(propertyFile);
              if (url) {
                detail = ` ${url}`;
              }
            }

            return `This will remove all the data from your database${detail}.\n You can NOT restore any of the data.`;
          },
          confirmButtonName: "Drop-all",
        }),
        createCmdArgs: (dialogValues) => {
          return setRequireForceAndForceParameter(dialogValues);
        },
      },
    ]),

    registerLiquibaseCommand(
      "Validate the content of your changelogs",
      "validate",
      [...generatePropertyFileDialogOptions(true, false)],
      {
        searchPathRequired: true,
      }
    ),

    registerLiquibaseCommand("List the not deployed changesets", "status", [
      ...generatePropertyFileDialogOptions(true, true),
    ]),

    registerLiquibaseCommand(
      "Compare two databases",
      "diff",
      [
        ...generatePropertyFileDialogOptions(false, false),
        {
          input: new ConnectionType({ name: "referencePropertyFile" }),
          createCmdArgs: (dialogValues) =>
            getReferenceKeysFromPropertyFile(dialogValues.inputValues.get(REFERENCE_PROPERTY_FILE)?.[0]),
        },
        {
          input: new OpenDialog({
            name: folderSelectionName,
            openDialogOptions: {
              openLabel: selectOutputFolder,
              canSelectFiles: false,
              canSelectFolders: true,
              canSelectMany: false,
            },
          }),
        },

        {
          input: new InputBox({
            name: fileName,
            inputBoxOptions: {
              placeHolder: "The file name under which your diff should be written, e.g. diff.txt",
              value: "diff.txt",
            },
          }),
          createCmdArgs: (dialogValues) => generateCommandLineArgs("output-file", dialogValues),
        },
        generateDiffTypes(),
      ],
      {
        afterCommandAction: openFileAfterCommandExecution,
      }
    ),

    // Generate-Changelog
    registerLiquibaseCommand(
      "Generate a changelog from your database",
      "generate-changelog",
      [
        ...generatePropertyFileDialogOptions(false, false),

        {
          input: new OpenDialog({
            name: folderSelectionName,
            openDialogOptions: {
              openLabel: selectOutputFolder,
              canSelectFiles: false,
              canSelectFolders: true,
              canSelectMany: false,
            },
          }),
        },
        {
          input: new InputBox({
            name: fileName,
            inputBoxOptions: {
              placeHolder: "The file name under which changelog should be written, e.g. changelog.xml",
              value: "changelog.xml",
            },
          }),
          createCmdArgs: (dialogValues) => generateCommandLineArgs("changelog-file", dialogValues),
        },
        generateDiffTypes("The types for which the changelog should be generated"),
        {
          input: new InputBox({
            name: "includeObjects",
            customButton: {
              button: {
                iconPath: new vscode.ThemeIcon("question"),
                tooltip: "Information what is possible with include objects",
              },
              action: () =>
                openLiquibaseDocumentation(
                  "https://docs.liquibase.com/workflows/liquibase-community/including-and-excluding-objects-from-a-database.html"
                ),
            },
            inputBoxOptions: {
              placeHolder: "The tables for which you want the changelog generated",
              ignoreFocusOut: true,
            },
          }),
          cmdArgs: "--include-objects",
        },
      ],
      {
        afterCommandAction: openFileAfterCommandExecution,
      }
    ),

    registerLiquibaseCommand(
      "Generate database documentation",
      "db-doc",
      [
        ...generatePropertyFileDialogOptions(true, false),
        {
          input: new OpenDialog({
            name: folderSelectionName,
            openDialogOptions: {
              openLabel: selectOutputFolder,
              canSelectFiles: false,
              canSelectFolders: true,
              canSelectMany: false,
            },
          }),
          cmdArgs: "--output-directory",
        },
      ],
      {
        beforeCommandAction: changeAndEmptyOutputDirectory,
        afterCommandAction: openIndexHtmlAfterCommandExecution,
      }
    ),

    registerLiquibaseCommand(
      "Find changelogs that are in the database but not in the current changelog",
      "unexpected-changesets",
      [...generatePropertyFileDialogOptions(true, true)],
      {
        commandLineArgs: ["--verbose"],
      }
    ),

    registerLiquibaseCommand("Mark not deployed changelogs as executed", "changelog-sync", [
      ...generatePropertyFileDialogOptions(true, true),
    ]),

    registerLiquibaseCommand("Clear the checksums of all changelogs in the database", "clear-checksums", [
      ...generatePropertyFileDialogOptions(false, false),
    ]),

    registerLiquibaseCommand(
      "List all deployed changesets",
      "history",
      [
        ...generatePropertyFileDialogOptions(false, false),
        {
          input: new OpenDialog({
            name: folderSelectionName,
            openDialogOptions: {
              openLabel: selectOutputFolder,
              canSelectFiles: false,
              canSelectFolders: true,
              canSelectMany: false,
            },
          }),
        },
        {
          input: new InputBox({
            name: fileName,
            inputBoxOptions: {
              placeHolder: "The file name under which your history file should be written, e.g. history.txt",
              value: "history.txt",
            },
          }),
          createCmdArgs: (dialogValues) => generateCommandLineArgs("output-file", dialogValues),
        },
        {
          input: new QuickPick({
            name: "historyFormat",
            placeHolder: "Choose the desired history format",
            generateItems: () => [
              {
                label: "TABULAR",
                picked: true,
                detail: "This displays the output as a table, grouped by deployment ID.",
              },
              { label: "TEXT", detail: "This displays the output as plain text." },
            ],
          }),
          cmdArgs: "--format",
        },
      ],
      {
        afterCommandAction: openFileAfterCommandExecution,
      }
    ),

    registerLiquibaseCommand("Create a tag", "tag", [
      ...generatePropertyFileDialogOptions(false, false),
      {
        input: new InputBox({
          name: "tagName",
          inputBoxOptions: {
            placeHolder: "Choose a name for the new tag",
          },
        }),
        cmdArgs: "--tag",
      },
    ]),

    registerLiquibaseCommand("Check if a tag exists", "tag-exists", [
      ...generatePropertyFileDialogOptions(false, false),
      {
        input: new InputBox({
          name: "tagName",
          inputBoxOptions: {
            placeHolder: "The name of the tag",
          },
        }),
        cmdArgs: "--tag",
      },
    ]),

    registerLiquibaseCommand("Rollback to specific tag", "rollback", [
      ...generatePropertyFileDialogOptions(true, true),
      {
        input: new InputBox({
          name: "tagName",
          inputBoxOptions: {
            placeHolder: "Tag to rollback to",
          },
        }),
        cmdArgs: "--tag",
      },
    ]),

    registerLiquibaseCommand(
      "Generate SQL File for incoming changes",
      "update-sql",
      [
        ...generatePropertyFileDialogOptions(true, true),
        {
          input: new OpenDialog({
            name: folderSelectionName,
            openDialogOptions: {
              openLabel: selectOutputFolder,
              canSelectFiles: false,
              canSelectFolders: true,
              canSelectMany: false,
            },
          }),
        },
        {
          input: new InputBox({
            name: fileName,
            inputBoxOptions: {
              placeHolder: "The file name under which your update sql should be written",
              value: "update-sql.sql",
            },
          }),
          createCmdArgs: (dialogValues) => generateCommandLineArgs("output-file", dialogValues),
        },
      ],
      {
        afterCommandAction: openFileAfterCommandExecution,
      }
    )
  );
}

/**
 * Sets the '--requireForce' and '--force' arguments if the confirmation was set.
 *
 * @param dialogValues - the dialog values to check if the confirmation was set
 * @returns - the '--requireForce' and '--force' arguments or an empty array if the confirmation was not set
 */
export function setRequireForceAndForceParameter(dialogValues: DialogValues): string[] {
  if (dialogValues.inputValues.get("confirmation") === undefined) {
    return [];
  } else if (
    dialogValues.inputValues.get("confirmation")?.[0] &&
    dialogValues.inputValues.get("confirmation")?.[0] === "true"
  ) {
    return ["--requireForce", "--force"];
  }

  return [];
}

/**
 * Validates an input that it was given.
 *
 * @param value - the value that should be validated
 * @returns the validation message or `null`, when every value was ok
 */
export function validateInput(value: string): string | null {
  if (value.trim() === "") {
    return "Objects to include must not be empty";
  }
  return null;
}

/**
 * Generates an input for the `--diff-types` and pre-selects the default types.
 *
 * @param placeHolder - the placeHolder that should be set in the dialog
 * @returns the pickPanelConfig with all the diff types
 */
function generateDiffTypes(placeHolder: string = "Choose any diff types"): PickPanelConfig {
  return {
    input: new QuickPick({
      name: "diffTypes",
      placeHolder,
      //all possible diffTypes for the diff dialog
      generateItems: () => [
        { label: "catalogs", description: "" },
        { label: "columns", description: "default", picked: true },
        { label: "data", description: "" },
        { label: "foreignkeys", description: "default", picked: true },
        { label: "indexes", description: "default", picked: true },
        { label: "primarykeys", description: "default", picked: true },
        { label: "sequences", description: "" },
        { label: "tables", description: "default", picked: true },
        { label: "uniqueconstraints", description: "default", picked: true },
        { label: "views", description: "default", picked: true },
      ],
      allowMultiple: true,
    }),
    cmdArgs: "--diff-types",
  };
}

/**
 * Generate the PickPanelConfigs for any dialog that needs a property file.
 * This will return the basic `ConnectionType` input as well as the required changelog and context dialogs.
 *
 * @param changelogNeeded - information if the changelog is query is potentially needed for the command. This should be true, if the command can use a `--changelog-file` parameter
 * @param contextNeeded - information if the context can be given as a parameter for the command. Note: If this is true, then the changelog should be also true, because the changelog is needed for finding out the contexts.
 * @returns an array of the required elements for the property file querying in the dialog
 */
function generatePropertyFileDialogOptions(changelogNeeded: boolean, contextNeeded: boolean): PickPanelConfig[] {
  const inputConfigs: PickPanelConfig[] = [
    {
      input: new ConnectionType({ name: "propertyFile" }),
    },
  ];

  if (changelogNeeded) {
    inputConfigs.push(...HandleChangelogFileInput.generateChangelogInputs());
  }

  if (contextNeeded) {
    inputConfigs.push(...generateContextInputs());
  }

  return inputConfigs;
}

/**
 * Registers all the commands that are needed by liquibase properties handling
 *
 * @param context - the Context for storing the commands
 */
function registerCommandsForLiquibasePropertiesHandling(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("liquibase.createLiquibaseConfiguration", () => {
      LiquibaseConfigurationPanel.render(context.extensionUri);
    }),

    vscode.commands.registerCommand("liquibase.editExistingLiquibaseConfiguration", (uri: vscode.Uri) =>
      editExistingLiquibaseConfiguration(uri, context)
    ),

    vscode.commands.registerCommand("liquibase.removeExistingConfiguration", async () => removeConfiguration()),

    vscode.commands.registerCommand("liquibase.addExistingConfiguration", addExistingLiquibaseConfiguration),

    vscode.commands.registerCommand("liquibase.drivers", displayAvailableDrivers)
  );
}

/**
 * Shutting down the client. This function is called when the extension is deactivated.
 */
export function deactivate(): void {
  Logger.end();
}

/**
 * Sets the resource path. This is used for tests, when no value was set.
 *
 * @param pResourcePath - the value the set
 */
export function setResourcePath(pResourcePath: string): void {
  resourcePath = pResourcePath;
}
/**
 * Sets the cache handler. This is used for tests, when no value was set.
 *
 * @param pCacheHandler - the value the set
 */
export function setCacheHandler(pCacheHandler: CacheHandler): void {
  cacheHandler = pCacheHandler;
}

/**
 * Sets the lib folder. This is used for tests, when no value was set.
 *
 * @param pLibFolder - the value the set
 */
export function setLibFolder(pLibFolder: string): void {
  libFolder = pLibFolder;
}
