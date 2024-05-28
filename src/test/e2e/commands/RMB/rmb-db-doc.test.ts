import path from "path";
import assert from "assert";
import fs from "fs";
import { InputBox } from "vscode-extension-tester";
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
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  /**
   * Test case to execute the 'db-doc' command from RMB in file.
   */
  test("should execute 'db-doc' command from RMB in file", async function () {
    await executeCommand(configurationName, () =>
      LiquibaseGUITestUtils.openAndSelectRMBItemFromChangelog("Generate database documentation (db-doc)")
    );
  });

  /**
   * Test case to execute the 'db-doc' command from RMB in file explorer.
   */
  test("should execute 'db-doc' command from RMB in file explorer", async function () {
    await executeCommand(configurationName, () =>
      LiquibaseGUITestUtils.openAndSelectRMBItemFromChangelogFromExplorer("Generate database documentation (db-doc)")
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
  const directoryForDbDoc = LiquibaseGUITestUtils.generateTemporaryFolder();
  await DockerTestUtils.resetDB();

  await contextMenuFunction();

  const input = new InputBox();

  await input.setText(configurationName);
  await input.confirm();

  await input.setText(ContextOptions.NO_CONTEXT);
  await input.confirm();

  // Set the output directory for the generated documentation.
  await LiquibaseGUITestUtils.selectFolder(input, directoryForDbDoc);

  assert.ok(
    await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'db-doc' was executed successfully.")
  );

  const indexFile = path.join(directoryForDbDoc, "index.html");
  assert.ok(
    await LiquibaseGUITestUtils.waitUntil(() => fs.existsSync(indexFile), `wait for ${indexFile} to exist`),
    "Did NOT create a DB-DOC Files"
  );
}
