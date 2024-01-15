import * as vscode from "vscode";
import { LiquibaseConfigurationData } from "../data/LiquibaseConfigurationData";
import { getPathOfConfiguration } from "./readConfiguration";

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
