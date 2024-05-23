import assert from "assert";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils, wait } from "../CommandUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { ContextOptions } from "../../../constants";

/**
 * Test suite for testing unexpected changesets.
 */
suite("Unexpected Changesets", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Setup function that runs before the test suite.
   */
  suiteSetup(async function () {
    this.timeout(50_000);
    configurationName = await CommandUtils.setupTests();
  });

  /**
   * Test function that executes the 'Unexpected Changesets' command with different context types.
   */
  CommandUtils.matrixExecution((option, exec, key) => {
    test(
      "should execute 'Unexpected Changesets' with context type '" + option + "' command with " + key,
      async function () {
        this.timeout(40_000);
        await DockerTestUtils.resetDB();

        const input = await LiquibaseGUITestUtils.startCommandExecution("unexpected changesets");

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
        await wait();
        await wait();

        //TODO: SQL query to check if it was right
        assert.ok(
          await LiquibaseGUITestUtils.waitForCommandExecution(
            "Liquibase command 'unexpected-changesets' was executed successfully."
          )
        );
      }
    );
  });

  /**
   * Teardown function that runs after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
