import assert from "assert";
import { ModalDialog } from "vscode-extension-tester";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";

/**
 * Test suite for the 'drop-all' command.
 */
suite("Drop-all", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Sets up the test suite before running any tests.
   */
  suiteSetup(async function () {
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  /**
   * Test case for executing the 'drop-all' command.
   */
  test("should execute 'drop-all' command", async function () {
    await executeDropAll(configurationName, "Drop-all", true);

    //TODO: add comparison to db to check if everything was removed
  });

  /**
   * Test case for cancelling the execution of the 'drop-all' command.
   */
  test("should cancel execute 'drop-all' command", async function () {
    await executeDropAll(configurationName, "Cancel", false);
  });

  /**
   * Cleans up the test suite after running all tests.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});

/**
 * Executed the drop all command.
 * @param configurationName - the name of the configuration that should be dropped
 * @param buttonPushed - the button that should be pushed in the modalDialog
 * @param result - the expected result, if the drop-all was successfully done
 */
async function executeDropAll(
  configurationName: string,
  buttonPushed: "Drop-all" | "Cancel",
  result: boolean
): Promise<void> {
  await LiquibaseGUITestUtils.startCommandExecution({ pCommand: "drop-all", configurationName });

  const modalDialog = new ModalDialog();
  await modalDialog.pushButton(buttonPushed);

  assert.strictEqual(
    await LiquibaseGUITestUtils.waitForCommandExecution(
      "Liquibase command 'drop-all' was executed successfully.",
      false
    ),
    result
  );
}