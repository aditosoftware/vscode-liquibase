import path from "path";
import fs from "fs";
import assert from "assert";
import {
  CommandUtils,
  wait,
  openAndSelectRMBItemFromChangelog,
  openAndSelectRMBItemFromChangelogFromExplorer,
} from "../../CommandUtils";
import { LiquibaseGUITestUtils } from "../../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../../suite/DockerTestUtils";
import { ContextOptions } from "../../../../constants";

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
      openAndSelectRMBItemFromChangelog("Generate SQL File for incoming changes")
    );
  });

  /**
   * Test case to execute the 'update-sql' command from RMB in file explorer.
   */
  test("should execute 'update-sql' command from RMB in file explorer", async function () {
    this.timeout(80_000);
    await executeCommand(configurationName, () =>
      openAndSelectRMBItemFromChangelogFromExplorer("Generate SQL File for incoming changes")
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
  await CommandUtils.resetDB(CommandUtils.pool);

  const input = await LiquibaseGUITestUtils.startCommandExecution("update");

  await input.setText(configurationName);
  await input.confirm();

  await input.setText(CommandUtils.CHANGELOG_FILE);
  await input.selectQuickPick(1);

  await input.setText(ContextOptions.LOAD_ALL_CONTEXT);
  await input.confirm();

  await wait();

  await input.setText("foo");
  await input.toggleAllQuickPicks(true);
  await input.confirm();

  await wait();

  await contextMenuFunction();
  await wait();

  await input.setText(configurationName);
  await input.confirm();

  await input.setText(ContextOptions.LOAD_ALL_CONTEXT);
  await input.confirm();

  await wait();

  await input.toggleAllQuickPicks(true);
  await input.confirm();

  await CommandUtils.selectFolder(input, path.join(CommandUtils.WORKSPACE_PATH, "myFolder")); // todo dynamischer folder

  await input.setText("update.sql");
  await input.confirm();

  await wait();

  assert.ok(
    await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'update-sql' was executed successfully."),
    "Notification did NOT show up"
  );
  assert.ok(
    fs.existsSync(path.join(CommandUtils.WORKSPACE_PATH, "myFolder", "update.sql")),
    "Did NOT create a SQL File"
  );
}
