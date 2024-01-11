import * as vscode from "vscode";
import * as fs from "fs";
import path from "path";
import { Driver } from "./drivers";
import download from "download";
import {
  getDriverLocation,
  getLiquibaseConfigurationPath,
  readConfiguration,
  updateConfiguration,
} from "./handleLiquibaseSettings";
import { LiquibaseConfigurationData } from "./configuration/LiquibaseConfigurationData";

/**
 * The file ending of all liquibase configuration files.
 */
const fileEnding: string = ".liquibase.properties";

/**
 * Reads the database configuration and return all names.
 */
export async function readLiquibaseConfigurationNames(): Promise<string[] | undefined> {
  const configuration = await readConfiguration();
  if (configuration) {
    return Object.keys(configuration).sort((a, b) => a.localeCompare(b));
  }
}

/**
 * Adds an key-value pair to the configuration. If no configuration exists, one will be created.
 * // TODO tsdoc
 * @param pName - the name of the configuration
 * @param pPath - the path to the configuration file
 */
export async function addToLiquibaseConfiguration(pName: string, pPath: string) {
  updateConfiguration((pJsonData) => {
    pJsonData[pName] = pPath;
  });

  vscode.window.showInformationMessage(`Configuration for ${pName} was successfully saved.`);
  // TODO error handling?
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

  if (pMessageData.newConfig) {
    // check only for existing configuration when there is a new configuration file
    const existingConfigurations = await readLiquibaseConfigurationNames();
    if (existingConfigurations) {
      if (existingConfigurations.indexOf(name) !== -1) {
        const yes = "Yes";
        const answer = await vscode.window.showWarningMessage(
          `There is already a configuration named ${name}. Do you want to replace it?`,
          yes,
          "No"
        );

        if (answer !== yes) {
          vscode.window.showInformationMessage("Saving cancelled");
          return;
        }
      }
    }
  }

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

  // TODO Transfer successful saving back
  // LiquibaseConfigurationPanel.transfer(name);
}

/**
 * Tests a existing liquibase configuration.
 * @param pConfiguration - the name of the configuration or the whole configuration that should be tested
 */
export async function testLiquibaseConnection(pConfiguration: string | LiquibaseConfigurationData) {
  if (typeof pConfiguration === "string") {
    const configuration = await getPathOfConfiguration(pConfiguration);
    if (configuration) {
      // TODO Read properties for path
      // TODO create dummy changelog and call validate / status of liquibase, then handle the results

      vscode.window.showInformationMessage(
        `Testing connection for ${pConfiguration} and ${configuration} in the future`
      );
    } // TODO error handling
  } else {
    // TODO create properties for testing
    // TODO do real test
    vscode.window.showInformationMessage(`Testing connection for ${JSON.stringify(pConfiguration)}`);
  }
}

/**
 * Reads the path from an configuration name.
 * @param pConfigurationName - the name of the configuration
 * @returns the path for this configuration
 */
export async function getPathOfConfiguration(pConfigurationName: string) {
  const configuration = await readConfiguration();
  if (configuration) {
    return configuration[pConfigurationName];
  }
}

/**
 * Downloads a driver, if no driver was downloaded previously.
 * @param pDriver - the driver that need to be downloaded by the extensions
 */
async function downloadDriver(pDriver: Driver): Promise<string | undefined> {
  // find out location for driver
  const locationForDriver = await getDriverLocation();
  if (!locationForDriver) {
    // TODO error
    return;
  }

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
