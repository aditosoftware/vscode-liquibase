import path from "path";
import assert from "assert";
import fs from "fs";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";

/**
 * Test suite for the "generate changelog" command.
 */
suite("generate changelog", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Setup function that runs before the test suite.
   */
  suiteSetup(async function () {
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  /**
   * Test case for executing the "generate changelog" command.
   */
  test("should execute 'generate changelog' command", async function () {
    await DockerTestUtils.resetDB();

    const temporaryFolder = LiquibaseGUITestUtils.generateTemporaryFolder();

    await DockerTestUtils.executeMariaDBSQL(
      "CREATE TABLE test_table (column1 char(36), column2 varchar(255))",
      DockerTestUtils.createPool("data")
    );

    const input = await LiquibaseGUITestUtils.startCommandExecution({
      command: "generate changelog",
      configurationName,
    });

    await LiquibaseGUITestUtils.selectFolder(input, temporaryFolder);

    // name of the changelog, just use the default
    await input.confirm();

    await LiquibaseGUITestUtils.waitForCommandExecution(
      "Liquibase command 'generate-changelog' was executed successfully"
    );
    assert.ok(fs.existsSync(path.join(temporaryFolder, "changelog.xml")), "File does NOT exist");
  });

  /**
   * Teardown function that runs after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
