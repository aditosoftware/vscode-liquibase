import path from "path";
import fs from "fs";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import chai from "chai";
import chaiFs from "chai-fs";

chai.use(chaiFs);

/**
 * Test suite for the "generate changelog" command.
 */
suite("generate changelog", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  const temporaryFolder = LiquibaseGUITestUtils.generateTemporaryFolder();

  /**
   * Setup function that runs before the test suite.
   */
  suiteSetup(async function () {
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  /**
   * Teardown function that runs after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();

    fs.rmSync(temporaryFolder, { recursive: true });
  });

  /**
   * Test case for executing the "generate changelog" command.
   */
  test("should execute 'generate changelog' command", async function () {
    await DockerTestUtils.resetDB();

    LiquibaseGUITestUtils.removeContentOfFolder(temporaryFolder);

    await DockerTestUtils.executeMariaDBSQL(
      "CREATE TABLE test_table (column1 char(36), column2 varchar(255))",
      DockerTestUtils.createPool("data")
    );

    const input = await LiquibaseGUITestUtils.startCommandExecution({
      command: "generate changelog...",
      configurationName,
    });

    await LiquibaseGUITestUtils.selectFolder(input, temporaryFolder);

    // name of the changelog, just use the default
    await input.confirm();

    // diff-types
    await input.confirm();

    await input.setText("test_table");
    await input.confirm();

    await LiquibaseGUITestUtils.waitForCommandExecution(
      "Liquibase command 'generate-changelog' was executed successfully"
    );
    const newChangelog = path.join(temporaryFolder, "changelog.xml");
    await LiquibaseGUITestUtils.waitUntil(
      () => fs.existsSync(newChangelog),
      `New changelog should exist at ${newChangelog}`
    );
    chai.assert.pathExists(newChangelog);
  });

  /**
   * Test case for executing the "generate changelog" command without any table names.
   */
  test("should execute 'generate changelog' command and create changelog with all available tables", async function () {
    await DockerTestUtils.resetDB();

    LiquibaseGUITestUtils.removeContentOfFolder(temporaryFolder);

    await DockerTestUtils.executeMariaDBSQL(
      "CREATE TABLE test_table (column1 char(36), column2 varchar(255))",
      DockerTestUtils.createPool("data")
    );

    const input = await LiquibaseGUITestUtils.startCommandExecution({
      command: "generate changelog...",
      configurationName,
    });

    await LiquibaseGUITestUtils.selectFolder(input, temporaryFolder);

    // name of the changelog, just use the default
    await input.confirm();

    // diff-types
    await input.confirm();

    await input.setText("");
    await input.confirm();

    await LiquibaseGUITestUtils.waitForCommandExecution(
      "Liquibase command 'generate-changelog' was executed successfully"
    );
    const newChangelog = path.join(temporaryFolder, "changelog.xml");
    await LiquibaseGUITestUtils.waitUntil(
      () => fs.existsSync(newChangelog),
      `New changelog should exist at ${newChangelog}`
    );
    chai.assert.pathExists(newChangelog);
  });
});
