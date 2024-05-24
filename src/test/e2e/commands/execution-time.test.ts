import assert from "assert";
import { InputBox, ModalDialog, StatusBar } from "vscode-extension-tester";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { wait } from "../CommandUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";

/**
 * Test suite for the execution time functionality.
 */
suite("Clear Output Channel On Start", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Sets up the test suite before running any tests.
   */
  suiteSetup(async function () {
    this.timeout(50_000);
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  /**
   * Test case showing the execution time after the 'drop-all' command.
   */
  test("should not clear output after 'drop-all' command", async function () {
    this.timeout(40_000);

    const center = await LiquibaseGUITestUtils.clearNotifications();
    const prompt = await center.openCommandPrompt();
    const input = await InputBox.create();

    await prompt.setText(">Liquibase: " + "drop-all");
    await wait(2_000);
    await prompt.confirm();

    for (let i = 0; i < 10; i++) {
      const activateProgress = await new StatusBar().getItem("Activating Extensions...");
      if (activateProgress) {
        await wait(1_000);
      } else {
        break;
      }
    }

    await input.setText(configurationName);
    await input.confirm();

    const modalDialog = new ModalDialog();
    await modalDialog.pushButton("Drop-all");

    await wait();

    assert.ok(
      (await LiquibaseGUITestUtils.outputPanel.getText()).includes("Liquibase command 'drop-all' finished in"),
      "Output channel should show execution time"
    );
  });

  /**
   * Cleans up the test suite after running all tests.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
