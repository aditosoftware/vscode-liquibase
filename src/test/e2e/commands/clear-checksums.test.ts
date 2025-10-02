import assert from "node:assert";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { suiteTeardown } from "mocha";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { ContextOptions } from "../../../constants";

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
  test("should execute 'Clear Checksums'", async function () {
    await DockerTestUtils.resetDB();

    // execute an update
    await LiquibaseGUITestUtils.executeUpdate(configurationName, ContextOptions.LOAD_ALL_CONTEXT);

    // and then clear the checksums
    await LiquibaseGUITestUtils.startCommandExecution({
      command: "Clear the checksums of all changelogs in the database...",
      configurationName,
    });

    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution(
        "Liquibase command 'clear-checksums' was executed successfully."
      )
    );
  });

  /**
   * Clean up after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
