import path from "path";
import assert from "assert";
import fs from "fs";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils,  wait } from "../CommandUtils";
import { ContextOptions } from "../../../constants";

/**
 * Test suite for the 'diff' command.
 */
suite("diff", function () {
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
   * Test case for executing the 'diff' command.
   */
  test("should execute 'diff' command", async function () {
    this.timeout(80_000);
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
    this.timeout(80_000);
    await DockerTestUtils.resetDB();

    const postgresPort = 5435;

    await DockerTestUtils.startContainer("postgres", postgresPort);
    await DockerTestUtils.checkContainerStatus("postgres");

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
  const temporaryFolder = CommandUtils.generateTemporaryFolder();

  await wait();

  await CommandUtils.executeUpdate(configurationName, ContextOptions.LOAD_ALL_CONTEXT);

  const input = await LiquibaseGUITestUtils.startCommandExecution("diff");

  await input.setText(configurationName);
  await input.confirm();

  await input.setText(secondConfiguration);
  await input.confirm();

  await CommandUtils.selectFolder(input, temporaryFolder);

  await wait();

  //name of file
  await input.setText(fileName);
  await input.confirm();

  await wait();

  //available types
  await input.confirm();

  await wait();
  await wait();

  assert.ok(fs.existsSync(path.join(temporaryFolder, fileName)));
}
