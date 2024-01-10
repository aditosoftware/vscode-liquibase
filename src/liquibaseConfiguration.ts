import * as vscode from "vscode";
import * as fs from "fs";
import path from "path";
import { LiquibaseConfigurationData } from "./transferData";
import { Driver } from "./drivers";
import download from "download";

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

// TODO tsdoc
const driverLocation: string = "driverLocation";

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
 * @param pName - the name of the configuration
 * @param pPath - the path to the configuration file
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
 * @param pMessageData - the inputted values from the user
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

  const absolutePath: string = path.join(...selectedFolder.map((uri) => uri.fsPath));

  // build file name and path
  const name: string = pMessageData.name;
  let fileName: string = name;
  if (!fileName.endsWith(fileEnding)) {
    fileName = fileName + fileEnding;
  }

  const properties: string = await pMessageData.generateProperties(downloadDriver);

  const propertiesFilePath = path.join(absolutePath, fileName);

  // TODO  error handling?

  // save file with absolute path
  fs.writeFileSync(propertiesFilePath, properties);

  // save with the relative path in the settings
  addToLiquibaseConfiguration(name, propertiesFilePath);

  // open the created file
  const uri = vscode.Uri.file(propertiesFilePath);
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
}

/**
 * Tests a existing liquibase configuration.
 * @param pConfiguration - the name of the configuration or the whole configuration that should be tested
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
    // TODO do real test
    vscode.window.showInformationMessage(`Testing connection for ${JSON.stringify(pConfiguration)}`);
  }
}

/**
 * Downloads a driver, if no driver was downloaded previously.
 * @param pDriver - the driver that need to be downloaded by the extensions
 */
async function downloadDriver(pDriver: Driver): Promise<string> {
  // find out location for driver
  const locationForDriver = getDriverLocation();

  const uriFile = vscode.Uri.file(locationForDriver);
  // create the missing directories
  await vscode.workspace.fs.createDirectory(uriFile);

  // Gets the filename of the driver
  const fileName = pDriver.getFileName();

  const driverLocationWithFileName = path.join(locationForDriver, fileName);
  // if file does not exist, download the driver
  if (!fs.existsSync(driverLocationWithFileName)) {
    try {
      await download(pDriver.urlForDownload, locationForDriver);
    } catch (error) {
      console.error(`error downloading the file: ${error}`);
    }
  }

  return driverLocationWithFileName;
}

/**
 * Loads the setting where the drivers should be downloaded.
 * If no value was found, then a default location will be used. This default location is the workspace folder and a subdirectory named `.drivers`.
 * @returns the configured location for the driver or a default location
 */
function getDriverLocation(): string {
  // TODO tsdoc
  // TODO better default setting of parameter
  const configuration = vscode.workspace.getConfiguration(configurationName);
  const locationForDriver = configuration.get(driverLocation, "");

  // TODO force user to configure
  if (locationForDriver === "") {
    // fallback - no driver configured
    // find out the current users workspace and put in a .drivers directory
    const workspaceFolders = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath);

    if (workspaceFolders && workspaceFolders.length > 0) {
      const dir = workspaceFolders[0];

      return path.join(dir, ".drivers");
    }
  }

  return locationForDriver;
}

/**
 * The Liquibase configuration.
 */
interface LiquibaseConfiguration {
  [key: string]: string;
}
