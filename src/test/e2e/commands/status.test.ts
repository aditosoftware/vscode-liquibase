import assert from "assert";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";

/**
 * Test suite for the 'status' command.
 */
suite("Status", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Set up the test suite.
   */
  suiteSetup(async function () {
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  /**
   * Test the 'status' command with different context types and options.
   */
  LiquibaseGUITestUtils.matrixExecution((option, exec, key) => {
    test("should execute 'status' with context type '" + option + "' command with " + key, async function () {
      const input = await LiquibaseGUITestUtils.startCommandExecution({
        command: "status...",
        configurationName,
        changelogFile: true,
      });

      await LiquibaseGUITestUtils.selectContextsInMatrixExecution(input, option, exec);

      assert.ok(
        await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'status' was executed successfully.")
      );
    });
  });

  /**
   * Clean up after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
