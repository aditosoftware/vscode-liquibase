import assert from "node:assert";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";

/**
 * Test suite for the 'validate' command.
 */
suite("Validate", function () {
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
   * Test case for executing the 'validate' command.
   */
  test("should execute 'validate' command", async function () {
    await LiquibaseGUITestUtils.startCommandExecution({
      command: "validate...",
      configurationName,
      changelogFile: true,
    });

    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'validate' was executed successfully.")
    );
  });

  /**
   * Teardown function that runs after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
