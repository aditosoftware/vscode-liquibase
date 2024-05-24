import assert from "assert";
import { InputBox } from "vscode-extension-tester";
import { LiquibaseGUITestUtils } from "../../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../../suite/DockerTestUtils";

/**
 * Test suite for the Right Click Menu functionality.
 */
suite("validate: Right Click Menu", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Sets up the test suite by creating a configuration.
   */
  suiteSetup(async function () {
    this.timeout(50_000);
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  /**
   * Teardown function that runs after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });

  /**
   * Test case to execute the 'validate' command from RMB in file.
   * It resets the database, opens the Right Click Menu, selects the 'Validate' option,
   * enters the configuration name, and verifies the success notification.
   */
  test("should execute 'validate' command from RMB in file", async function () {
    this.timeout(50_000);
    await executeCommand(configurationName, () => LiquibaseGUITestUtils.openAndSelectRMBItemFromChangelog("Validate"));
  });

  /**
   * Test case to execute the 'validate' command from RMB in file explorer.
   * It resets the database, opens the Right Click Menu, selects the 'Validate' option,
   * enters the configuration name, and verifies the success notification.
   */
  test("should execute 'validate' command from RMB in file explorer", async function () {
    this.timeout(50_000);
    await executeCommand(configurationName, () => LiquibaseGUITestUtils.openAndSelectRMBItemFromChangelog("Validate"));
  });
});

/**
 * Executes the command.
 * @param configurationName - the name of the configuration
 * @param contextMenuFunction - the function to call the context menu
 */
async function executeCommand(configurationName: string, contextMenuFunction: () => Promise<void>): Promise<void> {
  await DockerTestUtils.resetDB();

  await contextMenuFunction();

  const input = new InputBox();

  await input.setText(configurationName);
  await input.confirm();

  assert.ok(
    await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'validate' was executed successfully."),
    "Notification did NOT show"
  );
}
