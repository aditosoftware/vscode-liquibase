import * as vscode from "vscode";
import * as fs from "fs";
import path from "path";
import { Driver } from "../drivers";
import download from "download";
import {
  getDriverLocation,
  getLiquibaseConfigurationPath,
  readConfiguration,
  updateConfiguration,
} from "../../handleLiquibaseSettings";
import { LiquibaseConfigurationData, ConfigurationStatus } from "../data/LiquibaseConfigurationData";
import { LiquibaseConfigurationPanel } from "../../panels/LiquibaseConfigurationPanel";
import { MessageType } from "../transfer/transferData";

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
 * @param pName - the name of the configuration
 * @param pPath - the path to the configuration file
 * @param pCheckForExisting - if there should be a check for existing configurations. This is by default always true.
 * You should only disable this check, if you have done one before
 */
export async function addToLiquibaseConfiguration(pName: string, pPath: string, pCheckForExisting: boolean = true) {
  const success = await updateConfiguration(async (pJsonData) => {
    // if there is a configuration with this name, check for override
    if (pJsonData[pName] && pCheckForExisting) {
      if (!(await checkForOverridingExistingConfiguration(pName))) {
        return;
      }
    }

    pJsonData[pName] = pPath;
  });

  if (success) {
    vscode.window.showInformationMessage(`Configuration for ${pName} was successfully saved.`);
  }
  // TODO error handling?
}

/**
 * Creates a dialog for the user, to ask if an existing configuration with the same name should be overwritten.
 * @param name - the name of the current configuration
 * @returns `true`, when the current configuration should be overwritten, `false`, when it should not be overwritten
 */
async function checkForOverridingExistingConfiguration(name: string): Promise<boolean> {
  const yes = "Yes";
  const answer = await vscode.window.showWarningMessage(
    `There is already a configuration named ${name}. Do you want to replace it?`,
    yes,
    "No"
  );

  if (answer === yes) {
    return true;
  }

  vscode.window.showInformationMessage("Saving cancelled");
  return false;
}

/**
 *Creates a `liquibase.properties` file by filling out a multi step dialog.
 * @param pConfigurationData - the inputted values from the user
 */
export async function createLiquibaseProperties(pConfigurationData: LiquibaseConfigurationData) {
  const configurationPath = await getLiquibaseConfigurationPath();

  if (!configurationPath) {
    vscode.window.showErrorMessage("No configuration path was given. No configuration was saved");
    return;
  }

  // build file name and path
  const name: string = pConfigurationData.name;

  if (pConfigurationData.status === ConfigurationStatus.NEW) {
    // check only for existing configuration when there is a new configuration file
    const existingConfigurations = await readLiquibaseConfigurationNames();
    if (existingConfigurations && existingConfigurations.indexOf(name) !== -1) {
      const shouldOverride = await checkForOverridingExistingConfiguration(name);
      if (!shouldOverride) {
        return;
      }
    }
  }

  let fileName: string = name;
  if (!fileName.endsWith(fileEnding)) {
    fileName = fileName + fileEnding;
  }

  const properties: string = await pConfigurationData.generateProperties(downloadDriver);

  const propertiesFilePath = path.join(configurationPath, fileName);

  // TODO  error handling?

  // save file with absolute path
  fs.writeFileSync(propertiesFilePath, properties);

  // save with the relative path in the settings
  addToLiquibaseConfiguration(name, propertiesFilePath, false);

  // open the created file
  const uri = vscode.Uri.file(propertiesFilePath);
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);

  // Transfer successful saving back to webview
  LiquibaseConfigurationPanel.transferMessage(MessageType.SAVING_SUCCESSFUL, pConfigurationData);
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
