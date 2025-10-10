import assert from "node:assert";
import { LiquibaseGUITestUtils } from "../../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../../suite/DockerTestUtils";

/**
 * Test suite for the Right Click Menu functionality.
 */
suite("validate: Right Click Menu", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Sets up the test suite by creating a configuration.
   */
  suiteSetup(async function () {
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  /**
   * Teardown function that runs after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });

  for (const pArgument of LiquibaseGUITestUtils.createRmbArguments("Validate...")) {
    /**
     * Test case to execute the 'validate' command from RMB.
     * It resets the database, opens the Right Click Menu, selects the 'Validate' option,
     * enters the configuration name, and verifies the success notification.
     */
    test(`should execute 'validate' command from ${pArgument.description}`, async function () {
      await pArgument.command(this, configurationName);

      assert.ok(
        await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'validate' was executed successfully."),
        "Notification did NOT show"
      );
    });
  }
});
