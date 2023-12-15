import * as vscode from "vscode";
import {
  addToLiquibaseConfiguration,
  createLiquibaseProperties,
  liquibasePath,
  readLiquibaseConfigurationNames,
  testLiquibaseConnection,
} from "./liquibaseConfiguration";
import { StepOption, StepResults, multiStepInput } from "./multiStepInput";

export function activate(context: vscode.ExtensionContext) {
  registerCommandsForLiquibasePropertiesHandling(context);
}

// FIXME Next Steps
// * Download the needed driver files
// * Graphic dialog for creating the properties
// * error handling
// * validating uniqueness of keys of properties files
// * Tests

/**
 * Registers all the commands that are needed by liquibase properties handling
 * @param context the Context for storing the commands
 */
function registerCommandsForLiquibasePropertiesHandling(
  context: vscode.ExtensionContext
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "liquibase.createLiquibaseConfiguration",
      async () => {
        const options: StepOption[] = [
          {
            key: "name",
            inputBoxOption: {
              prompt: "The unique name for this configuration",
            },
          },
          {
            key: "url",
            inputBoxOption: {
              prompt: "The JDBC url of the database",
            },
          },
          {
            key: "username",
            inputBoxOption: {
              prompt: "The user of the database url",
            },
          },
          {
            key: "password",
            inputBoxOption: {
              prompt: "The password of the database url",
              password: true,
            },
          },
          {
            key: "driver",
            inputBoxOption: {
              prompt: "The driver class of database",
            },
          },
          {
            key: "classpath",
            inputBoxOption: {
              prompt: "The path to the driver",
            },
          },
          {
            key: liquibasePath,
            inputBoxOption: {
              prompt: "The place where to save the liquibase.properties file",
            },
          },
        ];
        multiStepInput("Create a new liquibase.properties file", options).then(
          (results: StepResults | undefined) => {
            if (results) {
              createLiquibaseProperties(results);
            }
          }
        );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "liquibase.addExistingConfiguration",
      async () => {
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
        multiStepInput("Add existing liquibase configuration", options).then(
          (results: StepResults | undefined) => {
            if (results) {
              addToLiquibaseConfiguration(results[name], results[path]);
            }
          }
        );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("liquibase.testConfiguration", async () => {
      const configurationNames: string[] = readLiquibaseConfigurationNames();

      const result: string | undefined = await vscode.window.showQuickPick(
        configurationNames
      );

      if (result) {
        testLiquibaseConnection(result);
      }
    })
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
