import path from "path";
import fs from "fs";
import assert from "assert";
import { CommandUtils, wait } from "../../CommandUtils";
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
    this.timeout(50_000);
    configurationName = await CommandUtils.setupTests();
  });

  /**
   * Test case to execute the 'update-sql' command from RMB in file.
   */
  test("should execute 'update-sql' command from RMB in file", async function () {
    this.timeout(80_000);
    await executeCommand(configurationName, () =>
      CommandUtils.openAndSelectRMBItemFromChangelog("Generate SQL File for incoming changes")
    );
  });

  /**
   * Test case to execute the 'update-sql' command from RMB in file explorer.
   */
  test("should execute 'update-sql' command from RMB in file explorer", async function () {
    this.timeout(80_000);
    await executeCommand(configurationName, () =>
      CommandUtils.openAndSelectRMBItemFromChangelogFromExplorer("Generate SQL File for incoming changes")
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
  const temporaryFolder = CommandUtils.generateTemporaryFolder();

  await DockerTestUtils.resetDB();

  await CommandUtils.executeUpdate(configurationName, ContextOptions.LOAD_ALL_CONTEXT, "foo");

  await contextMenuFunction();
  await wait();

  const input = new InputBox();

  await input.setText(configurationName);
  await input.confirm();

  await input.setText(ContextOptions.LOAD_ALL_CONTEXT);
  await input.confirm();

  await wait();

  await input.toggleAllQuickPicks(true);
  await input.confirm();

  await CommandUtils.selectFolder(input, temporaryFolder);

  await input.setText("update.sql");
  await input.confirm();

  await wait();

  assert.ok(
    await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'update-sql' was executed successfully."),
    "Notification did NOT show up"
  );
  assert.ok(fs.existsSync(path.join(temporaryFolder, "update.sql")), "Did NOT create a SQL File");
}
