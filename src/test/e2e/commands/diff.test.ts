import path from "path";
import assert from "assert";
import fs from "fs";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { ContextOptions } from "../../../constants";

/**
 * Test suite for the 'diff' command.
 */
suite("diff", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  const postgresPort = 5435;

  /**
   * Set up the test suite.
   */
  suiteSetup(async function () {
    configurationName = await LiquibaseGUITestUtils.setupTests();

    await DockerTestUtils.startContainer("postgres", postgresPort);
    await DockerTestUtils.checkContainerStatus("postgres");
  });

  /**
   * Test case for executing the 'diff' command.
   */
  test("should execute 'diff' command", async function () {
    await DockerTestUtils.resetDB();

    await DockerTestUtils.executeMariaDBSQL("CREATE SCHEMA data2");

    // for this test, we need a second configuration
    const secondConfiguration = await LiquibaseGUITestUtils.createConfiguration("MariaDB", 3310, "data2");

    await executeCommand("diffMariaDb.txt", configurationName, secondConfiguration);
  });

  /**
   * Test case for executing the 'diff' command for PostgreSQL.
   */
  test("should execute 'diff' command for postgres", async function () {
    await DockerTestUtils.resetDB();

    const secondConfiguration = await LiquibaseGUITestUtils.createConfiguration("PostgreSQL", postgresPort);

    await executeCommand("diffPostgres.txt", configurationName, secondConfiguration);
  });

  /**
   * Clean up after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
    await DockerTestUtils.stopAndRemoveContainer("postgres");
  });
});

/**
 * Executes the diff command.
 * @param fileName  - the file name where the diff should be written
 * @param configurationName - the name of the first configuration
 * @param secondConfiguration - the name of the second configuration
 */
async function executeCommand(fileName: string, configurationName: string, secondConfiguration: string): Promise<void> {
  const temporaryFolder = LiquibaseGUITestUtils.generateTemporaryFolder();

  await LiquibaseGUITestUtils.executeUpdate(configurationName, ContextOptions.LOAD_ALL_CONTEXT);

  const input = await LiquibaseGUITestUtils.startCommandExecution({ pCommand: "diff", configurationName });

  await input.setText(secondConfiguration);
  await input.confirm();

  await LiquibaseGUITestUtils.selectFolder(input, temporaryFolder);

  //name of file
  await input.setText(fileName);
  await input.confirm();

  //available types
  await input.confirm();

  assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'diff' was executed successfully"));
  const diffFile = path.join(temporaryFolder, fileName);
  assert.ok(
    await LiquibaseGUITestUtils.waitUntil(() => fs.existsSync(diffFile), `wait for ${diffFile} to exist`),
    "file for diff should exist"
  );
}