import * as vscode from "vscode";
import { LiquibaseConfigurationData } from "../data/LiquibaseConfigurationData";
import { getPathOfConfiguration } from "./readConfiguration";
import * as fs from "fs";
import path from "path";
import * as os from "os";

/**
 * Tests a existing liquibase configuration.
 * @param pConfiguration - the name of the configuration or the whole configuration that should be tested
 */
export async function testLiquibaseConnection(pConfiguration: string | LiquibaseConfigurationData) {
  if (typeof pConfiguration === "string") {
    const configurationFile = await getPathOfConfiguration(pConfiguration);
    if (configurationFile) {
      await doTestLiquibaseConnection(configurationFile);
    }
  } else {
    const tempFolder = fs.mkdtempSync(path.join(os.tmpdir(), "liquibase"));
    const tempFilePath = path.join(tempFolder, "temporary.liquibase.properties");

    fs.writeFileSync(tempFilePath, pConfiguration.generateProperties(), "utf-8");

    await doTestLiquibaseConnection(tempFilePath);

    fs.rmSync(tempFolder);
  }
}

async function doTestLiquibaseConnection(file: string) {
  let success = await vscode.commands.executeCommand("Liquibase.validate", file);
  console.log(success);

  // TODO: implement
  // vscode.window.showInformationMessage(`Testing connection for ${pConfiguration} and ${configuration} in the future`);
}
