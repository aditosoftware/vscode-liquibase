import assert from "assert";
import { LiquibaseGUITestUtils } from "../../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../../suite/DockerTestUtils";
import { ContextOptions } from "../../../../constants";

/**
 * Test suite for the Right Click Menu functionality.
 */
suite("changelog-sync: Right Click Menu", function () {
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
   * Test case for executing the 'changelog sync' command via RMB.
   */
  LiquibaseGUITestUtils.createRmbArguments(
    "Mark not deployed changelogs as executed (changelog-sync)...",
    ContextOptions.NO_CONTEXT
  ).forEach((pArgument) => {
    test(`should execute 'changelog sync' command from ${pArgument.description}`, async function () {
      await pArgument.command(this, configurationName);

      assert.ok(
        await LiquibaseGUITestUtils.waitForCommandExecution(
          "Liquibase command 'changelog-sync' was executed successfully."
        )
      );
    });
  });

  /**
   * Teardown function that runs after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
