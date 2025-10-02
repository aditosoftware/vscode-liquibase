import * as vscode from "vscode";
import { LiquibaseConfigurationData } from "../data/LiquibaseConfigurationData";
import * as fs from "node:fs";
import path from "node:path";
import * as os from "os";
import { TransferDataForCommand } from "../../registerLiquibaseCommand";
import { PROPERTY_FILE } from "../../input/ConnectionType";
import { TransferActionForCommand } from "../../TransferActionForCommand";

/**
 * Tests a existing liquibase configuration from a webview.
 *
 * @param pConfiguration - the whole configuration that should be tested
 */
export async function testLiquibaseConnection(pConfiguration: LiquibaseConfigurationData): Promise<void> {
  // we need to build a temporary file for testing the configuration
  const tempFolder = fs.mkdtempSync(path.join(os.tmpdir(), "liquibase"));
  const tempFilePath = path.join(tempFolder, "temporary.liquibase.properties");

  // create a temporary configuration
  fs.writeFileSync(tempFilePath, pConfiguration.generateProperties(), "utf-8");

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
   * Constructor.
   *
   * @param tempFolder - The temporary folder.
   * @param tempFilePath - The temporary file which is inside the temporary folder.
   */
  constructor(
    public tempFolder: string,
    public tempFilePath: string
  ) {
    super();
  }

  /**
   * @override
   */
  executeAfterCommandAction(): void {
    fs.rmSync(this.tempFilePath);
    fs.rmdirSync(this.tempFolder);
  }
}
