import path from "path";
import assert from "assert";
import fs from "fs";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils, wait } from "../CommandUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";

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
    configurationName = await CommandUtils.setupTests();
  });

  /**
   * Test the execution of the 'Update SQL' command.
   */
  test("should execute 'Update SQL' command", async function () {
    this.timeout(80_000);

    const input = await LiquibaseGUITestUtils.startCommandExecution("update");

    await input.setText(configurationName);
    await input.confirm();

    await input.setText(CommandUtils.CHANGELOG_FILE);
    await input.selectQuickPick(1);

    await input.setText(CommandUtils.loadAllContext);
    await input.confirm();

    await wait();

    await input.setText("foo");
    await input.toggleAllQuickPicks(true);
    await input.confirm();

    await wait();

    // Execute only one changeset to roll back to
    await LiquibaseGUITestUtils.startCommandExecution("Generate SQL File for incoming changes");

    await input.setText(configurationName);
    await input.confirm();

    await input.setText(CommandUtils.CHANGELOG_FILE);
    await input.selectQuickPick(1);

    await input.setText(CommandUtils.loadAllContext);
    await input.confirm();

    await wait();

    await input.toggleAllQuickPicks(true);
    await input.confirm();

    await CommandUtils.selectFolder(input, path.join(CommandUtils.WORKSPACE_PATH, "myFolder")); // TODO dynamischer output

    await wait();

    await input.setText("update.sql");
    await input.confirm();

    await wait();

    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'update-sql' was executed successfully."),
      "Notification did NOT show up"
    );
    assert.ok(
      fs.existsSync(path.join(CommandUtils.WORKSPACE_PATH, "myFolder", "update.sql")),
      "Did NOT create a SQL File"
    );
  });

  /**
   * Clean up after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
