import assert from "assert";
import { InputBox } from "vscode-extension-tester";
import { DockerTestUtils } from "../../../suite/DockerTestUtils";
import {
  CommandUtils,
  openAndSelectRMBItemFromChangelog,
  openAndSelectRMBItemFromChangelogFromExplorer,
  wait,
} from "../../CommandUtils";
import { LiquibaseGUITestUtils } from "../../LiquibaseGUITestUtils";
import { ContextOptions } from "../../../../constants";

/**
 * Test suite for the Right Click Menu functionality.
 */
suite("update: Right Click Menu", function () {
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
   * Test case to execute the 'update' command from RMB in file.
   */
  test("should execute 'update' command from RMB in file", async function () {
    this.timeout(50_000);
    await executeCommand(configurationName, () => openAndSelectRMBItemFromChangelog("Update"));
  });

  /**
   * Test case to execute the 'update' command from RMB in file explorer.
   */
  test("should execute 'update' command from RMB in file explorer", async function () {
    this.timeout(50_000);
    await executeCommand(configurationName, () => openAndSelectRMBItemFromChangelogFromExplorer("Update"));
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
  await CommandUtils.resetDB(CommandUtils.pool);

  await contextMenuFunction();

  const input = await InputBox.create(50000);

  await wait();

  await input.setText(configurationName);
  await input.confirm();

  await input.setText(ContextOptions.LOAD_ALL_CONTEXT);
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
}
