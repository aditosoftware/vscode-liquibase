import assert from "assert";
import { DockerTestUtils } from "../../../suite/DockerTestUtils";
import { LiquibaseGUITestUtils } from "../../LiquibaseGUITestUtils";
import { ContextOptions } from "../../../../constants";

/**
 * Test suite for the Right Click Menu functionality.
 */
suite("unexpected-changesets: Right Click Menu", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Sets up the test suite before running any tests.
   */
  suiteSetup(async function () {
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  LiquibaseGUITestUtils.createRmbArguments("Unexpected Changesets", ContextOptions.NO_CONTEXT).forEach((pArgument) => {
    /**
     * Test case for executing the 'Unexpected Changesets' command from RMB.
     */
    test(`should execute 'Unexpected Changesets' command from ${pArgument.description}`, async function () {
      await pArgument.command(configurationName);

      assert.ok(
        await LiquibaseGUITestUtils.waitForCommandExecution(
          "Liquibase command 'unexpected-changesets' was executed successfully."
        ),
        "Notification did NOT show"
      );
    });
  });

  /**
   * Cleans up the test suite after running all tests.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
