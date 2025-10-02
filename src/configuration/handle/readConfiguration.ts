import * as fs from "node:fs";
import { getLiquibaseConfigurationPath } from "../../handleLiquibaseSettings";
import path from "node:path";
import { Logger } from "@aditosoftware/vscode-logging";

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
 * Reads the database configuration and return all names.
 *
 * @returns the sorted names of the configuration
 */
export async function readLiquibaseConfigurationNames(): Promise<string[] | undefined> {
  const configuration = await readConfiguration();
  if (configuration) {
    return Object.keys(configuration).sort((a, b) => a.localeCompare(b));
  }
}

/**
 * Reads the path from an configuration name.
 *
 * @param pConfigurationName - the name of the configuration
 * @returns the path for this configuration
 */
export async function getPathOfConfiguration(pConfigurationName: string): Promise<string | undefined> {
  const configuration = await readConfiguration();
  if (configuration) {
    return configuration[pConfigurationName];
  }
}

/**
 * Gets the name of the configuration for a given path.
 *
 * @param configurationPath - the path of the configuration
 * @returns the name of the configuration
 */
export async function getNameOfConfiguration(configurationPath: string): Promise<string | undefined> {
  const configuration = await readConfiguration();
  if (configuration) {
    return Object.entries(configuration)
      .filter((entry) => {
        return entry[1] === configurationPath;
      })
      .map((entry) => entry[0])
      .shift();
  }
}

/**
 * Updates the values of the configuration.
 *
 * @param pOnUpdate - the function used for updating the json data. This data is given as key / value pairs
 * @returns `true` when the updating was successful
 */
export async function updateConfiguration(
  pOnUpdate: (pJsonData: Record<string, string>) => Promise<void> | void
): Promise<boolean> {
  // read the configuration
  const configuration = await readConfigurationInternal();
  if (configuration) {
    // update it
    await pOnUpdate(configuration.jsonData);

    // and write the data to the file
    fs.writeFileSync(configuration.configPath, JSON.stringify(configuration.jsonData, undefined, 2), {
      encoding: "utf8",
    });

    return true;
  }

  return false;
}

/**
 * Reads the configuration values for the liquibase specific configuration.
 *
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
 *
 * @returns the found configuration. This includes also the stored location for further updating
 */
async function readConfigurationInternal(): Promise<Configuration | undefined> {
  const configPath = await getLiquibaseSpecificSettingsPath();
  if (!configPath) {
    Logger.getLogger().error({
      message:
        "No configuration path found for the liquibase specific configuration. Please configure it in the settings",
      notifyUser: true,
    });
    return;
  }

  // read the jsonData from the file, if no file is there, just give an empty json object
  const data = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf-8") : JSON.stringify({});
  const jsonData: Record<string, string> = JSON.parse(data) as Record<string, string>;
  return { configPath, jsonData };
}

/**
 * Finds the file where the liquibase specific settings are stored.
 *
 * @returns the full path to the file with liquibase specific settings
 */
async function getLiquibaseSpecificSettingsPath(): Promise<string | undefined> {
  const configurationFolder: string | undefined = await getLiquibaseConfigurationPath();

  if (configurationFolder) {
    return path.join(configurationFolder, configurationSettingFile);
  }
}
