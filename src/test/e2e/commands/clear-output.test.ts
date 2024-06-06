import assert from "assert";
import { ModalDialog } from "vscode-extension-tester";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { randomUUID } from "crypto";

/**
 * Test suite for the 'clear' functionality and setting.
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
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  /**
   * Test case for not clearing the output after the 'drop-all' command.
   */
  test("should not clear output after 'drop-all' command", async function () {
    await LiquibaseGUITestUtils.setSetting("liquibase.clearOutputChannelOnStart", false);

    // execute a first command
    await executeDropAll(configurationName);

    // execute a second command
    await executeCreateTag(configurationName);

    // check that the text is still in the output from the first command.
    const outputPanelText = await LiquibaseGUITestUtils.outputPanel.getText();
    assert.match(outputPanelText, /Liquibase command 'drop-all' will be executed/);
  });

  /**
   * Test case for clearing the output after the 'drop-all' command.
   */
  test("should clear output after 'drop-all' command", async function () {
    await LiquibaseGUITestUtils.setSetting("liquibase.clearOutputChannelOnStart", true);

    // execute a first command
    await executeDropAll(configurationName);

    // execute a second command
    await executeCreateTag(configurationName);

    // check that there is no text of the first command in the output
    const outputPanelText = await LiquibaseGUITestUtils.outputPanel.getText();
    assert.doesNotMatch(outputPanelText, /Liquibase command 'drop-all' will be executed/);
  });

  /**
   * Cleans up the test suite after running all tests.
   */
  suiteTeardown(async () => {
    await LiquibaseGUITestUtils.setSetting("liquibase.clearOutputChannelOnStart", true);
    await DockerTestUtils.stopAndRemoveContainer();
  });
});

/**
 * Executes a 'drop-all' command.
 *
 * @param configurationName - the name of the configuration
 */
async function executeDropAll(configurationName: string): Promise<void> {
  await LiquibaseGUITestUtils.startCommandExecution({ command: "drop-all", configurationName });

  const modalDialog = new ModalDialog();
  await modalDialog.pushButton("Drop-all");

  assert.ok(
    await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'drop-all' was executed successfully.")
  );
}

/**
 * Executes a 'tag' command.
 *
 * @param configurationName - the name of the configuration
 */
async function executeCreateTag(configurationName: string): Promise<void> {
  const input = await LiquibaseGUITestUtils.startCommandExecution({ command: "create tag", configurationName });

  // input the tag name
  await input.setText(randomUUID());
  await input.confirm();

  assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'tag' was executed successfully."));
}
