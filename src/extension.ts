import * as vscode from "vscode";
import { LiquibaseConfigurationPanel } from "./panels/LiquibaseConfigurationPanel";
import {
  testLiquibaseConfiguration,
  addExistingLiquibaseConfiguration,
  editExistingLiquibaseConfiguration,
  removeExistingLiquibaseConfiguration,
} from "./configurationCommands";

export function activate(context: vscode.ExtensionContext) {
  registerCommandsForLiquibasePropertiesHandling(context);
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

// This method is called when your extension is deactivated
export function deactivate() {}
