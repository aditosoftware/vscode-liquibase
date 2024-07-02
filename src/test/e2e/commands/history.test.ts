import path from "path";
import fs from "fs";
import assert from "assert";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { EditorView, TextEditor } from "vscode-extension-tester";

/**
 * Test suite for the 'history' command.
 */
suite("History", async function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  const temporaryFolder = LiquibaseGUITestUtils.generateTemporaryFolder();

  /**
   * Set up the test suite.
   */
  suiteSetup(async function () {
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  /**
   * Test the 'history' command with TABULAR and TEXT output format.
   */
  ["TABULAR", "TEXT"].forEach((pHistoryOption) => {
    test(`should execute 'history' command as ${pHistoryOption}`, async function () {
      await new EditorView().closeAllEditors();

      const fileName = `history_${pHistoryOption}.txt`;

      const input = await LiquibaseGUITestUtils.startCommandExecution({ command: "history", configurationName });

      await LiquibaseGUITestUtils.selectFolder(input, temporaryFolder);

      await input.setText(fileName);
      await input.confirm();

      await input.setText(pHistoryOption);
      await input.confirm();

      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'history' was executed successfully");

      const textEditor = new TextEditor();
      const filePath = await textEditor.getFilePath();

      assert.ok(filePath.includes(fileName), `Editor should be for our file: ${fileName}`);

      const historyFile = path.join(temporaryFolder, fileName);
      await LiquibaseGUITestUtils.waitUntil(
        () => fs.existsSync(historyFile),
        `History file ${historyFile} should exist`
      );
      assert.ok(fs.existsSync(historyFile), `History file ${historyFile} should exist`);
    });
  });

  /**
   * Clean up after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
