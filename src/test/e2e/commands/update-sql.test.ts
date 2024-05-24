import path from "path";
import assert from "assert";
import fs from "fs";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { ContextOptions } from "../../../constants";

/**
 * Test suite for the 'update-sql' command.
 */
suite("Update-sql", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Set up the test suite.
   */
  suiteSetup(async function () {
    this.timeout(50_000);
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  /**
   * Test the execution of the 'Update SQL' command.
   */
  test("should execute 'Update SQL' command", async function () {
    this.timeout(80_000);

    const temporaryFolder = LiquibaseGUITestUtils.generateTemporaryFolder();

    // execute update to have some changes
    await LiquibaseGUITestUtils.executeUpdate(configurationName, ContextOptions.LOAD_ALL_CONTEXT, "foo");

    // execute the update-sql command
    const input = await LiquibaseGUITestUtils.startCommandExecution("Generate SQL File for incoming changes");

    await input.setText(configurationName);
    await input.confirm();

    await input.setText(LiquibaseGUITestUtils.CHANGELOG_FILE);
    await input.selectQuickPick(1);

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
    assert.ok(fs.existsSync(path.join(temporaryFolder, "update.sql")), "Did NOT create a SQL File");
  });

  /**
   * Clean up after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
