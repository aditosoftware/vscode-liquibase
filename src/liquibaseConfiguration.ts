import * as vscode from "vscode";
import * as fs from "fs";
import path from "path";
import { LiquibaseConfigurationData } from "./transferData";
import { Driver } from "./drivers";
import download from "download";

/**
 * The general configuration name.
 */
const configurationName: string = "liquibase";

// TODO tsdoc
const driverLocation: string = "driverLocation";

//////////////////////

/**
 * The file ending of all liquibase configuration files.
 */
const fileEnding: string = ".liquibase.properties";

/**
 * The name of the settings file where all the configurations should be stored.
 */
const configurationSettingFile: string = "settings.json";

/**
 * Reads the database configuration and return all names.
 */
export async function readLiquibaseConfigurationNames(): Promise<string[] | undefined> {
  const configuration = await readConfiguration();
  if (configuration) {
    return Object.keys(configuration.jsonData);
  }
}

/**
 * Adds an key-value pair to the configuration. If no configuration exists, one will be created.
 * // TODO tsdoc
 * @param pName - the name of the configuration
 * @param pPath - the path to the configuration file
 */
export async function addToLiquibaseConfiguration(pName: string, pPath: string) {
  // add the element
  const configuration = await readConfiguration();
  if (configuration) {
    configuration.jsonData[pName] = pPath;

    // and write the data to the file
    fs.writeFileSync(configuration.configPath, JSON.stringify(configuration.jsonData, undefined, 2));

    vscode.window.showInformationMessage(`Configuration for ${pName} was successfully added to the settings.`);
  }
  // TODO error handling?
}

// TODO Tsdoc
interface Configuration {
  configPath: string;
  jsonData: Record<string, string>;
}

async function readConfiguration(): Promise<Configuration | undefined> {
  const configPath = await getLiquibaseSettingsPath();
  if (!configPath) {
    // TODO better message
    vscode.window.showErrorMessage("No configuration path found");
    return;
  }

  // read the jsonData from the file, if no file is there, just give an empty json object
  const data = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf-8") : JSON.stringify({}); // TODO encoding at all file options
  const jsonData: Record<string, string> = JSON.parse(data);
  return { configPath, jsonData };
}

async function getLiquibaseSettingsPath(): Promise<string | undefined> {
  // todo better name
  // TODO tsdoc
  const configurationFolder: string | undefined = await getLiquibaseConfigurationPath();

  if (configurationFolder) {
    return path.join(configurationFolder, configurationSettingFile);
  }
}

// TODO TSDOC
export async function getLiquibaseConfigurationPath(): Promise<string | undefined> {
  const configuration = vscode.workspace.getConfiguration(configurationName);
  const configurationPath = configuration.get("configurationPath", "data/liquibase");

  if (vscode.workspace.workspaceFolders) {
    const workspaceFolder = vscode.workspace.workspaceFolders[0];

    const absolutePath = path.join(workspaceFolder.uri.fsPath, configurationPath);

    if (!fs.existsSync(absolutePath)) {
      const uriFile = vscode.Uri.file(absolutePath);
      // create the missing directories
      await vscode.workspace.fs.createDirectory(uriFile);
    }

    return absolutePath;
  }
}

/**
 *Creates a `liquibase.properties` file by filling out a multi step dialog.
 * @param pMessageData - the inputted values from the user
 */
export async function createLiquibaseProperties(pMessageData: LiquibaseConfigurationData) {
  // TODO check if file exists
  // TODO check if directory, then create file

  const configurationPath = await getLiquibaseConfigurationPath();

  if (!configurationPath) {
    // TODO better error message
    vscode.window.showErrorMessage("No folder given. No configuration was saved");
    return;
  }

  // build file name and path
  const name: string = pMessageData.name;
  let fileName: string = name;
  if (!fileName.endsWith(fileEnding)) {
    fileName = fileName + fileEnding;
  }

  const properties: string = await pMessageData.generateProperties(downloadDriver);

  const propertiesFilePath = path.join(configurationPath, fileName);

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
export async function testLiquibaseConnection(pConfiguration: string | LiquibaseConfigurationData) {
  if (typeof pConfiguration === "string") {
    const configuration = await readConfiguration();
    if (configuration) {
      const path: string = configuration.jsonData[pConfiguration];
      if (path) {
        // TODO Read properties for path
        // TODO create dummy changelog and call validate / status of liquibase, then handle the results

        vscode.window.showInformationMessage(`Testing connection for ${pConfiguration} and ${path} in the future`);
      }
    } // TODO error handling
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
