import assert from "assert";
import { InputBox } from "vscode-extension-tester";
import { DockerTestUtils } from "../../../suite/DockerTestUtils";
import { CommandUtils, openAndSelectRMBItemFromChangelog, wait } from "../../CommandUtils";
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
   * Sets up the test suite.
   */
  suiteSetup(async function () {
    this.timeout(50_000);
    configurationName = await CommandUtils.setupTests();
  });

  /**
   * Test case for executing the 'status' command.
   */
  test("should execute 'status' command", async function () {
    this.timeout(50_000);
    await CommandUtils.resetDB(CommandUtils.pool);

    await openAndSelectRMBItemFromChangelog("Status");

    const input = await InputBox.create(50000);

    await wait();

    await input.setText(configurationName);
    await input.confirm();

    await input.setText(CommandUtils.noContext);
    await input.confirm();

    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'status' was executed successfully."),
      "Notification did NOT show"
    );
  });

  /**
   * Cleans up the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
