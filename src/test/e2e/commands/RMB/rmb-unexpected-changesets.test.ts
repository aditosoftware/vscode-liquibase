import assert from "assert";
import { InputBox } from "vscode-extension-tester";
import { DockerTestUtils } from "../../../suite/DockerTestUtils";
import { CommandUtils,  wait } from "../../CommandUtils";
import { LiquibaseGUITestUtils } from "../../LiquibaseGUITestUtils";
import { ContextOptions } from "../../../../constants";

/**
 * Test suite for the Right Click Menu functionality.
 */
suite("unexpected-changesets: Right Click Menu", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Sets up the test suite before running any tests.
   */
  suiteSetup(async function () {
    this.timeout(50_000);
    configurationName = await CommandUtils.setupTests();
  });

  /**
   * Test case for executing the 'Unexpected Changesets' command from RMB in file.
   */
  test("should execute 'Unexpected Changesets' command from RMB in file", async function () {
    this.timeout(50_000);
    await executeCommand(configurationName, () =>
      CommandUtils.openAndSelectRMBItemFromChangelog("Unexpected Changesets")
    );
  });

  /**
   * Test case for executing the 'Unexpected Changesets' command from RMB in file explorer.
   */
  test("should execute 'Unexpected Changesets' command from RMB in file explorer", async function () {
    this.timeout(50_000);
    await executeCommand(configurationName, () =>
      CommandUtils.openAndSelectRMBItemFromChangelog("Unexpected Changesets")
    );
  });

  /**
   * Cleans up the test suite after running all tests.
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

  const input = await InputBox.create(50000);

  await wait();

  await input.setText(configurationName);
  await input.confirm();

  await input.setText(ContextOptions.NO_CONTEXT);
  await input.confirm();

  assert.ok(
    await LiquibaseGUITestUtils.waitForCommandExecution(
      "Liquibase command 'unexpected-changesets' was executed successfully."
    ),
    "Notification did NOT show"
  );
}
