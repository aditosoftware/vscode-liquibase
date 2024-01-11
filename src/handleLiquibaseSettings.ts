import * as vscode from "vscode";
import * as fs from "fs";
import path from "path";

/**
 * The general configuration name.
 */
const configurationName: string = "liquibase";

/**
 * The name of the settings file where all the configurations should be stored.
 */
const configurationSettingFile: string = "settings.json";

/**
 * The configuration of all the user configured `liquibase.properties` files.
 */
interface Configuration {
  /**
   * The path where the configuration itself is stored. This should be an absolute path.
   * This path is for example needed, when the content is updated.
   */
  configPath: string;

  /**
   * The key-value-pairs of the settings.
   * The key is the unique name of the configuration.
   * The value is the absolute path to the `liquibase.properties` file.
   */
  jsonData: Record<string, string>;
}

/**
 * Updates the values of the configuration.
 * @param pUpdate - the function used for updating the json data. This data is given as key / value pairs
 */
export async function updateConfiguration(pUpdate: (pJsonData: Record<string, string>) => void) {
  // read the configuration
  const configuration = await readConfigurationInternal();
  if (configuration) {
    // update it
    pUpdate(configuration.jsonData);

    // and write the data to the file
    fs.writeFileSync(configuration.configPath, JSON.stringify(configuration.jsonData, undefined, 2));

    // TODO success return
  }
}

/**
 * Reads the configuration values for the liquibase specific configuration.
 * @returns the read values from the configuration
 */
export async function readConfiguration(): Promise<Record<string, string> | undefined> {
  const configuration = await readConfigurationInternal();
  if (configuration) {
    return configuration.jsonData;
  }
}

/**
 * Reads the liquibase specific configuration.
 * This method should not be exported. Instead, use `readConfiguration` for reading and `updateConfiguration` for updating the configuration.
 * @returns the found configuration. This includes also the stored location for further updating
 */
async function readConfigurationInternal(): Promise<Configuration | undefined> {
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

/**
 * Finds the file where the liquibase specific settings are stored.
 * @returns the full path to the file with liquibase specific settings
 */
async function getLiquibaseSettingsPath(): Promise<string | undefined> {
  // TODO better name
  const configurationFolder: string | undefined = await getLiquibaseConfigurationPath();

  if (configurationFolder) {
    return path.join(configurationFolder, configurationSettingFile);
  }
}

/**
 * Reads the settings and loads the configuration path where the liquibase specific settings should be stored
 * @returns the configuration path where the liquibase specific settings should be stored. This is an absolute path.
 */
export async function getLiquibaseConfigurationPath(): Promise<string | undefined> {
  const configuration = vscode.workspace.getConfiguration(configurationName);

  const configurationPathSetting = "configurationPath";

  const defaultValue: unknown = configuration.inspect(configurationPathSetting)?.defaultValue;
  if (typeof defaultValue !== "string") {
    // TODO other handling?
    return;
  }

  let configurationPath: string = configuration.get(configurationPathSetting, defaultValue);

  // double check the configuration path, because it can also be empty string
  if (!configurationPath) {
    configurationPath = defaultValue;
  }

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
 * Loads the setting where the drivers should be downloaded.
 * If no value was found, then a default location will be used. This default location is inside the liquibase default folder and will be named `.drivers`.
 * @returns the configured location for the driver or a default location
 */
export async function getDriverLocation(): Promise<string | undefined> {
  // load setting for driver location
  const configuration = vscode.workspace.getConfiguration(configurationName);
  const locationForDriver = configuration.get("driverLocation", "");

  if (locationForDriver) {
    // setting is there, just give it back
    return locationForDriver;
  } else {
    // fallback - no driver configured
    // find out the liquibase configuration path and put in a .drivers directory
    const liquibaseConfigurationPath = await getLiquibaseConfigurationPath();
    if (liquibaseConfigurationPath) {
      return path.join(liquibaseConfigurationPath, ".drivers");
    }
  }
}
