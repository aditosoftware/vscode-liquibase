import * as vscode from "vscode";
import { StepResults } from "./multiStepInput";
import { PropertiesEditor } from "properties-file/editor";
import * as fs from "fs";
import path from "path";

/**
 * How the liquibase path will be queried in the inputs.
 */
export const liquibasePath: string = "liquibasePath";

/**
 * The general configuration name.
 */
const configurationName: string = "liquibase";

/**
 * The configuration for storing the liquibase configurations.
 */
const liquibaseConfigurationName: string = "liquibaseConfigurationFiles";

/**
 * The file ending of all liquibase configuration files.
 */
const fileEnding: string = ".properties";

/**
 * Reads the database configuration and return all names.
 */
export function readLiquibaseConfigurationNames(): string[] {
  let configuration = vscode.workspace.getConfiguration(configurationName);
  let liquibaseConfiguration: LiquibaseConfiguration = configuration.get(liquibaseConfigurationName, {});

  return Object.keys(liquibaseConfiguration);
}

/**
 * Adds an key-value pair to the configuration. If no configuration exists, one will be created.
 * @param pName the name of the configuration
 * @param pPath the path to the configuration file
 */
export function addToLiquibaseConfiguration(pName: string, pPath: string) {
  let configuration = vscode.workspace.getConfiguration(configurationName);
  let liquibaseConfiguration: LiquibaseConfiguration = configuration.get(liquibaseConfigurationName, {});

  liquibaseConfiguration[pName] = pPath;

  configuration.update(liquibaseConfigurationName, liquibaseConfiguration);

  vscode.window.showInformationMessage(`Configuration for ${pName} was successfully added to the settings.`);
}

/**
 *Creates a `liquibase.properties` file by filling out a multi step dialog.
 * @param pConfiguration the results of the multi step dialog
 * @param pFolder the folder where the configuration should be created
 */
export function createLiquibaseProperties(pConfiguration: StepResults, pFolder: string) {
  // TODO check if file exists
  // TODO check if directory, then create file

  // build file name and path
  let fileName: string = pConfiguration[liquibasePath];
  if (!fileName.endsWith(fileEnding)) {
    fileName = fileName + fileEnding;
  }
  const filePath: string = path.join(pFolder, fileName);

  const name: string = pConfiguration["name"];

  let properties = new PropertiesEditor("");

  for (const key in pConfiguration) {
    if (key !== liquibasePath && key !== "name") {
      properties.insert(key, pConfiguration[key]);
    }
  }

  // TODO  error handling?
  fs.writeFileSync(filePath, properties.format());

  addToLiquibaseConfiguration(name, filePath);
}

/**
 * Tests a existing liquibase configuration.
 * @param pName the name of the configuration that should be tested
 */
export function testLiquibaseConnection(pName: string) {
  let configuration = vscode.workspace.getConfiguration(configurationName);
  let liquibaseConfiguration: LiquibaseConfiguration = configuration.get(liquibaseConfigurationName, {});

  const path: string = liquibaseConfiguration[pName];
  if (path) {
    // TODO Read properties for path
    // TODO create dummy changelog and call validate / status of liquibase, then handle the results

    vscode.window.showInformationMessage(`Testing connection for ${pName} and ${path} in the future`);
  }
}

/**
 * The Liquibase configuration.
 */
interface LiquibaseConfiguration {
  [key: string]: string;
}
