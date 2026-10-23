import * as vscode from "vscode";
import { LiquibaseConfigurationData } from "../data/LiquibaseConfigurationData";
import * as fs from "node:fs";
import path from "node:path";
import * as os from "node:os";
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
  const temporaryFolder = fs.mkdtempSync(path.join(os.tmpdir(), "liquibase"));
  const temporaryFilePath = path.join(temporaryFolder, "temporary.liquibase.properties");

  // create a temporary configuration
  fs.writeFileSync(temporaryFilePath, pConfiguration.generateProperties(), "utf8");

  // execute the validate command
  await vscode.commands.executeCommand(
    "liquibase.validate",
    new TransferDataForCommand(PROPERTY_FILE, temporaryFilePath),
    new DeleteTemporaryFiles(temporaryFolder, temporaryFilePath)
  );
}

/**
 * After command action that will delete the temporary file and folder where a temporary liquibase file was saved.
 */
class DeleteTemporaryFiles extends TransferActionForCommand {
  /**
   * Constructor.
   *
   * @param temporaryFolder - The temporary folder.
   * @param temporaryFilePath - The temporary file which is inside the temporary folder.
   */
  constructor(
    public temporaryFolder: string,
    public temporaryFilePath: string
  ) {
    super();
  }

  /**
   * @override
   */
  executeAfterCommandAction(): void {
    fs.rmSync(this.temporaryFilePath);
    fs.rmdirSync(this.temporaryFolder);
  }
}
