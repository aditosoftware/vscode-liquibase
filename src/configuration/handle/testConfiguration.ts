import * as vscode from "vscode";
import { LiquibaseConfigurationData } from "../data/LiquibaseConfigurationData";
import * as fs from "fs";
import path from "path";
import * as os from "os";
import { TransferActionForCommand, TransferDataForCommand } from "../../registerLiquibaseCommand";
import { buildDriverPath } from "./createAndAddConfiguration";
import { PROPERTY_FILE } from "../../input/ConnectionType";

/**
 * Tests a existing liquibase configuration from a webview.
 * @param pConfiguration - the whole configuration that should be tested
 */
export async function testLiquibaseConnection(pConfiguration: LiquibaseConfigurationData): Promise<void> {
  // we need to build a temporary file for testing the configuration
  const tempFolder = fs.mkdtempSync(path.join(os.tmpdir(), "liquibase"));
  const tempFilePath = path.join(tempFolder, "temporary.liquibase.properties");

  // create a temporary configuration
  fs.writeFileSync(tempFilePath, pConfiguration.generateProperties(buildDriverPath), "utf-8");

  // execute the validate command
  await vscode.commands.executeCommand(
    "liquibase.validate",
    new TransferDataForCommand(PROPERTY_FILE, tempFilePath),
    new DeleteTemporaryFiles(tempFolder, tempFilePath)
  );
}

/**
 * After command action that will delete the temporary file and folder where a temporary liquibase file was saved.
 */
class DeleteTemporaryFiles extends TransferActionForCommand {
  /**
   * The temporary folder.
   */
  tempFolder: string;

  /**
   * The temporary file which is inside the temporary folder.
   */
  tempFilePath: string;

  constructor(tempFolder: string, tempFilePath: string) {
    super();
    this.tempFolder = tempFolder;
    this.tempFilePath = tempFilePath;
  }

  executeAfterCommandAction(): void {
    fs.rmSync(this.tempFilePath);
    fs.rmdirSync(this.tempFolder);
  }
}