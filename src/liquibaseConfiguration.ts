import * as vscode from "vscode";
import { StepResults } from "./multiStepInput";
import { PropertiesEditor } from "properties-file/editor";
import * as fs from "fs";
import path from "path";
import { InputValues } from "./interfaces";

/**
 * How the liquibase path will be queried in the inputs.
 */
export const liquibasePath: string = "liquibasePath";

/**
 * The general configuration name.
 */
const configurationName: string = "liquibase";

/**
 * The configuration for storing the liquibase configurations.
 */
const liquibaseConfigurationName: string = "liquibaseConfigurationFiles";

/**
 * The file ending of all liquibase configuration files.
 */
const fileEnding: string = ".liquibase.properties";

/**
 * Reads the database configuration and return all names.
 */
export function readLiquibaseConfigurationNames(): string[] {
  let configuration = vscode.workspace.getConfiguration(configurationName);
  let liquibaseConfiguration: LiquibaseConfiguration = configuration.get(liquibaseConfigurationName, {});

  return Object.keys(liquibaseConfiguration);
}

/**
 * Adds an key-value pair to the configuration. If no configuration exists, one will be created.
 * @param pName the name of the configuration
 * @param pPath the path to the configuration file
 */
export function addToLiquibaseConfiguration(pName: string, pPath: string) {
  let configuration = vscode.workspace.getConfiguration(configurationName);
  let liquibaseConfiguration: LiquibaseConfiguration = configuration.get(liquibaseConfigurationName, {});

  liquibaseConfiguration[pName] = pPath;

  configuration.update(liquibaseConfigurationName, liquibaseConfiguration);

  vscode.window.showInformationMessage(`Configuration for ${pName} was successfully added to the settings.`);
}

/**
 *Creates a `liquibase.properties` file by filling out a multi step dialog.
 * @param pConfiguration the inputted values from the user
 */
export async function createLiquibaseProperties(pConfiguration: InputValues) {
  // TODO check if file exists
  // TODO check if directory, then create file

  // Find out workspace and workspace root for opening the file chooser dialog
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const defaultUri: vscode.Uri | undefined = workspaceFolders ? workspaceFolders[0].uri : undefined;

  const selectedFolder: vscode.Uri[] | undefined = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    defaultUri: defaultUri, // Set the default directory to the workspace root
  });

  if (!selectedFolder || selectedFolder.length === 0) {
    vscode.window.showErrorMessage("No folder given. No configuration was saved");
    return;
  }

  const selectedFolderUri: vscode.Uri = selectedFolder[0];
  const relativePath: string = vscode.workspace.asRelativePath(selectedFolderUri);

  // Map the Uri objects to their file paths
  // const folderPaths = selectedFolder.map((uri) => uri.fsPath);
  const absolutePath: string = path.join(...selectedFolder.map((uri) => uri.fsPath));
  console.log(absolutePath);

  // build file name and path
  const name: string = pConfiguration.name;
  let fileName: string = name;
  if (!fileName.endsWith(fileEnding)) {
    fileName = fileName + fileEnding;
  }

  // Build the properties
  let properties: PropertiesEditor = new PropertiesEditor("");
  Object.entries(pConfiguration).forEach(([key, value]) => {
    if (key && value && key !== "name" && typeof value === "string") {
      properties.insert(key, value);
    }
  });

  // TODO  error handling?
  // save file with absolute path
  fs.writeFileSync(path.join(absolutePath, fileName), properties.format());

  // save with the relative path in the settings
  addToLiquibaseConfiguration(name, path.join(relativePath, fileName));
}

/**
 * Tests a existing liquibase configuration.
 * @param pConfiguration the name of the configuration or the whole configuration that should be tested
 */
export function testLiquibaseConnection(pConfiguration: string | InputValues) {
  if (typeof pConfiguration === "string") {
    let configuration = vscode.workspace.getConfiguration(configurationName);
    let liquibaseConfiguration: LiquibaseConfiguration = configuration.get(liquibaseConfigurationName, {});

    const path: string = liquibaseConfiguration[pConfiguration];
    if (path) {
      // TODO Read properties for path
      // TODO create dummy changelog and call validate / status of liquibase, then handle the results

      vscode.window.showInformationMessage(`Testing connection for ${pConfiguration} and ${path} in the future`);
    }
  } else {
    // TODO create properties for testing
    // todo do real test
    vscode.window.showInformationMessage(`Testing connection for ${JSON.stringify(pConfiguration)}`);
  }
}

/**
 * The Liquibase configuration.
 */
interface LiquibaseConfiguration {
  [key: string]: string;
}
