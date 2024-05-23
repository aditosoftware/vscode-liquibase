import assert from "assert";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils, wait } from "../CommandUtils";
import { ContextOptions } from "../../../constants";

/**
 * Test suite for the "Rollback to Tag" command.
 */
suite("Rollback to Tag", function () {
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
   * Test case for executing the "Rollback to Tag" command.
   */
  test("should execute 'Rollback to Tag' command", async function () {
    this.timeout(80_000);
    await CommandUtils.resetDB(CommandUtils.pool);

    const tagName = "test";

    // Execute only one changeset to roll back to
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

    // Rollback time
    await LiquibaseGUITestUtils.startCommandExecution("Rollback to Tag");

    await input.setText(configurationName);
    await input.confirm();

    await input.setText(CommandUtils.CHANGELOG_FILE);
    await input.selectQuickPick(1);

    await input.setText(ContextOptions.LOAD_ALL_CONTEXT);
    await input.confirm();

    await wait();

    await input.toggleAllQuickPicks(true);
    await input.confirm();

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
  });

  /**
   * Teardown function that runs after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
