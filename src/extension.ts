import * as vscode from "vscode";
import {
  addToLiquibaseConfiguration,
  readLiquibaseConfigurationNames,
  testLiquibaseConnection,
} from "./liquibaseConfiguration";
import { StepOption, StepResults, multiStepInput } from "./multiStepInput";
import { LiquibaseConfigurationPanel } from "./panels/LiquibaseConfigurationPanel";

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
    vscode.commands.registerCommand("liquibase.addExistingConfiguration", async () => {
      const name = "name";
      const path = "path";

      const options: StepOption[] = [
        {
          key: name,
          inputBoxOption: { prompt: "The name of the configuration" },
        },
        {
          key: path,
          inputBoxOption: { prompt: "The path of the configuration" },
        },
      ];
      multiStepInput("Add existing liquibase configuration", options).then((results: StepResults | undefined) => {
        if (results) {
          addToLiquibaseConfiguration(results[name], results[path]);
        }
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("liquibase.testConfiguration", async () => {
      const configurationNames: string[] = readLiquibaseConfigurationNames();

      const result: string | undefined = await vscode.window.showQuickPick(configurationNames);

      if (result) {
        testLiquibaseConnection(result);
      }
    })
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
