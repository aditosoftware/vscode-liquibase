import assert from "assert";
import { DockerTestUtils } from "../../../suite/DockerTestUtils";
import { LiquibaseGUITestUtils } from "../../LiquibaseGUITestUtils";
import { ContextOptions } from "../../../../constants";

/**
 * Test suite for the Right Click Menu functionality.
 */
suite("status: Right Click Menu", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Sets up the test suite.
   */
  suiteSetup(async function () {
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  LiquibaseGUITestUtils.createRmbArguments("Status", ContextOptions.NO_CONTEXT).forEach((pArgument) => {
    /**
     * Test case for executing the 'status' command from RMB.
     */
    test(`should execute 'status' command from ${pArgument.description}`, async function () {
      await pArgument.command(this, configurationName);

      assert.ok(
        await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'status' was executed successfully."),
        "Notification did NOT show"
      );
    });
  });

  /**
   * Cleans up the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
