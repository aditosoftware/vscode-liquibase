import path from "path";
import assert from "assert";
import fs from "fs";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils, wait } from "../CommandUtils";

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
    this.timeout(50_000);
    configurationName = await CommandUtils.setupTests();
  });

  /**
   * Test case for executing the "generate changelog" command.
   */
  test("should execute 'generate changelog' command", async function () {
    this.timeout(80_000);
    await DockerTestUtils.resetDB();

    const temporaryFolder = CommandUtils.generateTemporaryFolder();

    await DockerTestUtils.executeMariaDBSQL(
      "CREATE TABLE test_table (column1 char(36), column2 varchar(255))",
      DockerTestUtils.createPool("data")
    );

    const input = await LiquibaseGUITestUtils.startCommandExecution("generate changelog");

    await input.setText(configurationName);
    await input.confirm();

    await CommandUtils.selectFolder(input, temporaryFolder);

    // name of the changelog, just use the default
    await input.confirm();

    await wait(4000);

    assert.ok(fs.existsSync(path.join(temporaryFolder, "changelog.xml")), "File does NOT exist");
  });

  /**
   * Teardown function that runs after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
