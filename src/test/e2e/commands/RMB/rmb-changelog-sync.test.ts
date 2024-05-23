import assert from "assert";
import {
  CommandUtils,
  wait,
  openAndSelectRMBItemFromChangelog,
  openAndSelectRMBItemFromChangelogFromExplorer,
} from "../../CommandUtils";
import { LiquibaseGUITestUtils } from "../../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../../suite/DockerTestUtils";
import { InputBox } from "vscode-extension-tester";
import { ContextOptions } from "../../../../constants";

/**
 * Test suite for the Right Click Menu functionality.
 */
suite("changelog-sync: Right Click Menu", function () {
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
   * Test case for executing the 'changelog sync' command via RMB in a file.
   */
  test("should execute 'changelog sync' command from RMB in file", async function () {
    this.timeout(50_000);
    await executeCommand(configurationName, () => openAndSelectRMBItemFromChangelog("Changelog Sync"));
  });

  /**
   * Test case for executing the 'changelog sync' command via RMB in the file explorer.
   */
  test("should execute 'changelog sync' command from RMB in file explorer", async function () {
    this.timeout(50_000);
    await executeCommand(configurationName, () => openAndSelectRMBItemFromChangelogFromExplorer("Changelog Sync"));
  });

  /**
   * Teardown function that runs after the test suite.
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

  await wait();
  await contextMenuFunction();
  await wait();

  const input = await InputBox.create(50000);

  await input.setText(configurationName);
  await input.confirm();

  await input.setText(ContextOptions.NO_CONTEXT);
  await input.confirm();

  await wait();

  assert.ok(
    await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'changelog-sync' was executed successfully.")
  );
}
