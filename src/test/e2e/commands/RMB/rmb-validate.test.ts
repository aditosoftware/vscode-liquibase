import assert from "assert";
import { InputBox } from "vscode-extension-tester";
import { DockerTestUtils } from "../../../suite/DockerTestUtils";
import { CommandUtils, openAndSelectRMBItem, wait } from "../../CommandUtils";
import { LiquibaseGUITestUtils } from "../../LiquibaseGUITestUtils";

/**
 * Test suite for the Right Click Menu functionality.
 */
suite("Right Click Menu", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Sets up the test suite by creating a configuration.
   */
  suiteSetup(async function () {
    this.timeout(50_000);
    configurationName = await CommandUtils.setupTests();
  });

  /**
   * Test case to execute the 'validate' command.
   * It resets the database, opens the Right Click Menu, selects the 'Validate' option,
   * enters the configuration name, and verifies the success notification.
   */
  test("should execute 'validate' command", async function () {
    this.timeout(50_000);
    await CommandUtils.resetDB(CommandUtils.pool);

    await openAndSelectRMBItem("Validate");

    const input = await InputBox.create(50000);

    await wait();

    await input.setText(configurationName);
    await input.confirm();

    await wait();

    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'validate' was executed successfully."),
      "Notification did NOT show"
    );
  });

  /**
   * Cleans up the test suite by stopping and removing the Docker container.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
