import * as vscode from "vscode";
import * as path from "path";
import { prerequisites } from "./prerequisites";
import { getReferenceKeysFromPropertyFile } from "./propertiesToDiff";
import { registerLiquibaseCommand } from "./registerLiquibaseCommand";
import { readContextValues } from "./readChangelogFile";
import { LiquibaseConfigurationPanel } from "./panels/LiquibaseConfigurationPanel";
import { ConfirmationDialog, ConnectionType, InputBox, OpenDialog, QuickPick, REFERENCE_PROPERTY_FILE } from "./input";
import {
  addExistingLiquibaseConfiguration,
  editExistingLiquibaseConfiguration,
  removeExistingLiquibaseConfiguration,
} from "./configurationCommands";
import {
  fileName,
  generateCommandLineArgs,
  openFileAfterCommandExecution,
  openIndexHtmlAfterCommandExecution,
} from "./helperCommands";

export const outputStream = vscode.window.createOutputChannel("Liquibase");

/**
 * The path where all resources (jars) are located from the extension.
 */
export let resourcePath: string;

/**
 * Main-Function that will execute all the code within
 * @param context - The context object provided by VSCode to the extension.
 *                  It represents the lifecycle of the extension and can be used
 *                  to store and retrieve global state.
 */
export async function activate(context: vscode.ExtensionContext) {
  // Constructing the path to the resources folder within the extension

  resourcePath = path.join(context.extensionPath, "src", "resources");

  // TODO remove when no longer needed
  const possibleFormats: vscode.QuickPickItem[] = [
    { label: "xml" },
    { label: "json" },
    { label: "yaml" },
    { label: "yml" },
  ];

  //all possible diffTypes for the diff dialog
  //TODO: maybe all descriptions should say something useful?
  const diffTypes: vscode.QuickPickItem[] = [
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
  ];

  // Perform any necessary prerequisites setup before executing the extension logic
  prerequisites(context, resourcePath).then(() => {
    // Register all commands that are needed for handling liquibase properties
    registerCommandsForLiquibasePropertiesHandling(context);

    // Command that will be executed when the extension command is triggered
    context.subscriptions.push(
      registerLiquibaseCommand("update", [
        {
          input: new ConnectionType("propertyFile"),
        },
        {
          input: new QuickPick("context", "Choose any context", true, readContextValues),
          cmdArgs: "--contexts",
        },
      ]),

      registerLiquibaseCommand(
        "drop-all",
        [
          {
            input: new ConnectionType("propertyFile"),
          },
          {
            input: new ConfirmationDialog("Do you really want to execute 'drop-all'?"),
          },
        ],
        {
          changelogPathIgnored: true,
        }
      ),

      registerLiquibaseCommand("validate", [
        {
          input: new ConnectionType("propertyFile"),
        },
      ]),

      registerLiquibaseCommand("status", [
        {
          input: new ConnectionType("propertyFile"),
        },
      ]),

      registerLiquibaseCommand("diff", [
        {
          input: new ConnectionType("propertyFile"),
        },
        {
          input: new ConnectionType("referencePropertyFile"),
          createCmdArgs: (dialogValues) =>
            getReferenceKeysFromPropertyFile(dialogValues.inputValues.get(REFERENCE_PROPERTY_FILE)?.[0]),
        },
        {
          input: new QuickPick("diffTypes", "Choose any diff types", true, () => diffTypes),
          cmdArgs: "--diff-types",
        },
      ]),

      //TODO: Generate-Changelog -> more steps and user-input
      registerLiquibaseCommand(
        "generate-changelog",
        [
          {
            input: new ConnectionType("propertyFile"),
          },
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
          //   input: new QuickPick("possibleFormat", false, () => possibleFormats),
          // },
        ],
        {
          afterCommandAction: openFileAfterCommandExecution,
        }
      ),

      registerLiquibaseCommand(
        "db-doc",
        [
          {
            input: new ConnectionType("propertyFile"),
          },
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

      registerLiquibaseCommand(
        "unexpected-changesets",
        [
          {
            input: new ConnectionType("propertyFile"),
          },
        ],
        {
          commandLineArgs: ["--verbose"],
        }
      ),

      registerLiquibaseCommand("changelog-sync", [
        {
          input: new ConnectionType("propertyFile"),
        },
      ]),

      registerLiquibaseCommand("clear-checksums", [
        {
          input: new ConnectionType("propertyFile"),
        },
      ]),

      registerLiquibaseCommand(
        "history",
        [
          {
            input: new ConnectionType("propertyFile"),
          },
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
            input: new QuickPick("historyFormat", "Choose the desired history format", false, () => [
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
        {
          input: new ConnectionType("propertyFile"),
        },
        {
          input: new InputBox("tagName", {
            title: "Choose a name of new Tag",
          }),
          cmdArgs: "--tag",
        },
      ]),

      registerLiquibaseCommand("tag-exists", [
        {
          input: new ConnectionType("propertyFile"),
        },
        {
          input: new InputBox("tagName", {
            title: "Tag to check if it exists",
          }),
          cmdArgs: "--tag",
        },
      ]),

      registerLiquibaseCommand("rollback", [
        {
          input: new ConnectionType("propertyFile"),
        },
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
          {
            input: new ConnectionType("propertyFile"),
          },
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
  console.log("Extension deactivated.");
}
