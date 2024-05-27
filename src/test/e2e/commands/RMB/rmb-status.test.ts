import assert from "assert";
import { InputBox } from "vscode-extension-tester";
import { DockerTestUtils } from "../../../suite/DockerTestUtils";
import { LiquibaseGUITestUtils } from "../../LiquibaseGUITestUtils";
import { ContextOptions } from "../../../../constants";

/**
 * Test suite for the Right Click Menu functionality.
 */
suite("status: Right Click Menu", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Sets up the test suite.
   */
  suiteSetup(async function () {
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  /**
   * Test case for executing the 'status' command from RMB in file.
   */
  test("should execute 'status' command from RMB in file", async function () {
    await executeCommand(configurationName, () => LiquibaseGUITestUtils.openAndSelectRMBItemFromChangelog("Status"));
  });

  /**
   * Test case for executing the 'status' command from RMB in file explorer.
   */
  test("should execute 'status' command from RMB in file explorer", async function () {
    await executeCommand(configurationName, () =>
      LiquibaseGUITestUtils.openAndSelectRMBItemFromChangelogFromExplorer("Status")
    );
  });

  /**
   * Cleans up the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
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

  await input.setText(ContextOptions.NO_CONTEXT);
  await input.confirm();

  assert.ok(
    await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'status' was executed successfully."),
    "Notification did NOT show"
  );
}
