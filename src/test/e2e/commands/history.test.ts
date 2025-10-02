import path from "node:path";
import fs from "node:fs";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { EditorView, TextEditor } from "vscode-extension-tester";
import chai from "chai";
import chaiFs from "chai-fs";
import chaiString from "chai-string";

chai.use(chaiFs);
chai.use(chaiString);

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
   * Clean up after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();

    fs.rmSync(temporaryFolder, { recursive: true });
  });

  /**
   * Test the 'history' command with TABULAR and TEXT output format.
   */
  ["TABULAR", "TEXT"].forEach((pHistoryOption) => {
    test(`should execute 'history' command as ${pHistoryOption}`, async function () {
      LiquibaseGUITestUtils.removeContentOfFolder(temporaryFolder);

      await new EditorView().closeAllEditors();

      const fileName = `history_${pHistoryOption}.txt`;

      const input = await LiquibaseGUITestUtils.startCommandExecution({
        command: "List all deployed changesets (history)...",
        configurationName,
      });

      await LiquibaseGUITestUtils.selectFolder(input, temporaryFolder);

      await input.setText(fileName);
      await input.confirm();

      await input.setText(pHistoryOption);
      await input.confirm();

      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'history' was executed successfully");

      const textEditor = new TextEditor();
      const filePath = await textEditor.getFilePath();

      chai.expect(filePath).to.contain(fileName);

      const historyFile = path.join(temporaryFolder, fileName);
      await LiquibaseGUITestUtils.waitUntil(
        () => fs.existsSync(historyFile),
        `History file ${historyFile} should exist`,
        10000
      );
      chai.assert.pathExists(historyFile);
    });
  });
});
