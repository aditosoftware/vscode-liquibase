import * as vscode from "vscode";
import { PropertiesEditor } from "properties-file/editor";
import * as fs from "fs";
import path from "path";
import { DatabaseConnection, LiquibaseConfigurationData } from "./transferData";
import { ALL_DRIVERS, Driver, NO_PRE_CONFIGURED_DRIVER } from "./drivers";
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

  // Build the properties
  const properties: PropertiesEditor = new PropertiesEditor("");

  // Adjust the connection for pre-configured databases ...
  await adjustDatabaseConnection(pMessageData.databaseConnection);

  // .. and put in the properties for the database connection
  Object.entries(pMessageData.databaseConnection).forEach(([key, value]) => {
    if (key && value && key !== "databaseType") {
      properties.insert(key, value);
    }
  });

  if (pMessageData.referenceDatabaseConnection) {
    // Adjust the connection for a reference connection ...
    await adjustDatabaseConnection(pMessageData.referenceDatabaseConnection);
    // ... and put in these values prefixed by reference as well
    Object.entries(pMessageData.referenceDatabaseConnection).forEach(([key, value]) => {
      if (key && value) {
        const referenceKey = "reference" + key.charAt(0).toUpperCase() + key.substring(1);
        properties.insert(referenceKey, value);
      }
    });
  }

  // add additional properties
  for (const key in pMessageData.additionalConfiguration) {
    properties.insert(key, pMessageData.additionalConfiguration[key]);
  }

  // TODO  error handling?
  // save file with absolute path
  fs.writeFileSync(path.join(absolutePath, fileName), properties.format());

  // save with the relative path in the settings
  addToLiquibaseConfiguration(name, path.join(relativePath, fileName));
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
 * Adjusts a database connection by possible downloading the drivers and setting those values in the connection.
 * @param pDatabaseConnection - the database connection whose driver should be adjusted
 */
async function adjustDatabaseConnection(pDatabaseConnection: DatabaseConnection): Promise<void> {
  const databaseType: string = pDatabaseConnection.databaseType;

  if (databaseType !== NO_PRE_CONFIGURED_DRIVER) {
    const databaseDriver: Driver | undefined = ALL_DRIVERS.get(databaseType);
    if (databaseDriver) {
      // download the driver ...
      const driverLocation = await downloadDriver(databaseDriver);
      // ... and save it in the database connection
      pDatabaseConnection.driver = databaseDriver.driverClass;
      pDatabaseConnection.classpath = driverLocation;
    }
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
