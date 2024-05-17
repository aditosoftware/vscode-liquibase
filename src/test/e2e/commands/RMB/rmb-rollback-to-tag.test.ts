import { CommandUtils, openAndSelectRMBItemFromChangelog, wait } from "../../CommandUtils";
import { DockerTestUtils } from "../../../suite/DockerTestUtils";
import path from "path";
import { LiquibaseGUITestUtils } from "../../LiquibaseGUITestUtils";
import assert from "assert";

/**
 * Test suite for the "Rollback to Tag" command in the Right Click Menu.
 */
suite("Right Click Menu", function () {
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
   * Test case for executing the "rollback-to-tag" command.
   */
  test("should execute 'rollback-to-tag' command", async function () {
    this.timeout(80_000);
    await CommandUtils.resetDB(CommandUtils.pool);

    const tagName = "test";

    const input = await LiquibaseGUITestUtils.startCommandExecution("update");

    await input.setText(configurationName);
    await input.confirm();

    await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
    await input.selectQuickPick(1);

    await input.setText(CommandUtils.loadAllContext);
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

    await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
    await input.selectQuickPick(1);

    await input.setText(CommandUtils.recentContext);
    await input.confirm();

    await wait();

    await input.toggleAllQuickPicks(true);
    await input.confirm();

    await wait();

    await openAndSelectRMBItemFromChangelog("Rollback to Tag");
    await wait();

    await input.setText(configurationName);
    await input.confirm();

    await input.setText(CommandUtils.loadAllContext);
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
  });

  /**
   * Teardown function that runs after all tests in the suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
