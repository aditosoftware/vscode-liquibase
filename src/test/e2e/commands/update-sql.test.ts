import path from "node:path";
import assert from "node:assert";
import fs from "node:fs";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { ContextOptions } from "../../../constants";
import { EditorView } from "vscode-extension-tester";
import chai from "chai";
import chaiFs from "chai-fs";

chai.use(chaiFs);

/**
 * Test suite for the 'update-sql' command.
 */
suite("Update-sql", function () {
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
   * Test the execution of the 'Update SQL' command.
   */
  test("should execute 'Update SQL' command", async function () {
    await new EditorView().closeAllEditors();

    LiquibaseGUITestUtils.removeContentOfFolder(temporaryFolder);

    // execute update to have some changes
    await LiquibaseGUITestUtils.executeUpdate(configurationName, ContextOptions.LOAD_ALL_CONTEXT, "foo");

    // execute the update-sql command
    const input = await LiquibaseGUITestUtils.startCommandExecution({
      command: "Generate SQL File for incoming changes...",
      configurationName,
      changelogFile: true,
    });

    await input.setText(ContextOptions.LOAD_ALL_CONTEXT);
    await input.confirm();
    await LiquibaseGUITestUtils.selectContext({ toggleAll: true });

    await LiquibaseGUITestUtils.selectFolder(input, temporaryFolder);

    await input.setText("update.sql");
    await input.confirm();

    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'update-sql' was executed successfully."),
      "Notification did NOT show up"
    );
    const updateFile = path.join(temporaryFolder, "update.sql");
    await LiquibaseGUITestUtils.waitUntil(
      () => fs.existsSync(updateFile),
      `SQL file should be created at ${updateFile}`,
      10000
    );
    chai.assert.pathExists(updateFile);
  });
});
