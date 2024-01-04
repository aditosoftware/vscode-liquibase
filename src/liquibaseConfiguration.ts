import * as vscode from "vscode";
import { PropertiesEditor } from "properties-file/editor";
import * as fs from "fs";
import path from "path";
import { LiquibaseConfigurationData } from "./transferData";
import { NO_PRE_CONFIGURED_DRIVER } from "./drivers";

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
  const configuration = vscode.workspace.getConfiguration(configurationName);
  const liquibaseConfiguration: LiquibaseConfiguration = configuration.get(liquibaseConfigurationName, {});

  return Object.keys(liquibaseConfiguration);
}

/**
 * Adds an key-value pair to the configuration. If no configuration exists, one will be created.
 * @param pName the name of the configuration
 * @param pPath the path to the configuration file
 */
export function addToLiquibaseConfiguration(pName: string, pPath: string) {
  const configuration = vscode.workspace.getConfiguration(configurationName);
  const liquibaseConfiguration: LiquibaseConfiguration = configuration.get(liquibaseConfigurationName, {});

  liquibaseConfiguration[pName] = pPath;

  configuration.update(liquibaseConfigurationName, liquibaseConfiguration);

  vscode.window.showInformationMessage(`Configuration for ${pName} was successfully added to the settings.`);
}

/**
 *Creates a `liquibase.properties` file by filling out a multi step dialog.
 * @param pMessageData the inputted values from the user
 */
export async function createLiquibaseProperties(pMessageData: LiquibaseConfigurationData) {
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

  // build file name and path
  const name: string = pMessageData.name;
  let fileName: string = name;
  if (!fileName.endsWith(fileEnding)) {
    fileName = fileName + fileEnding;
  }

  // FIXME Driver
  const databaseType: string = pMessageData.databaseConnection.databaseType;

  if (databaseType !== NO_PRE_CONFIGURED_DRIVER) {
    // TODO download
    vscode.window.showErrorMessage(`Need to download ${databaseType}`);
  }

  // Build the properties
  const properties: PropertiesEditor = new PropertiesEditor("");
  // TODO FIXME
  Object.entries(pMessageData.databaseConnection).forEach(([key, value]) => {
    if (key && value) {
      properties.insert(key, value);
    }
  });

  if (pMessageData.referenceDatabaseConnection) {
    Object.entries(pMessageData.referenceDatabaseConnection).forEach(([key, value]) => {
      if (key && value) {
        const referenceKey = "reference" + key.charAt(0).toUpperCase() + key.substring(1);
        properties.insert(referenceKey, value);
      }
    });
  }

  if (pMessageData.additionalConfiguration) {
    pMessageData.additionalConfiguration.forEach((pValue, pKey) => {
      properties.insert(pKey, pValue);
    });
  }

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
export function testLiquibaseConnection(pConfiguration: string | LiquibaseConfigurationData) {
  if (typeof pConfiguration === "string") {
    const configuration = vscode.workspace.getConfiguration(configurationName);
    const liquibaseConfiguration: LiquibaseConfiguration = configuration.get(liquibaseConfigurationName, {});

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
