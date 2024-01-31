import * as fs from "fs";
import { KeyValuePairObject, getProperties } from "properties-file";
import { LiquibaseSettings } from "./TransferSettings";
import { ConfigurationStatus, LiquibaseConfigurationData } from "./LiquibaseConfigurationData";

/**
 * All possible reference keys.
 */
const possibleReferenceKeys = [
  "default-catalog-name",
  "default-schema-name",
  "driver",
  "driver-properties-file",
  "liquibase-catalog-name",
  "liquibase-schema-name",
  "password",
  "schemas",
  "username",
  "url",
];

/**
 * Reads just classpath and changelog from any configuration file.
 *
 * @param pPath - the path which should be read
 * @param pIsWindows - if the current os is windows. Needed for the separator in the classpath
 * @returns the classpath and changelog of the file
 */
export function readChangelogAndClasspathFile(pPath: string, pIsWindows: boolean) {
  const liquibaseProperties = readProperties(pPath);

  const classpath = liquibaseProperties["classpath"].split(pIsWindows ? ";" : ":");
  const changelog = liquibaseProperties["changelogFile"];
  return { classpath, changelog };
}

/**
 * Reads the `changelogFile` element of the file.
 * @param path -  the path which should be read
 * @returns the changelogFile element of the file
 */
export function readChangelog(pPath: string): string | undefined {
  const liquibaseProperties = readProperties(pPath);

  return liquibaseProperties["changelogFile"];
}

/**
 * Reads the `url` element of the file.
 * @param path -  the path which should be read
 * @returns the url element of the file
 */
export function readUrl(pPath: string) {
  const liquibaseProperties = readProperties(pPath);

  return liquibaseProperties["url"];
}

/**
 * Finds out all normal configuration values which should be treated as reference values of another configuration.
 *
 * This means, if the file contains `password: secret`, then `--reference-password=secret` will be the element in the array for this entry.
 *
 * @param pPath - the path which should be read.
 * @returns command line args for all the keys of the file, which are treated as reference keys
 */
export function readPossibleReferenceValues(pPath: string): string[] {
  const liquibaseProperties = readProperties(pPath);

  const referenceValues: string[] = [];

  for (const [key, value] of Object.entries(liquibaseProperties)) {
    const formattedKey = `--reference-${key}`;
    if (possibleReferenceKeys.includes(key)) {
      referenceValues.push(`${formattedKey}=${value}`);
    }
  }

  return referenceValues;
}

/**
 * Loads the content from a file and transform it into an object.
 *
 * @param pName - the name of the configuration
 * @param pPath - the path of the file
 * @param pLiquibaseSettings - the settings used for creating and updating the configuration
 * @param isWindows - if the current os is windows. Needed for the separator in the classpath
 * @returns the loaded content
 */
export function readFullValues(
  pName: string,
  pPath: string,
  pLiquibaseSettings: LiquibaseSettings,
  isWindows: boolean
): LiquibaseConfigurationData {
  // read the liquibase properties from a file
  const liquibaseProperties = readProperties(pPath);

  const data = LiquibaseConfigurationData.createDefaultData(pLiquibaseSettings, ConfigurationStatus.EDIT, isWindows);
  data.name = pName;

  // handle all key-value-pairs from the file
  for (const [key, value] of Object.entries(liquibaseProperties)) {
    data.handleValueFromLiquibaseConfiguration(key, value);
  }

  return data;
}

/**
 * Reads the properties file and returns it as key-value-pair
 * @param pPath - the path where this file should be read
 * @returns the properties as key-value pairs
 */
function readProperties(pPath: string): KeyValuePairObject {
  return getProperties(fs.readFileSync(pPath, "utf8"));
}
