import path from "node:path";
import assert from "node:assert";
import fs from "node:fs";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { randomUUID } from "node:crypto";
import chai from "chai";
import chaiFs from "chai-fs";

chai.use(chaiFs);

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
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  /**
   * This test verifies that the 'db-doc' command is executed successfully.
   * It sets up a temporary database, generates documentation using Liquibase, and checks for the existence of the generated documentation file.
   */
  test("should execute 'db-doc' command", async function () {
    const dbDocFolder = path.join(LiquibaseGUITestUtils.WORKSPACE_PATH, "output", randomUUID());
    fs.mkdirSync(dbDocFolder);

    // Reset the temporary database to ensure a clean state.
    await DockerTestUtils.resetDB();

    // Prepare input for the command execution.
    const input = await LiquibaseGUITestUtils.startCommandExecution({
      command: "Generate database documentation (db-doc)...",
      configurationName,
      changelogFile: true,
    });

    // Set the output directory for the generated documentation.
    await LiquibaseGUITestUtils.selectFolder(input, dbDocFolder);

    // Assert that the 'db-doc' command was executed successfully.
    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'db-doc' was executed successfully.")
    );

    // Assert that a file of the generated documentation exists.
    const dbDocIndex = path.join(dbDocFolder, "index.html");
    await LiquibaseGUITestUtils.waitUntil(() => fs.existsSync(dbDocIndex), "db-doc index file should exists");
    chai.assert.pathExists(dbDocFolder);
  });

  /**
   * Cleans up the test suite by stopping and removing the Docker container.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
