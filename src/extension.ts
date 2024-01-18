import * as vscode from "vscode";
import * as path from "path";
import { prerequisites } from "./prerequisites";
import { getReferenceKeysFromPropertyFile } from "./propertiesToDiff";
import { propertyFilePath, registerLiquibaseCommand } from "./registerLiquibaseCommand";
import { readContextValues } from "./readChangelogFile";
import { LiquibaseConfigurationPanel } from "./panels/LiquibaseConfigurationPanel";
import { ConfirmationDialog, ConnectionType, InputBox, OpenDialog, QuickPick } from "./input";
import {
  testLiquibaseConfiguration,
  addExistingLiquibaseConfiguration,
  editExistingLiquibaseConfiguration,
  removeExistingLiquibaseConfiguration,
} from "./configurationCommands";

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

  const possibleFormats: vscode.QuickPickItem[] = [
    { label: "XML", description: "xml" },
    { label: "JSON", description: "json" },
    { label: "YAML", description: "yaml" },
    { label: "YML", description: "yml" },
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
        // system selection
        {
          input: new ConnectionType(),
          resultShouldBeExposed: true,
        },
        // contexts
        {
          input: new QuickPick(true, () => readContextValues(propertyFilePath)),
          cmdArgs: "--contexts",
        },
      ],
      resourcePath
    );

    //TODO: fertig implementieren
    let updateRCMDisposable = registerLiquibaseCommand(
      "updateRCM",
      [
        {
          input: new ConnectionType(),
        },
        {
          input: new QuickPick(true, () => readContextValues("")), //TODO: finde den richtigen Path zur selektierten Datei in der "Preview"
          cmdArgs: "--contexts",
        }, //context
      ],
      resourcePath,
      [],
      true,
      true
    );

    let dropAllDisposable = registerLiquibaseCommand(
      "drop-all",
      [
        {
          input: new ConnectionType(),
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
          input: new ConnectionType(),
        },
      ],
      resourcePath
    );

    let statusDisposable = registerLiquibaseCommand(
      "status",
      [
        {
          input: new ConnectionType(),
        },
      ],
      resourcePath
    );

    let diffDisposable = registerLiquibaseCommand(
      "diff",
      [
        {
          input: new ConnectionType(),
        },
        {
          input: new ConnectionType(), // TODO correct? hier war allowMultiple????
          resultShouldBeExposed: true,
        },
        {
          input: new QuickPick(true, () => diffTypes),
          cmdArgs: "--diff-types",
        },
      ],
      resourcePath,
      getReferenceKeysFromPropertyFile(
        path.join(resourcePath, ".liquibase", "liquibase2.properties") //TODO: change to dynamic
      )
    );

    //TODO: Generate-Changelog -> more steps and user-input
    // this may not work atm!
    let generateChangelogDisposable = registerLiquibaseCommand(
      "generate-changelog",
      [
        {
          input: new ConnectionType(),
        },
        {
          input: new OpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
          }),
          resultShouldBeExposed: true,
        },
        {
          input: new InputBox({
            placeHolder: "File Name",
            value: "changelog",
          }),
          cmdArgs: "--data-output-directory",
        },
        {
          input: new QuickPick(false, () => possibleFormats),
        },
      ],
      resourcePath,
      []
    );

    let dbdocDisposable = registerLiquibaseCommand(
      "db-doc",
      [
        {
          input: new ConnectionType(),
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
      resourcePath
    );

    let unexpectedChangesetsDisposable = registerLiquibaseCommand(
      "unexpected-changesets",
      [
        {
          input: new ConnectionType(),
        },
      ],
      resourcePath,
      ["--verbose"]
    );

    let changelogSyncDisposable = registerLiquibaseCommand(
      "changelog-sync",
      [
        {
          input: new ConnectionType(),
        },
      ],
      resourcePath
    );

    let clearChecksumsDisposable = registerLiquibaseCommand(
      "clear-checksums",
      [
        {
          input: new ConnectionType(),
        },
      ],
      resourcePath
    );

    let historyDisposable = registerLiquibaseCommand(
      "history",
      [
        {
          input: new ConnectionType(),
        },
      ],
      resourcePath
    );

    let tagDisposable = registerLiquibaseCommand(
      "tag",
      [
        {
          input: new ConnectionType(),
        },
        {
          input: new InputBox("Name of the Tag"),
          cmdArgs: "--tag",
        },
      ],
      resourcePath
    );

    let tagExistsDisposable = registerLiquibaseCommand(
      "tag-exists",
      [
        {
          input: new ConnectionType(),
        },
        {
          input: new InputBox("Tag to check if it exists"),
          cmdArgs: "--tag",
        },
      ],
      resourcePath
    );

    let rollbackDisposable = registerLiquibaseCommand(
      "rollback",
      [
        {
          input: new ConnectionType(),
        },
        {
          input: new InputBox("Tag to rollback to"),
          cmdArgs: "--tag",
        },
      ],
      resourcePath
    );

    let updateSQLDisposable = registerLiquibaseCommand(
      "update-sql",
      [
        {
          input: new ConnectionType(),
        },
        {
          input: new OpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
          }),
          cmdArgs: "--output-file",
        },
      ],
      resourcePath
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
      updateRCMDisposable
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
