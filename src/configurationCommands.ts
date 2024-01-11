import * as vscode from "vscode";
import {
  addToLiquibaseConfiguration,
  readLiquibaseConfigurationNames,
  testLiquibaseConnection,
} from "./liquibaseConfiguration";

/**
 * Tests an liquibase configuration.
 *
 * The user need to select any existing configuration.
 */
export async function testLiquibaseConfiguration(): Promise<void> {
  const configurationNames: string[] | undefined = await readLiquibaseConfigurationNames();
  if (configurationNames && configurationNames.length !== 0) {
    const result: string | undefined = await vscode.window.showQuickPick(configurationNames, {
      title: "Select any configuration you wish to be tested",
      placeHolder: "Pick your desired connection",
    });

    if (result) {
      testLiquibaseConnection(result);
    }
  } else {
    vscode.window.showErrorMessage("No configurations found");
  }
}

/**
 * Adds an existing liquibase configuration to the settings.
 *
 * The user needs to input the name and select any `.properties` file.
 */
export async function addExistingLiquibaseConfiguration(): Promise<void> {
  // TODO include in fadlers logic

  const name = await vscode.window.showInputBox({
    title: "the unique name for your configuration",
  });
  if (name) {
    const location = await vscode.window.showOpenDialog({
      title: "Location of your existing liquibase.properties file",
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: {
        "Liquibase Properties": ["properties"],
      },
    });

    if (location && location[0]) {
      addToLiquibaseConfiguration(name, location[0].fsPath);
    }
  }
}
