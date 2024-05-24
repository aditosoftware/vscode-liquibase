import assert from "assert";
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
    this.timeout(50_000);
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  /**
   * Test case for executing the "Clear Checksums" command with different context types and commands.
   */
  LiquibaseGUITestUtils.matrixExecution((option, exec, key) => {
    test("should execute 'Clear Checksums' with context type '" + option + "' command with " + key, async function () {
      this.timeout(40_000);
      await DockerTestUtils.resetDB();

      const input = await LiquibaseGUITestUtils.startCommandExecution("update");

      await input.setText(configurationName);
      await input.confirm();

      await input.setText(LiquibaseGUITestUtils.CHANGELOG_FILE);
      await input.selectQuickPick(1);

      if (option === ContextOptions.NO_CONTEXT) {
        await input.setText(option);
        await input.confirm();
      } else {
        await input.setText(option);
        await input.confirm();

        await exec();
      }

      await LiquibaseGUITestUtils.startCommandExecution("Clear Checksums");

      await input.setText(configurationName);
      await input.confirm();

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
