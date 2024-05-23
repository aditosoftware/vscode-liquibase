import path from "path";
import assert from "assert";
import fs from "fs";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils, wait } from "../CommandUtils";
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

    await wait(500);

    const input = await LiquibaseGUITestUtils.startCommandExecution("update");

    await input.setText(configurationName);
    await input.confirm();

    await input.setText(CommandUtils.CHANGELOG_FILE);
    await input.selectQuickPick(1);

    await input.setText(ContextOptions.LOAD_ALL_CONTEXT);
    await input.confirm();

    await wait();

    await input.toggleAllQuickPicks(true);
    await input.confirm();

    await LiquibaseGUITestUtils.startCommandExecution("diff");

    await input.setText(configurationName);
    await input.confirm();

    await input.setText(secondConfiguration);
    await input.confirm();

    await CommandUtils.selectFolder(input, path.join(CommandUtils.WORKSPACE_PATH, "myFolder")); // TODO dynamischer output

    //name of file, leave to default
    await input.confirm();

    //available types, leave to default
    await input.confirm();

    await wait();
    await wait();

    assert.ok(fs.existsSync(path.join(CommandUtils.WORKSPACE_PATH, "myFolder", "diff.txt")));
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

    await wait();

    const input = await LiquibaseGUITestUtils.startCommandExecution("update");

    await input.setText(configurationName);
    await input.confirm();

    await input.setText(CommandUtils.CHANGELOG_FILE);
    await input.selectQuickPick(1);

    await input.setText(ContextOptions.LOAD_ALL_CONTEXT);
    await input.confirm();

    await wait();

    await input.toggleAllQuickPicks(true);
    await input.confirm();

    await LiquibaseGUITestUtils.startCommandExecution("diff");

    await input.setText(configurationName);
    await input.confirm();

    await input.setText(secondConfiguration);
    await input.confirm();

    await CommandUtils.selectFolder(input, path.join(CommandUtils.WORKSPACE_PATH, "myFolder")); // TODO dynamischer output

    await wait();

    //name of file
    await input.setText("diff2.txt");
    await input.confirm();

    await wait();

    //available types
    await input.confirm();

    await wait();
    await wait();

    assert.ok(fs.existsSync(path.join(CommandUtils.WORKSPACE_PATH, "myFolder", "diff2.txt")));
  });

  /**
   * Clean up after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
    await DockerTestUtils.stopAndRemoveContainer("postgres");
  });
});
