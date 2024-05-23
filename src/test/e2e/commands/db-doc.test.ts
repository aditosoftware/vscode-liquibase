import path from "path";
import assert from "assert";
import fs from "fs";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils } from "../CommandUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { randomUUID } from "crypto";

/**
 * This suite of tests is designed to validate the functionality of the 'db-doc' command.
 */
suite("db-doc", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Sets up the test suite by creating a configuration and setting the timeout.
   */
  suiteSetup(async function () {
    this.timeout(50_000);
    configurationName = await CommandUtils.setupTests();
  });

  /**
   * This test verifies that the 'db-doc' command is executed successfully.
   * It sets up a temporary database, generates documentation using Liquibase, and checks for the existence of the generated documentation file.
   */
  test("should execute 'db-doc' command", async function () {
    // Extend the timeout to accommodate potentially long-running Liquibase operations.
    this.timeout(80_000);

    const dbDocFolder = path.join(CommandUtils.WORKSPACE_PATH, "output", randomUUID());
    fs.mkdirSync(dbDocFolder);

    // Reset the temporary database to ensure a clean state.
    await CommandUtils.resetDB(CommandUtils.pool);

    // Prepare input for the command execution.
    const input = await LiquibaseGUITestUtils.startCommandExecution("Generate database documentation (db-doc)");

    await input.setText(configurationName);
    await input.confirm();

    // Set the path to the Liquibase changelog file.
    await input.setText(CommandUtils.CHANGELOG_FILE);
    await input.selectQuickPick(1);

    // Set the output directory for the generated documentation.
    await CommandUtils.selectFolder(input, dbDocFolder);

    // Assert that the 'db-doc' command was executed successfully.
    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'db-doc' was executed successfully.")
    );

    // Assert that a file of the generated documentation exists.
    assert.ok(fs.existsSync(path.join(dbDocFolder, "index.html")));
  });

  /**
   * Cleans up the test suite by stopping and removing the Docker container.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
