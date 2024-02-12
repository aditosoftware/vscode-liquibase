import * as vscode from "vscode";
import * as path from "path";
import { prerequisites } from "./prerequisites";
import { getReferenceKeysFromPropertyFile } from "./propertiesToDiff";
import { PickPanelConfig, registerLiquibaseCommand } from "./registerLiquibaseCommand";
import { isExtraQueryForChangelogNeeded, setExtraChangelogCorrectly } from "./readChangelogFile";
import { LiquibaseConfigurationPanel } from "./panels/LiquibaseConfigurationPanel";
import {
  ConfirmationDialog,
  ConnectionType,
  DialogValues,
  InputBox,
  OpenDialog,
  PROPERTY_FILE,
  QuickPick,
  REFERENCE_PROPERTY_FILE,
} from "./input";
import * as os from "os";
import {
  addExistingLiquibaseConfiguration,
  editExistingLiquibaseConfiguration,
  removeExistingLiquibaseConfiguration,
} from "./settings/configurationCommands";
import {
  fileName,
  generateCommandLineArgs,
  openFileAfterCommandExecution,
  openIndexHtmlAfterCommandExecution,
} from "./liquibaseCommandsUtilities";
import * as fs from "fs";
import { Logger } from "./logging/Logger";
import { readUrl } from "./configuration/data/readFromProperties";
import { openDocument } from "./utilities/vscodeUtilities";
import { removeFromCache } from "./cache/removeFromCache";
import { generateContextInputs } from "./handleContexts";

/**
 * The path where all resources (jars) are located from the extension.
 */
export let resourcePath: string;

/**
 * Internal resources folder inside the extension.
 */
export let libFolder: string;

/**
 * The location where the cache iss located. This will be inside the resourcePath in a json file.
 */
export let cacheLocation: string;

export let magic = 1;

/**
 * Main-Function that will execute all the code within
 * @param context - The context object provided by VSCode to the extension.
 *                  It represents the lifecycle of the extension and can be used
 *                  to store and retrieve global state.
 */
export async function activate(context: vscode.ExtensionContext) {
  magic = 42;

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

  // construct the cache location
  cacheLocation = path.join(resourcePath, "cache.json");

  // the folder, where additional libraries are included
  libFolder = path.join(context.extensionPath, "lib");

  // initialize the logger
  Logger.initializeLogger(context, "Liquibase");

  // Perform any necessary prerequisites setup before executing the extension logic
  prerequisites(context, resourcePath).then(() => {
    // Register all commands that are needed for handling liquibase properties
    registerCommandsForLiquibasePropertiesHandling(context);

    // Register all commands that are used for showing/deleting the cache
    context.subscriptions.push(
      vscode.commands.registerCommand("liquibase.openCacheFile", () => {
        openDocument(cacheLocation);
      }),
      vscode.commands.registerCommand("liquibase.removeFromCache", async () => {
        removeFromCache();
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
          input: new ConfirmationDialog(
            "Do you really want to execute 'drop-all'?",
            (dialogValues: DialogValues) => {
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
            "Drop-all"
          ),
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
            input: new ConnectionType("referencePropertyFile"),
            createCmdArgs: (dialogValues) =>
              getReferenceKeysFromPropertyFile(dialogValues.inputValues.get(REFERENCE_PROPERTY_FILE)?.[0]),
          },
          {
            input: new OpenDialog({
              canSelectFiles: false,
              canSelectFolders: true,
              canSelectMany: false,
            }),
          },
          // TODO format parameter can be there to create diff as json. Include?
          {
            input: new InputBox(fileName, {
              title: "The file name where your diff should be written",
              placeHolder: "any file name",
              value: "diff.txt",
            }),
            createCmdArgs: (dialogValues) => generateCommandLineArgs("output-file", dialogValues),
          },
          {
            input: new QuickPick(
              "diffTypes",
              "Choose any diff types",
              //all possible diffTypes for the diff dialog
              //TODO: maybe all descriptions should say something useful?
              () => [
                { label: "catalogs", description: "" },
                { label: "tables", description: "default", picked: true },
                { label: "functions", description: "" },
                { label: "views", description: "default", picked: true },
                { label: "columns", description: "default", picked: true },
                { label: "indexes", description: "default", picked: true },
                { label: "foreignkeys", description: "default", picked: true },
                { label: "primarykeys", description: "default", picked: true },
                { label: "uniqueconstraints", description: "default", picked: true },
                { label: "data", description: "" },
                { label: "storedprocedures", description: "" },
                { label: "triggers", description: "" },
                { label: "sequences", description: "" },
                { label: "databasepackage", description: "" },
                { label: "databasepackagebody", description: "" },
              ],
              true
            ),
            cmdArgs: "--diff-types",
          },
        ],
        {
          afterCommandAction: openFileAfterCommandExecution,
        }
      ),

      //TODO: Generate-Changelog -> more steps and user-input
      registerLiquibaseCommand(
        "generate-changelog",
        [
          ...generatePropertyFileDialogOptions(true, false),
          // This needs a separate context query, because it is only used for generating new files and not getting old files
          // FIXME: better context handling at generate-changelog!!!!
          // {
          //   input: new InputBox("context", {
          //     title: "The context all the changelogs should get",
          //     value: " ", // TODO empty value gets cancelled. How to improve?
          //   }),
          //   cmdArgs: "--context-filter",
          // },
          {
            input: new OpenDialog({
              canSelectFiles: false,
              canSelectFolders: true,
              canSelectMany: false,
            }),
            cmdArgs: "--data-output-directory",
          },
          {
            input: new InputBox(fileName, {
              title: "Choose a File Name",
              placeHolder: "any file name with an extension",
              value: "changelog.xml",
            }),
            createCmdArgs: (dialogValues) => generateCommandLineArgs("changelog-file", dialogValues),
          },
          //  TODO other file endings except xml don't work. Find out why
          // {
          //   input: new QuickPick("possibleFormat", false, () => [
          //   { label: "xml" },
          //   { label: "json" },
          //   { label: "yaml" },
          //   { label: "yml" },
          // ];),
          // },
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
              canSelectFiles: false,
              canSelectFolders: true,
              canSelectMany: false,
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
              canSelectFiles: false,
              canSelectFolders: true,
              canSelectMany: false,
            }),
          },
          {
            input: new InputBox(fileName, {
              title: "The file name where your history should be written",
              placeHolder: "any file name with extension",
              value: "history.txt",
            }),
            createCmdArgs: (dialogValues) => generateCommandLineArgs("output-file", dialogValues),
          },
          {
            input: new QuickPick("historyFormat", "Choose the desired history format", () => [
              {
                label: "TABULAR",
                picked: true,
                detail:
                  "This groups changesets by deployment ID and displays other information in individual table cell.",
              },
              { label: "TEXT", detail: "This displays the output as plain text." },
            ]),
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
          input: new InputBox("tagName", {
            title: "Choose a name of new Tag",
          }),
          cmdArgs: "--tag",
        },
      ]),

      registerLiquibaseCommand("tag-exists", [
        ...generatePropertyFileDialogOptions(false, false),
        {
          input: new InputBox("tagName", {
            title: "Tag to check if it exists",
          }),
          cmdArgs: "--tag",
        },
      ]),

      registerLiquibaseCommand("rollback", [
        ...generatePropertyFileDialogOptions(true, true),
        {
          input: new InputBox("tagName", {
            title: "Tag to rollback to",
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
              canSelectFiles: false,
              canSelectFolders: true,
              canSelectMany: false,
            }),
          },
          {
            input: new InputBox(fileName, {
              title: "The file name where your update sql should be written",
              placeHolder: "any filename with extension",
              value: "update-sql.sql",
            }),
            createCmdArgs: (dialogValues) => generateCommandLineArgs("output-file", dialogValues),
          },
        ],
        {
          afterCommandAction: openFileAfterCommandExecution,
        }
      )
    );
  });
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
      input: new ConnectionType("propertyFile"),
    },
  ];

  if (changelogNeeded) {
    inputConfigs.push({
      input: new OpenDialog(
        {
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          filters: {
            Changelog: ["xml", "json", "yaml", "yml"],
          },
        },
        "changelog",
        isExtraQueryForChangelogNeeded,
        setExtraChangelogCorrectly
      ),
    });
  }

  if (contextNeeded) {
    inputConfigs.push(...generateContextInputs());
  }

  return inputConfigs;
}

/**
 * Registers all the commands that are needed by liquibase properties handling
 * @param context - the Context for storing the commands
 */
function registerCommandsForLiquibasePropertiesHandling(context: vscode.ExtensionContext) {
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
    vscode.commands.registerCommand("liquibase.removeExistingConfiguration", removeExistingLiquibaseConfiguration)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("liquibase.addExistingConfiguration", addExistingLiquibaseConfiguration)
  );
}

/**
 * Shutting down the client. This function is called when the extension is deactivated.
 */
export function deactivate() {
  Logger.end();
}
