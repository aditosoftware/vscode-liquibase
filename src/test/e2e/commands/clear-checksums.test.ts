import assert from "assert";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { suiteTeardown } from "mocha";
import { DockerTestUtils } from "../../suite/DockerTestUtils";

/**
 * Test suite for the "Clear Checksums" command.
 */
suite("Clear Checksums", function () {
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
   * Test case for executing the "Clear Checksums" command with different context types and commands.
   */
  LiquibaseGUITestUtils.matrixExecution((option, exec, key) => {
    test("should execute 'Clear Checksums' with context type '" + option + "' command with " + key, async function () {
      await DockerTestUtils.resetDB();

      // execute an update
      const input = await LiquibaseGUITestUtils.startCommandExecution({
        pCommand: "update",
        configurationName,
        changelogFile: true,
      });
      await LiquibaseGUITestUtils.selectContextsInMatrixExecution(input, option, exec);

      // and then clear the checksums
      await LiquibaseGUITestUtils.startCommandExecution({ pCommand: "Clear Checksums", configurationName });

      assert.ok(
        await LiquibaseGUITestUtils.waitForCommandExecution(
          "Liquibase command 'clear-checksums' was executed successfully."
        )
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