import path from "path";
import assert from "assert";
import fs from "fs";
import { InputBox } from "vscode-extension-tester";
import {
  CommandUtils,
  openAndSelectRMBItemFromChangelog,
  openAndSelectRMBItemFromChangelogFromExplorer,
  wait,
} from "../../CommandUtils";
import { LiquibaseGUITestUtils } from "../../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../../suite/DockerTestUtils";
import { ContextOptions } from "../../../../constants";

/**
 * Test suite for the Right Click Menu functionality.
 */
suite("db-doc: Right Click Menu", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Setup function that runs before the test suite.
   */
  suiteSetup(async function () {
    this.timeout(50_000);
    configurationName = await CommandUtils.setupTests();
  });

  /**
   * Test case to execute the 'db-doc' command from RMB in file.
   */
  test("should execute 'db-doc' command from RMB in file", async function () {
    await executeCommand(configurationName, () =>
      openAndSelectRMBItemFromChangelog("Generate database documentation (db-doc)")
    );
  });

  /**
   * Test case to execute the 'db-doc' command from RMB in file explorer.
   */
  test("should execute 'db-doc' command from RMB in file explorer", async function () {
    await executeCommand(configurationName, () =>
      openAndSelectRMBItemFromChangelogFromExplorer("Generate database documentation (db-doc)")
    );
  });

  /**
   * Teardown function that runs after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});

/**
 * Executes the command.
 * @param configurationName - the name of the configuration
 * @param contextMenuFunction - the function to call the context menu
 */
async function executeCommand(configurationName: string, contextMenuFunction: () => Promise<void>): Promise<void> {
  const directoryForDbDoc = CommandUtils.generateTemporaryFolder();
  await DockerTestUtils.resetDB();

  await contextMenuFunction();
  await wait();

  const input = await InputBox.create();

  await input.setText(configurationName);
  await input.confirm();

  await input.setText(ContextOptions.NO_CONTEXT);
  await input.confirm();

  // Set the output directory for the generated documentation.
  await CommandUtils.selectFolder(input, directoryForDbDoc);

  await wait();

  assert.ok(
    await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'db-doc' was executed successfully.")
  );
  assert.ok(fs.existsSync(path.join(directoryForDbDoc, "index.html")), "Did NOT create a DB-DOC Files");
}
