import * as vscode from "vscode";
import { LiquibaseConfigurationData } from "../data/LiquibaseConfigurationData";
import { getPathOfConfiguration } from "./readConfiguration";
import * as fs from "fs";
import path from "path";
import * as os from "os";
import { PROPERTY_FILE } from "../../input";

/**
 * Tests a existing liquibase configuration.
 * @param pConfiguration - the name of the configuration or the whole configuration that should be tested
 */
export async function testLiquibaseConnection(pConfiguration: string | LiquibaseConfigurationData) {
  if (typeof pConfiguration === "string") {
    // we have configuration name, just find out the file
    const configurationFile = await getPathOfConfiguration(pConfiguration);
    if (configurationFile) {
      await doTestLiquibaseConnection(configurationFile);
    }
  } else {
    // we are testing from the webview. Build a temporary file and save the element there
    const tempFolder = fs.mkdtempSync(path.join(os.tmpdir(), "liquibase"));
    const tempFilePath = path.join(tempFolder, "temporary.liquibase.properties");

    fs.writeFileSync(tempFilePath, pConfiguration.generateProperties(), "utf-8");

    await doTestLiquibaseConnection(tempFilePath);

    // TODO only delete when really finished. This need to be detected
    // fs.rmSync(tempFilePath);
    // fs.rmdirSync(tempFolder);
  }
}

/**
 * Tests the connection by executing the validate command.
 *
 * The result of this command can not be taken back, because the validate is executed in a child_process.
 *
 * @param file - the file url that need to be tested
 */
async function doTestLiquibaseConnection(file: string) {
  await vscode.commands.executeCommand("liquibase.validate", new TransferDataForCommand(PROPERTY_FILE, file));
}

/**
 * Any transfer data that should be given when calling a liquibase command.
 * // XXX other location when needed otherwise.
 */
export class TransferDataForCommand {
  /**
   * The name of the data. This should be identical to `InputBase.name`.
   * This will be used to set the data and prevent the dialog element with data name.
   */
  name: string;

  /**
   * The data which should be set for the given name.
   */
  data: string | boolean | string[];

  constructor(name: string, data: string | boolean | string[]) {
    this.name = name;
    this.data = data;
  }
}
