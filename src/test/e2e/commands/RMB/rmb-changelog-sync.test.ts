import assert from "assert";
import { CommandUtils, wait, openAndSelectRMBItemFromChangelog } from "../../CommandUtils";
import { LiquibaseGUITestUtils } from "../../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../../suite/DockerTestUtils";
import { InputBox } from "vscode-extension-tester";

/**
 * Test suite for the Right Click Menu functionality.
 */
suite("Right Click Menu", function () {
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
   * Test case for executing the 'changelog sync' command.
   */
  test("should execute 'changelog sync' command", async function () {
    this.timeout(50_000);
    await CommandUtils.resetDB(CommandUtils.pool);

    await wait();
    await openAndSelectRMBItemFromChangelog("Changelog Sync");
    await wait();

    const input = await InputBox.create(50000);

    await input.setText(configurationName);
    await input.confirm();

    await input.setText(CommandUtils.noContext);
    await input.confirm();

    await wait();

    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution(
        "Liquibase command 'changelog-sync' was executed successfully."
      )
    );
  });

  /**
   * Teardown function that runs after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
