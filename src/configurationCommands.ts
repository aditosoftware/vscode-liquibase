import * as vscode from "vscode";
import {
  addToLiquibaseConfiguration,
  getPathOfConfiguration,
  readLiquibaseConfigurationNames,
  testLiquibaseConnection,
} from "./configuration/crud/liquibaseConfiguration";
import { LiquibaseConfigurationPanel } from "./panels/LiquibaseConfigurationPanel";
import { isWindows } from "./utilities/osUtilities";
import { LiquibaseConfigurationData } from "./configuration/data/LiquibaseConfigurationData";
import * as path from "path";
import { getDefaultDatabaseForConfiguration } from "./handleLiquibaseSettings";

/**
 * Tests an liquibase configuration.
 *
 * The user need to select any existing configuration.
 */
export async function testLiquibaseConfiguration(): Promise<void> {
  const result = await selectFromExistingConfigurations();

  if (result) {
    testLiquibaseConnection(result);
  }
}

/**
 * Edits an existing configuration.
 * @param context - the ExtensionContext. This is needed for opening the webview for editing the context
 */
export async function editExistingLiquibaseConfiguration(uri: vscode.Uri, context: vscode.ExtensionContext) {
  let existingConfiguration:
    | {
        fsPath: string;
        name: string;
      }
    | undefined;

  if (uri) {
    // called by context menu - find out name based on the path
    const fsPath = uri.fsPath;
    // file name with extension
    const fileName = path.basename(fsPath);
    // first part of name, if the name has at least 2 dots, otherwise full name
    const name =
      fileName.indexOf(".") !== fileName.lastIndexOf(".") ? fileName.substring(0, fileName.indexOf(".")) : fileName;
    existingConfiguration = { fsPath, name };
  } else {
    // invoked via command palette - show inputs for user
    // let the user select configuration
    const name = await selectFromExistingConfigurations();

    if (name) {
      // finds the path to the name
      const fsPath = await getPathOfConfiguration(name);
      if (fsPath) {
        existingConfiguration = { fsPath, name };
      }
    }
  }

  if (existingConfiguration) {
    // transferring the data from .properties into an object
    const data = LiquibaseConfigurationData.createFromFile(
      existingConfiguration.name,
      existingConfiguration.fsPath,
      getDefaultDatabaseForConfiguration(),
      isWindows()
    );
    // and renders the panel with the data
    LiquibaseConfigurationPanel.render(context.extensionUri, data);
  }
}

/**
 * Shows an input that lets the user select any of the configured configurations.
 * @returns the selected configuration
 */
async function selectFromExistingConfigurations() {
  const configurationNames: string[] | undefined = await readLiquibaseConfigurationNames();
  if (configurationNames && configurationNames.length !== 0) {
    const result: string | undefined = await vscode.window.showQuickPick(configurationNames, {
      title: "Select any configuration you wish to be tested",
      placeHolder: "Pick your desired connection",
    });

    if (result) {
      return result;
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
