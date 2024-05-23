import assert from "assert";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils, wait } from "../CommandUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { ContextOptions } from "../../../constants";

/**
 * Test suite for the 'Changelog Sync' functionality.
 */
suite("Changelog Sync", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Sets up the test suite before running the tests.
   */
  suiteSetup(async function () {
    this.timeout(50_000);
    configurationName = await CommandUtils.setupTests();
  });

  /**
   * Executes the 'Changelog Sync' command with different context types and options.
   */
  CommandUtils.matrixExecution(CommandUtils.contextOptions, CommandUtils.contextFunctions, (option, exec, key) => {
    /**
     * Test case for executing the 'Changelog Sync' command with a specific context type and option.
     */
    test("should execute 'Changelog Sync' with context type '" + option + "' command with " + key, async function () {
      this.timeout(40_000);
      await CommandUtils.resetDB(CommandUtils.pool);

      const input = await LiquibaseGUITestUtils.startCommandExecution("Changelog Sync");

      await input.setText(configurationName);
      await input.confirm();

      await input.setText(CommandUtils.CHANGELOG_FILE);
      await input.selectQuickPick(1);

      if (option === ContextOptions.NO_CONTEXT) {
        await input.setText(option);
        await input.confirm();
      } else {
        await input.setText(option);
        await input.confirm();

        await exec();
      }

      await wait();

      assert.ok(
        await LiquibaseGUITestUtils.waitForCommandExecution(
          "Liquibase command 'changelog-sync' was executed successfully."
        )
      );
    });
  });

  /**
   * Cleans up the test suite after running the tests.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
