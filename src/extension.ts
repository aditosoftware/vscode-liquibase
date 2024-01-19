import * as vscode from "vscode";
import * as path from "path";
import { prerequisites } from "./prerequisites";
import { getReferenceKeysFromPropertyFile } from "./propertiesToDiff";
import { registerLiquibaseCommand } from "./registerLiquibaseCommand";
import { readContextValues } from "./readChangelogFile";
import { LiquibaseConfigurationPanel } from "./panels/LiquibaseConfigurationPanel";
import { ConfirmationDialog, ConnectionType, DialogValues, InputBox, OpenDialog, QuickPick, REFERENCE_PROPERTY_FILE } from "./input";
import {
  testLiquibaseConfiguration,
  addExistingLiquibaseConfiguration,
  editExistingLiquibaseConfiguration,
  removeExistingLiquibaseConfiguration,
} from "./configurationCommands";
import { fileName, folderSelection, generateCommandLineArgs, openFileAfterCommandExecution } from "./helperCommands";

export const outputStream = vscode.window.createOutputChannel("Liquibase");

export let otherResourcePath: string | undefined; // TODO bessere lösung!

/**
 * Main-Function that will execute all the code within
 * @param context - The context object provided by VSCode to the extension.
 *                  It represents the lifecycle of the extension and can be used
 *                  to store and retrieve global state.
 */
export async function activate(context: vscode.ExtensionContext) {
  // Constructing the path to the resources folder within the extension

  const resourcePath = path.join(context.extensionPath, "src", "resources");
  otherResourcePath = resourcePath;

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
    let updateDisposable = registerLiquibaseCommand(
      "update",
      [
        {
          input: new ConnectionType("propertyFile"),
        },
        {
          input: new QuickPick("context", true, readContextValues),
          cmdArgs: "--contexts",
        },
      ],
      resourcePath
    );

    let dropAllDisposable = registerLiquibaseCommand(
      "drop-all",
      [
        {
          input: new ConnectionType("propertyFile"),
        },
        {
          input: new ConfirmationDialog("Do you really want to execute 'drop-all'?"),
        },
      ],
      resourcePath
    );

    let validateDisposable = registerLiquibaseCommand(
      "validate",
      [
        {
          input: new ConnectionType("propertyFile"),
        },
      ],
      resourcePath
    );

    let statusDisposable = registerLiquibaseCommand(
      "status",
      [
        {
          input: new ConnectionType("propertyFile"),
        },
      ],
      resourcePath
    );

    let diffDisposable = registerLiquibaseCommand(
      "diff",
      [
        {
          input: new ConnectionType("propertyFile"),
        },
        {
          input: new ConnectionType("referencePropertyFile"),
          createCmdArgs: (dialogValues) =>
            getReferenceKeysFromPropertyFile(dialogValues.inputValues.get(REFERENCE_PROPERTY_FILE)?.[0]),
        },
        {
          input: new QuickPick("diffTypes", true, () => diffTypes),
          cmdArgs: "--diff-types",
        },
      ],
      resourcePath
    );

    //TODO: Generate-Changelog -> more steps and user-input
    let generateChangelogDisposable = registerLiquibaseCommand(
      "generate-changelog",
      [
        {
          input: new ConnectionType("propertyFile"),
        },
        {
          input: new OpenDialog(folderSelection, {
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
          }),
          cmdArgs: "--data-output-directory",
        },
        {
          input: new InputBox(fileName, {
            placeHolder: "File Name",
            value: "changelog.xml",
          }),
          createCmdArgs: (dialogValues) => generateCommandLineArgs("changelog-file", dialogValues),
        },
        //  TODO other file endings don't work. Find out why
        // {
        //   input: new QuickPick("possibleFormat", false, () => possibleFormats),
        // },
      ],
      resourcePath,
      [],
      openFileAfterCommandExecution
    );

    let dbdocDisposable = registerLiquibaseCommand(
      "db-doc",
      [
        {
          input: new ConnectionType("propertyFile"),
        },
        {
          input: new OpenDialog("folderSelection", {
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
          }),
          cmdArgs: "--output-directory",
        },
      ],
      resourcePath, [],
      async (dialogValues: DialogValues) => {
        // open the index.html, when the command was finished
        const folder = dialogValues.inputValues.get("folderSelection")?.[0];

        if (folder) {
          const fullPath = path.join(folder, "index.html");
          const uri = vscode.Uri.file(fullPath);
          await vscode.env.openExternal(uri)
        }
      }
    );

    let unexpectedChangesetsDisposable = registerLiquibaseCommand(
      "unexpected-changesets",
      [
        {
          input: new ConnectionType("propertyFile"),
        },
      ],
      resourcePath,
      ["--verbose"]
    );

    let changelogSyncDisposable = registerLiquibaseCommand(
      "changelog-sync",
      [
        {
          input: new ConnectionType("propertyFile"),
        },
      ],
      resourcePath
    );

    let clearChecksumsDisposable = registerLiquibaseCommand(
      "clear-checksums",
      [
        {
          input: new ConnectionType("propertyFile"),
        },
      ],
      resourcePath
    );

    let historyDisposable = registerLiquibaseCommand(
      "history",
      [
        {
          input: new ConnectionType("propertyFile"),
        },
        {
          input: new OpenDialog(folderSelection, {
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
          }),
        },
        {
          input: new InputBox(fileName,
            {
              title: "The file name where your history should be written",
              value: "history.txt"
            }
          ),
          createCmdArgs: (dialogValues) => generateCommandLineArgs("output-file", dialogValues),
        },
        {
          input: new QuickPick("historyFormat", false, () => [
            { label: "TABULAR", picked: true, detail: "This groups changesets by deployment ID and displays other information in individual table cell." },
            { label: "TEXT", detail: "This displays the output as plain text." },
          ]),
          cmdArgs: "--format",
        }
      ],
      resourcePath,
      [],
      openFileAfterCommandExecution
    );

    let tagDisposable = registerLiquibaseCommand(
      "tag",
      [
        {
          input: new ConnectionType("propertyFile"),
        },
        {
          input: new InputBox("tagName", "Name of the Tag"),
          cmdArgs: "--tag",
        },
      ],
      resourcePath
    );

    let tagExistsDisposable = registerLiquibaseCommand(
      "tag-exists",
      [
        {
          input: new ConnectionType("propertyFile"),
        },
        {
          input: new InputBox("tagName", "Tag to check if it exists"),
          cmdArgs: "--tag",
        },
      ],
      resourcePath
    );

    let rollbackDisposable = registerLiquibaseCommand(
      "rollback",
      [
        {
          input: new ConnectionType("propertyFile"),
        },
        {
          input: new InputBox("tagName", "Tag to rollback to"),
          cmdArgs: "--tag",
        },
      ],
      resourcePath
    );

    let updateSQLDisposable = registerLiquibaseCommand(
      "update-sql",
      [
        {
          input: new ConnectionType("propertyFile"),
        },
        {
          input: new OpenDialog(folderSelection, {
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
          }),
        },
        {
          input: new InputBox(fileName,
            {
              title: "The file name where your update sql should be written",
              value: "update-sql.sql"
            }
          ),
          createCmdArgs: (dialogValues) => generateCommandLineArgs("output-file", dialogValues),
        }
      ],
      resourcePath,
      [],
      openFileAfterCommandExecution
    );

    // Add the disposables to subscriptions for cleanup on extension deactivation
    context.subscriptions.push(
      updateDisposable,
      dropAllDisposable,
      validateDisposable,
      statusDisposable,
      diffDisposable,
      generateChangelogDisposable,
      dbdocDisposable,
      unexpectedChangesetsDisposable,
      changelogSyncDisposable,
      clearChecksumsDisposable,
      historyDisposable,
      tagDisposable,
      tagExistsDisposable,
      rollbackDisposable,
      updateSQLDisposable,
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

  context.subscriptions.push(
    vscode.commands.registerCommand("liquibase.testConfiguration", testLiquibaseConfiguration)
  );
}

/**
 * Shutting down the client. This function is called when the extension is deactivated.
 */
export function deactivate() {
  console.log("Extension deactivated.");
}
