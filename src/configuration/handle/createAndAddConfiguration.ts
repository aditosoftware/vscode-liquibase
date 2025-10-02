import * as vscode from "vscode";
import * as fs from "node:fs";
import path from "node:path";
import { getLiquibaseConfigurationPath } from "../../handleLiquibaseSettings";
import { LiquibaseConfigurationData, ConfigurationStatus } from "../data/LiquibaseConfigurationData";
import { LiquibaseConfigurationPanel } from "../../panels/LiquibaseConfigurationPanel";
import { MessageType } from "../transfer";
import { readLiquibaseConfigurationNames, updateConfiguration } from "./readConfiguration";
import { openDocument } from "../../utilities/vscodeUtilities";
import { Logger } from "@aditosoftware/vscode-logging";

/**
 * The file ending of all liquibase configuration files.
 */
const fileEnding: string = ".liquibase.properties";

/**
 * Adds an key-value pair to the configuration. If no configuration exists, one will be created.
 *
 * @param pName - the name of the configuration
 * @param pPath - the path to the configuration file
 * @param pCheckForExisting - if there should be a check for existing configurations. This is by default always true.
 * You should only disable this check, if you have done one separate check before
 */
export async function addToLiquibaseConfiguration(
  pName: string,
  pPath: string,
  pCheckForExisting: boolean = true
): Promise<void> {
  const success = await updateConfiguration(async (pJsonData) => {
    // if there is a configuration with this name, check for override
    if (pJsonData[pName] && pCheckForExisting) {
      const shouldOverride = await checkForOverridingExistingConfiguration(pName);
      if (!shouldOverride) {
        return;
      }
    }

    pJsonData[pName] = pPath;
  });

  if (success) {
    Logger.getLogger().info({ message: `Configuration for ${pName} was successfully saved.`, notifyUser: true });
  } else {
    Logger.getLogger().error({ message: `Configuration for ${pName} could not be saved`, notifyUser: true });
  }
}

/**
 *Creates a `liquibase.properties` file by filling out a multi step dialog.
 *
 * @param pConfigurationData - the inputted values from the user
 */
export async function createLiquibaseProperties(pConfigurationData: LiquibaseConfigurationData): Promise<void> {
  const configurationPath = await getLiquibaseConfigurationPath();

  if (!configurationPath) {
    Logger.getLogger().error({
      message: "No configuration path was given. No configuration was saved",
      notifyUser: true,
    });
    return;
  }

  // build file name and path
  const name: string = pConfigurationData.name;

  if (pConfigurationData.status === ConfigurationStatus.NEW) {
    // check only for existing configuration when there is a new configuration file
    const existingConfigurations = await readLiquibaseConfigurationNames();
    if (existingConfigurations?.includes(name)) {
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

  const properties: string = pConfigurationData.generateProperties();

  const propertiesFilePath = path.join(configurationPath, fileName);

  try {
    // save file with absolute path
    fs.writeFileSync(propertiesFilePath, properties, { encoding: "utf8" });
  } catch (error) {
    Logger.getLogger().error({ message: "Error writing file", error, notifyUser: true });
    return;
  }

  // save with the relative path in the settings
  await addToLiquibaseConfiguration(name, propertiesFilePath, false);

  // open the created file
  await openDocument(propertiesFilePath);

  // Transfer successful saving back to webview
  LiquibaseConfigurationPanel.transferMessage(MessageType.SAVING_SUCCESSFUL, pConfigurationData);
}

/**
 * Creates a dialog for the user, to ask if an existing configuration with the same name should be overwritten.
 *
 * @param name - the name of the current configuration
 * @returns `true`, when the current configuration should be overwritten, `false`, when it should not be overwritten
 */
async function checkForOverridingExistingConfiguration(name: string): Promise<boolean> {
  const answer = await vscode.window.showWarningMessage(
    `There is already a configuration named ${name}. Do you want to replace it?`,
    "Yes",
    "No"
  );

  if (answer === "Yes") {
    return true;
  }

  Logger.getLogger().info({ message: "Saving cancelled", notifyUser: true });
  return false;
}
