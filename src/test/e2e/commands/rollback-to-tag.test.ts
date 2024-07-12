import assert from "assert";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
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
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  /**
   * Test case for executing the "Rollback to Tag" command.
   */
  test("should execute 'Rollback to Tag' command", async function () {
    await DockerTestUtils.resetDB();

    const tagName = "test";

    // Execute only one changeset to roll back to
    await LiquibaseGUITestUtils.executeUpdate(configurationName, ContextOptions.LOAD_ALL_CONTEXT, "foo");

    // Set tag
    await LiquibaseGUITestUtils.executeCreateTag(configurationName, tagName);

    // Update all datasets
    await LiquibaseGUITestUtils.executeUpdate(configurationName, ContextOptions.USE_RECENTLY_LOADED);

    // Rollback time
    const input = await LiquibaseGUITestUtils.startCommandExecution({
      command: "Rollback to Tag...",
      configurationName,
      changelogFile: true,
    });

    await input.setText(ContextOptions.LOAD_ALL_CONTEXT);
    await input.confirm();
    await LiquibaseGUITestUtils.selectContext({ toggleAll: true });

    await input.setText(tagName);
    await input.confirm();

    // Check if the message is popping up
    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'rollback' was executed successfully.")
    );
    assert.ok(
      (await DockerTestUtils.executeMariaDBSQL("SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'company'"))
        ?.length === 0,
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
