import assert from "assert";
import { InputBox, ModalDialog, StatusBar } from "vscode-extension-tester";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils, wait } from "../CommandUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";

/**
 * Test suite for the 'drop-all' command.
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
    configurationName = await CommandUtils.setupTests();
  });

  /**
   * Test case for not clearing the output after the 'drop-all' command.
   */
  test("should not clear output after 'drop-all' command", async function () {
    this.timeout(40_000);

    await LiquibaseGUITestUtils.setSetting("liquibase.clearOutputChannelOnStart", false);

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

    await center.openCommandPrompt();

    await wait();

    // execute our command
    await prompt.setText(">Liquibase: " + "create tag");
    await prompt.confirm();

    await input.setText(configurationName);
    await input.confirm();

    await input.setText("test");
    await input.confirm();

    await wait();

    assert.ok(
      (await CommandUtils.outputPanel.getText()).includes("Liquibase command 'drop-all' will be executed"), "Output channel should be empty after 'drop-all' command"
    );

  });

  /**
   * Test case for clearing the output after the 'drop-all' command.
   */
  test("should clear output after 'drop-all' command", async function () {
    this.timeout(40_000);
    
    await LiquibaseGUITestUtils.setSetting("liquibase.clearOutputChannelOnStart", true);

    const center = await LiquibaseGUITestUtils.clearNotifications();
    const prompt = await center.openCommandPrompt();
    const input = await InputBox.create();

    // execute our command
    await prompt.setText(">Liquibase: " + "drop-all");
    await wait(2_000);
    await prompt.confirm();

    // then wait until the Activating Extensions from the status bar disappears
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

    await center.openCommandPrompt();

    await wait();

    // execute our command
    await prompt.setText(">Liquibase: " + "create tag");
    await wait(2_000);
    await prompt.confirm();


    await input.setText(configurationName);
    await input.confirm();

    await input.setText("test");
    await input.confirm();

    await wait();

    assert.ok(
      !(await CommandUtils.outputPanel.getText()).includes("Liquibase command 'drop-all' will be executed"), "Output channel should be empty after 'drop-all' command"
    );
  });

  /**
   * Cleans up the test suite after running all tests.
   */
  suiteTeardown(async () => {
    await LiquibaseGUITestUtils.setSetting("liquibase.clearOutputChannelOnStart", true);
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
