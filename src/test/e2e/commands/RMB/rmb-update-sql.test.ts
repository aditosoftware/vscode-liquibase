import path from "path";
import fs from "fs";
import assert from "assert";
import { LiquibaseGUITestUtils } from "../../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../../suite/DockerTestUtils";
import { ContextOptions } from "../../../../constants";
import { InputBox } from "vscode-extension-tester";

/**
 * Test suite for the Right Click Menu functionality.
 */
suite("update-sql: Right Click Menu", function () {
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
   * Test case to execute the 'update-sql' command from RMB in file.
   */
  test("should execute 'update-sql' command from RMB in file", async function () {
    await executeCommand(configurationName, () =>
      LiquibaseGUITestUtils.openAndSelectRMBItemFromChangelog("Generate SQL File for incoming changes")
    );
  });

  /**
   * Test case to execute the 'update-sql' command from RMB in file explorer.
   */
  test("should execute 'update-sql' command from RMB in file explorer", async function () {
    await executeCommand(configurationName, () =>
      LiquibaseGUITestUtils.openAndSelectRMBItemFromChangelogFromExplorer("Generate SQL File for incoming changes")
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
  const temporaryFolder = LiquibaseGUITestUtils.generateTemporaryFolder();

  await DockerTestUtils.resetDB();

  await LiquibaseGUITestUtils.executeUpdate(configurationName, ContextOptions.LOAD_ALL_CONTEXT, "foo");

  await contextMenuFunction();

  const input = new InputBox();

  await input.setText(configurationName);
  await input.confirm();

  await input.setText(ContextOptions.LOAD_ALL_CONTEXT);
  await input.confirm();
  await LiquibaseGUITestUtils.selectContext({ toggleAll: true });

  await LiquibaseGUITestUtils.selectFolder(input, temporaryFolder);

  await input.setText("update.sql");
  await input.confirm();

  assert.ok(
    await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'update-sql' was executed successfully."),
    "Notification did NOT show up"
  );
  assert.ok(fs.existsSync(path.join(temporaryFolder, "update.sql")), "Did NOT create a SQL File");
}
