import assert from "assert";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils } from "../CommandUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";

/**
 * Test suite for the 'validate' command.
 */
suite("Validate", function () {
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
   * Test case for executing the 'validate' command.
   */
  test("should execute 'validate' command", async function () {
    this.timeout(40_000);

    const input = await LiquibaseGUITestUtils.startCommandExecution("validate");

    await input.setText(configurationName);
    await input.confirm();

    await input.setText(CommandUtils.CHANGELOG_FILE);
    await input.selectQuickPick(1);

    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'validate' was executed successfully.")
    );
  });

  /**
   * Teardown function that runs after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
