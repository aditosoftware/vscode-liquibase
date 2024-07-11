import assert from "assert";
import { ModalDialog } from "vscode-extension-tester";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";

/**
 * Test suite for the execution time functionality.
 */
suite("Execution time", function () {
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
   * Test case showing the execution time after the 'drop-all' command.
   */
  test("should show execution time after command execution", async function () {
    await LiquibaseGUITestUtils.startCommandExecution({ command: "drop-all...", configurationName });

    const modalDialog = new ModalDialog();
    await modalDialog.pushButton("Drop-all");

    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'drop-all' was executed successfully.")
    );

    const outputPanelText = await LiquibaseGUITestUtils.outputPanel.getText();
    assert.match(outputPanelText, /Liquibase command 'drop-all' finished in \d{2}:\d{2}:\d{3} min/);
  });

  /**
   * Cleans up the test suite after running all tests.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
