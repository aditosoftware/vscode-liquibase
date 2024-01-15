import * as vscode from "vscode";
import * as fs from "fs";
import path from "path";
import { Driver } from "../drivers";
import download from "download";
import { getDriverLocation, getLiquibaseConfigurationPath, updateConfiguration } from "../../handleLiquibaseSettings";
import { LiquibaseConfigurationData, ConfigurationStatus } from "../data/LiquibaseConfigurationData";
import { LiquibaseConfigurationPanel } from "../../panels/LiquibaseConfigurationPanel";
import { MessageType } from "../transfer/transferData";
import { readLiquibaseConfigurationNames } from "./readConfiguration";

/**
 * The file ending of all liquibase configuration files.
 */
const fileEnding: string = ".liquibase.properties";

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
  } else {
    vscode.window.showErrorMessage(`Configuration for ${pName} could not be saved`);
  }
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

  try {
    // save file with absolute path
    fs.writeFileSync(propertiesFilePath, properties, { encoding: "utf8" });
  } catch (error) {
    console.error(error);
    return;
  }

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
 * Downloads a driver, if no driver was downloaded previously.
 * @param pDriver - the driver that need to be downloaded by the extensions
 */
async function downloadDriver(pDriver: Driver): Promise<string | undefined> {
  // find out location for driver
  const locationForDriver = await getDriverLocation();
  if (!locationForDriver) {
    console.error("No location for downloading the drivers was found");
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
      return;
    }
  }

  return driverLocationWithFileName;
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
