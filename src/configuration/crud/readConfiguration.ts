import { readConfiguration } from "../../handleLiquibaseSettings";

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
