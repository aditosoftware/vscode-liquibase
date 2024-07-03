import assert from "assert";
import { ModalDialog } from "vscode-extension-tester";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import chai from "chai";
import chaiFs from "chai-fs";
import chaiString from "chai-string";

chai.use(chaiFs);
chai.use(chaiString);

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

    // check if no data is in database
    const databaseInformation = await DockerTestUtils.executeMariaDBSQL(
      "SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'person'"
    );
    assert.strictEqual(
      databaseInformation.length,
      0,
      `Table 'person' DOES exist, while it shouldn't: ${databaseInformation}`
    );

    const outputPanelText = await LiquibaseGUITestUtils.outputPanel.getText();

    chai.expect(outputPanelText).to.contain("--requireForce --force");
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
 *
 * @param configurationName - the name of the configuration that should be dropped
 * @param buttonPushed - the button that should be pushed in the modalDialog
 * @param result - the expected result, if the drop-all was successfully done
 */
async function executeDropAll(
  configurationName: string,
  buttonPushed: "Drop-all" | "Cancel",
  result: boolean
): Promise<void> {
  await LiquibaseGUITestUtils.startCommandExecution({ command: "drop-all", configurationName });

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
