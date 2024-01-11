import * as vscode from "vscode";
import { LiquibaseConfigurationPanel } from "./panels/LiquibaseConfigurationPanel";
import {
  testLiquibaseConfiguration,
  addExistingLiquibaseConfiguration,
  editExistingLiquibaseConfiguration,
} from "./configurationCommands";

export function activate(context: vscode.ExtensionContext) {
  registerCommandsForLiquibasePropertiesHandling(context);
}

// FIXME Next Steps
// TODO Duplicate name check
// * edit existing -> file selection !
// * Download the needed driver files
// * Graphic dialog for creating the properties
// * error handling
// * validating uniqueness of keys of properties files
// * Tests

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
    vscode.commands.registerCommand("liquibase.addExistingConfiguration", addExistingLiquibaseConfiguration)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("liquibase.testConfiguration", testLiquibaseConfiguration)
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
