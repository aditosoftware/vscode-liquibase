import * as vscode from "vscode";
import * as path from "path";
import { prerequisites } from "./prerequisites";
import { getReferenceKeysFromPropertyFile } from "./propertiesToDiff";
import { PickPanelConfig, registerLiquibaseCommand } from "./registerLiquibaseCommand";
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
import * as os from "os";
import {
  addExistingLiquibaseConfiguration,
  displayAvailableDrivers,
  editExistingLiquibaseConfiguration,
} from "./settings/configurationCommands";
import {
  fileName,
  generateCommandLineArgs,
  openFileAfterCommandExecution,
  openIndexHtmlAfterCommandExecution,
} from "./liquibaseCommandsUtilities";
import * as fs from "fs";
import { Logger } from "@aditosoftware/vscode-logging";
import { readUrl } from "./configuration/data/readFromProperties";
import { openDocument, openLiquibaseDocumentation } from "./utilities/vscodeUtilities";
import { generateContextInputs } from "./handleContexts";
import { ConnectionType, PROPERTY_FILE, REFERENCE_PROPERTY_FILE } from "./input/ConnectionType";
import { CacheHandler, CacheRemover } from "./cache/";
import { removeConfiguration } from "./settings/removeConfiguration";
import { folderSelectionName } from "./constants";

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

  // Perform any necessary prerequisites setup before executing the extension logic
  await prerequisites(context, resourcePath);
  // and register all commands
  registerCommands(context);
}

/**
 * Registers all commands for the extension.
 *
 * @param context - the context on which the commands should be registered
 */
function registerCommands(context: vscode.ExtensionContext): void {
  // add a dummy command for loading all resources
  context.subscriptions.push(
    vscode.commands.registerCommand("liquibase.initialize", () => {
      Logger.getLogger().info({
        message: "Triggered loading of all resources. Check logs afterwards.",
        notifyUser: true,
      });
    })
  );

  // Register all commands that are needed for handling liquibase properties
  registerCommandsForLiquibasePropertiesHandling(context);

  // Register all commands that are used for showing/deleting the cache
  context.subscriptions.push(
    vscode.commands.registerCommand("liquibase.openCacheFile", async () => {
      await openDocument(cacheHandler.cacheLocation);
    }),
    vscode.commands.registerCommand("liquibase.removeFromCache", async () => {
      await new CacheRemover(cacheHandler).removeFromCache();
    })
  );

  // Command that will be executed when the extension command is triggered
  context.subscriptions.push(
    registerLiquibaseCommand("update", [...generatePropertyFileDialogOptions(true, true)], {
      searchPathRequired: true,
    }),

    registerLiquibaseCommand("drop-all", [
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
      },
    ]),

    registerLiquibaseCommand("validate", [...generatePropertyFileDialogOptions(true, false)], {
      searchPathRequired: true,
    }),

    registerLiquibaseCommand("status", [...generatePropertyFileDialogOptions(true, true)]),

    registerLiquibaseCommand(
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
              title: "The file name where your diff should be written",
              placeHolder: "any file name",
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
      "generate-changelog",
      [
        ...generatePropertyFileDialogOptions(false, false),

        {
          input: new OpenDialog({
            name: folderSelectionName,
            openDialogOptions: {
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
              title: "Choose a File Name",
              placeHolder: "any file name with an extension",
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
              title: "Choose any objects that should be included",
              placeHolder: "The tables for which you want the changelog generated",
              ignoreFocusOut: true,
              validateInput,
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
      "db-doc",
      [
        ...generatePropertyFileDialogOptions(true, false),
        {
          input: new OpenDialog({
            name: folderSelectionName,
            openDialogOptions: {
              canSelectFiles: false,
              canSelectFolders: true,
              canSelectMany: false,
            },
          }),
          cmdArgs: "--output-directory",
        },
      ],
      {
        afterCommandAction: openIndexHtmlAfterCommandExecution,
      }
    ),

    registerLiquibaseCommand("unexpected-changesets", [...generatePropertyFileDialogOptions(true, true)], {
      commandLineArgs: ["--verbose"],
    }),

    registerLiquibaseCommand("changelog-sync", [...generatePropertyFileDialogOptions(true, true)]),

    registerLiquibaseCommand("clear-checksums", [...generatePropertyFileDialogOptions(false, false)]),

    registerLiquibaseCommand(
      "history",
      [
        ...generatePropertyFileDialogOptions(false, false),
        {
          input: new OpenDialog({
            name: folderSelectionName,
            openDialogOptions: {
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
              title: "The file name where your history should be written",
              placeHolder: "any file name with extension",
              value: "history.txt",
            },
          }),
          createCmdArgs: (dialogValues) => generateCommandLineArgs("output-file", dialogValues),
        },
        {
          input: new QuickPick({
            name: "historyFormat",
            title: "Choose the desired history format",
            generateItems: () => [
              {
                label: "TABULAR",
                picked: true,
                detail:
                  "This groups changesets by deployment ID and displays other information in individual table cell.",
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

    registerLiquibaseCommand("tag", [
      ...generatePropertyFileDialogOptions(false, false),
      {
        input: new InputBox({
          name: "tagName",
          inputBoxOptions: {
            title: "Choose a name of new Tag",
          },
        }),
        cmdArgs: "--tag",
      },
    ]),

    registerLiquibaseCommand("tag-exists", [
      ...generatePropertyFileDialogOptions(false, false),
      {
        input: new InputBox({
          name: "tagName",
          inputBoxOptions: {
            title: "Tag to check if it exists",
          },
        }),
        cmdArgs: "--tag",
      },
    ]),

    registerLiquibaseCommand("rollback", [
      ...generatePropertyFileDialogOptions(true, true),
      {
        input: new InputBox({
          name: "tagName",
          inputBoxOptions: {
            title: "Tag to rollback to",
          },
        }),
        cmdArgs: "--tag",
      },
    ]),

    registerLiquibaseCommand(
      "update-sql",
      [
        ...generatePropertyFileDialogOptions(true, true),
        {
          input: new OpenDialog({
            name: folderSelectionName,
            openDialogOptions: {
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
              title: "The file name where your update sql should be written",
              placeHolder: "any filename with extension",
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
 * @param title - the title that should be set in the dialog
 * @returns the pickPanelConfig with all the diff types
 */
function generateDiffTypes(title: string = "Choose any diff types"): PickPanelConfig {
  return {
    input: new QuickPick({
      name: "diffTypes",
      title,
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
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("liquibase.editExistingLiquibaseConfiguration", (uri: vscode.Uri) =>
      editExistingLiquibaseConfiguration(uri, context)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("liquibase.removeExistingConfiguration", async () => removeConfiguration())
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("liquibase.addExistingConfiguration", addExistingLiquibaseConfiguration)
  );

  context.subscriptions.push(
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
