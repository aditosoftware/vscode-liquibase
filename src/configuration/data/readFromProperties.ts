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
 * Reads the `changelogFile` element of the file.
 *
 * @param pPath - the path which should be read
 * @returns the changelogFile element of the file
 */
export function readChangelog(pPath: string): string | undefined {
  const liquibaseProperties = readProperties(pPath);

  return liquibaseProperties["changelogFile"];
}

/**
 * Reads the `url` element of the file.
 *
 * @param pPath - the path which should be read
 * @returns the url element of the file
 */
export function readUrl(pPath: string): string | undefined {
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

  const referenceKeys = new Map<string, string>();
  possibleReferenceKeys.forEach((pKey) => {
    // in the file, the keys are without dashes and in camelCase
    const keyFromFile = pKey.replaceAll(/-([a-z])/g, (_, match) => match.toUpperCase());
    // for the output, the keys should still be in kebab-case
    const formattedKey = `--reference-${pKey}`;
    referenceKeys.set(keyFromFile, formattedKey);
  });

  for (const [key, value] of Object.entries(liquibaseProperties)) {
    if (referenceKeys.has(key)) {
      referenceValues.push(`${referenceKeys.get(key)}=${value}`);
    }
  }

  return referenceValues;
}

/**
 * Loads the content from a file and transforms it into an object.
 *
 * @param pName - the name of the configuration
 * @param pPath - the path of the file
 * @param pLiquibaseSettings - the settings used for creating and updating the configuration
 * @returns the loaded content
 */
export function readFullValues(
  pName: string,
  pPath: string,
  pLiquibaseSettings: LiquibaseSettings
): LiquibaseConfigurationData {
  // read the liquibase properties from a file
  const liquibaseProperties = readProperties(pPath);

  const data = LiquibaseConfigurationData.createDefaultData(pLiquibaseSettings, ConfigurationStatus.EDIT);
  data.name = pName;

  // handle all key-value-pairs from the file
  for (const [key, value] of Object.entries(liquibaseProperties)) {
    data.handleValueFromLiquibaseConfiguration(key, value);
  }

  return data;
}

/**
 * Reads the properties file and returns it as key-value-pair
 *
 * @param pPath - the path where this file should be read
 * @returns the properties as key-value pairs
 */
function readProperties(pPath: string): KeyValuePairObject {
  if (fs.existsSync(pPath)) {
    return getProperties(fs.readFileSync(pPath, "utf8"));
  } else {
    return {};
  }
}
