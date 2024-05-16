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
   * Setup function that runs before the test suite.
   */
  suiteSetup(async function () {
    this.timeout(50_000);
    configurationName = await CommandUtils.setupTests();
  });

  /**
   * Test case to execute the 'update' command.
   */
  test("should execute 'update' command", async function () {
    this.timeout(50_000);
    await CommandUtils.resetDB(CommandUtils.pool);

    await openAndSelectRMBItem("Update");

    const input = await InputBox.create(50000);

    await wait();

    await input.setText(configurationName);
    await input.confirm();

    await input.setText(CommandUtils.loadAllContext);
    await input.confirm();

    await wait();

    await input.toggleAllQuickPicks(true);
    await input.confirm();

    await wait();

    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'update' was executed successfully."),
      "Notification did NOT show"
    );
    assert.ok(
      (
        await DockerTestUtils.executeMariaDBSQL(
          CommandUtils.pool,
          "SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'person'"
        )
      )?.length >= 1,
      "Table 'person' DOES NOT exist, while it should"
    );
  });

  /**
   * Teardown function that runs after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
