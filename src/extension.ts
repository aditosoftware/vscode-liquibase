import * as vscode from "vscode";
import * as path from "path";
import { loadItemsFromJson } from "./loadItemsFromJson";
import { prerequisites } from "./prerequisites";
import { getReferenceKeysFromPropertyFile } from "./propertiesToDiff";
import {
  InputType,
  getResultValue,
  registerLiquibaseCommand,
} from "./registerLiquibaseCommand";
import { readContextValues } from "./readChangelogFile";
import { LiquibaseConfigurationPanel } from "./panels/LiquibaseConfigurationPanel";
import {
  testLiquibaseConfiguration,
  addExistingLiquibaseConfiguration,
  editExistingLiquibaseConfiguration,
  removeExistingLiquibaseConfiguration,
} from "./configurationCommands";

export const outputStream = vscode.window.createOutputChannel("Liquibase");

/**
 * Main-Function that will execute all the code within
 * @param context - The context object provided by VSCode to the extension.
 *                  It represents the lifecycle of the extension and can be used
 *                  to store and retrieve global state.
 */
export async function activate(context: vscode.ExtensionContext) {

  // Constructing the path to the resources folder within the extension
  const resourcePath = path.join(context.extensionPath, "src", "resources");

  // Paths to JSON files and Liquibase changelog directory
  const jsonFileSystem = path.join(resourcePath, "dropdownSystems.json"); //TODO: read the system in real world use-case (pending on Ramona's impl) and maybe fallback?

  // Load items from JSON files
  const systems: vscode.QuickPickItem[] = loadItemsFromJson(jsonFileSystem);

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
    registerCommandsForLiquibasePropertiesHandling(context);
    // Command that will be executed when the extension command is triggered
    let updateDisposable = registerLiquibaseCommand(
      "update",
      [
        {
          panelType: InputType.ConnectionType,
          items: systems,
          resultShouldBeExposed: true,
        }, //systems
        {
          panelType: InputType.QuickPick,
          items: () => readContextValues(getResultValue("path")),
          allowMultiple: true,
          cmdArgs: "--contexts",
        }, //context
      ],
      resourcePath
    );

    //TODO: fertig implementieren
    let updateRCMDisposable = registerLiquibaseCommand(
      "updateRCM",
      [
        {
          panelType: InputType.ConnectionType,
          items: systems,
        }, //systems
        {
          panelType: InputType.QuickPick,
          items: () => readContextValues(""), //TODO: finde den richtigen Path zur selektierten Datei in der "Preview"
          allowMultiple: true,
          cmdArgs: "--contexts",
        }, //context
      ],
      resourcePath,
      [],
      undefined,
      true,
      true
    );

    let dropAllDisposable = registerLiquibaseCommand(
      "drop-all",
      [
        { 
          panelType: InputType.ConnectionType, 
          items: systems 
        },
        {
          panelType: InputType.ConfirmationDialog,
          items: "Do you really want to execute 'drop-all'?",
        },
      ],
      resourcePath
    );

    let validateDisposable = registerLiquibaseCommand(
      "validate",
      [{ panelType: InputType.ConnectionType, items: systems }],
      resourcePath
    );

    let statusDisposable = registerLiquibaseCommand(
      "status",
      [{ panelType: InputType.ConnectionType, items: systems }],
      resourcePath
    );

    let diffDisposable = registerLiquibaseCommand(
      "diff",
      [
        { panelType: InputType.ConnectionType, items: systems },
        { panelType: InputType.QuickPick, items: systems, resultShouldBeExposed: true},
        { panelType: InputType.QuickPick, items: diffTypes, allowMultiple: true, cmdArgs: "--diff-types" }
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
          panelType: InputType.ConnectionType,
          items: systems,
        },
        {
          panelType: InputType.OpenDialog,
          items: {
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
          },
          resultShouldBeExposed: true,
        },
        {
          panelType: InputType.InputBox,
          items: {
            title: "File Name",
            value: "changelog",
          },
          cmdArgs: "--data-output-directory",
        },
        {
          panelType: InputType.QuickPick,
          items: possibleFormats,
        },
      ],
      resourcePath,
      []
    );

    let dbdocDisposable = registerLiquibaseCommand(
      "db-doc",
      [
        {
          panelType: InputType.ConnectionType,
          items: systems,
        },
        {
          panelType: InputType.OpenDialog,
          items: {
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
          },
          cmdArgs: "--output-directory",
        },
      ],
      resourcePath
    );

    let unexpectedChangesetsDisposable = registerLiquibaseCommand(
      "unexpected-changesets",
      [
        {
          panelType: InputType.ConnectionType,
          items: systems,
        },
      ],
      resourcePath,
      ["--verbose"]
    );

    let changelogSyncDisposable = registerLiquibaseCommand(
      "changelog-sync",
      [
        {
          panelType: InputType.ConnectionType,
          items: systems,
        },
      ],
      resourcePath
    );

    let clearChecksumsDisposable = registerLiquibaseCommand(
      "clear-checksums",
      [
        {
          panelType: InputType.ConnectionType,
          items: systems,
        },
      ],
      resourcePath
    );

    let historyDisposable = registerLiquibaseCommand(
      "history",
      [
        {
          panelType: InputType.ConnectionType,
          items: systems,
        },
      ],
      resourcePath
    );

    let tagDisposable = registerLiquibaseCommand(
      "tag",
      [
        {
          panelType: InputType.ConnectionType,
          items: systems,
        },
        {
          panelType: InputType.InputBox,
          items: {
            title: "Tag",
          },
          cmdArgs: "--tag",
        },
      ],
      resourcePath
    );

    let tagExistsDisposable = registerLiquibaseCommand(
      "tag-exists",
      [
        {
          panelType: InputType.ConnectionType,
          items: systems,
        },
        {
          panelType: InputType.InputBox,
          items: {
            title: "Tag to check if it exists",
          },
          cmdArgs: "--tag",
        },
      ],
      resourcePath
    );

    let rollbackDisposable = registerLiquibaseCommand(
      "rollback",
      [
        {
          panelType: InputType.ConnectionType,
          items: systems,
        },
        {
          panelType: InputType.InputBox,
          items: {
            title: "Tag to rollback to",
          },
          cmdArgs: "--tag",
        },
      ],
      resourcePath
    );

    let updateSQLDisposable = registerLiquibaseCommand(
      "update-sql",
      [
        {
          panelType: InputType.ConnectionType,
          items: systems,
        },
        {
          panelType: InputType.OpenDialog,
          items: {
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
          },
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
