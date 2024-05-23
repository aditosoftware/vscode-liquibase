import {
  CommandUtils,
  openAndSelectRMBItemFromChangelog,
  openAndSelectRMBItemFromChangelogFromExplorer,
  wait,
} from "../../CommandUtils";
import { DockerTestUtils } from "../../../suite/DockerTestUtils";
import { LiquibaseGUITestUtils } from "../../LiquibaseGUITestUtils";
import assert from "assert";
import { randomUUID } from "crypto";
import { ContextOptions } from "../../../../constants";

/**
 * Test suite for the "Rollback to Tag" command in the Right Click Menu.
 */
suite("rollback-to-tag: Right Click Menu", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Setup function that runs before all tests in the suite.
   */
  suiteSetup(async function () {
    this.timeout(50_000);
    configurationName = await CommandUtils.setupTests();
  });

  /**
   * Test case for executing the "rollback-to-tag" command from RMB in file.
   */
  test("should execute 'rollback-to-tag' command from RMB in file", async function () {
    this.timeout(80_000);
    await executeCommand(configurationName, () => openAndSelectRMBItemFromChangelog("Rollback to Tag"));
  });

  /**
   * Test case for executing the "rollback-to-tag" command from RMB in file explorer.
   */
  test("should execute 'rollback-to-tag' command from RMB in file explorer", async function () {
    this.timeout(80_000);
    await executeCommand(configurationName, () => openAndSelectRMBItemFromChangelogFromExplorer("Rollback to Tag"));
  });

  /**
   * Teardown function that runs after all tests in the suite.
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

  const tagName = randomUUID();

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

  // Set tag
  await LiquibaseGUITestUtils.startCommandExecution("create tag");

  await input.setText(configurationName);
  await input.confirm();

  await input.setText(tagName);
  await input.confirm();

  // Update all datasets
  await LiquibaseGUITestUtils.startCommandExecution("update");

  await input.setText(configurationName);
  await input.confirm();

  await input.setText(CommandUtils.CHANGELOG_FILE);
  await input.selectQuickPick(1);

  await input.setText(ContextOptions.USE_RECENTLY_LOADED);
  await input.confirm();

  await wait();

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

  await wait();

  await input.setText(tagName);
  await input.confirm();

  await wait();

  // Check if the message is popping up
  assert.ok(
    await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'rollback' was executed successfully.")
  );
  assert.ok(
    (
      await DockerTestUtils.executeMariaDBSQL(
        CommandUtils.pool,
        "SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'company'"
      )
    )?.length === 0,
    "Rollback did not remove values from DB"
  );
}
