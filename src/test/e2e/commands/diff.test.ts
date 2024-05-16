import path from "path";
import assert from "assert";
import fs from "fs";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils, wait } from "../CommandUtils";

suite("diff", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  suiteSetup(async function () {
    this.timeout(50_000);
    configurationName = await CommandUtils.setupTests();
  });

  /**
   *
   */
  test("should execute 'diff' command", async function () {
    this.timeout(80_000);
    await CommandUtils.resetDB(CommandUtils.pool);

    await DockerTestUtils.executeMariaDBSQL(CommandUtils.pool, "CREATE SCHEMA data2");

    // for this test, we need a second configuration
    const secondConfiguration = await LiquibaseGUITestUtils.createConfiguration("MariaDB", 3310, "data2");

    await wait(500);

    const input = await LiquibaseGUITestUtils.startCommandExecution("update");

    await input.setText(configurationName);
    await input.confirm();

    await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
    await input.selectQuickPick(1);

    await input.setText(CommandUtils.loadAllContext);
    await input.confirm();

    await wait();

    await input.toggleAllQuickPicks(true);
    await input.confirm();

    await LiquibaseGUITestUtils.startCommandExecution("diff");

    await input.setText(configurationName);
    await input.confirm();

    await input.setText(secondConfiguration);
    await input.confirm();

    await CommandUtils.selectFolder(input, path.join(process.cwd(), "out", "temp", "workspace", "myFolder"));

    //name of file, leave to default
    await input.confirm();

    //available types, leave to default
    await input.confirm();

    await wait();
    await wait();

    assert.ok(fs.existsSync(path.join(process.cwd(), "out", "temp", "workspace", "myFolder", "diff.txt")));
  });

  /**
   *
   */
  test("should execute 'diff' command for postgres", async function () {
    this.timeout(80_000);
    await CommandUtils.resetDB(CommandUtils.pool);

    const postgresPort = 5435;

    await DockerTestUtils.startContainer("postgres", postgresPort);
    await DockerTestUtils.checkContainerStatus("postgres");

    const secondConfiguration = await LiquibaseGUITestUtils.createConfiguration("PostgreSQL", postgresPort);

    await wait();

    const input = await LiquibaseGUITestUtils.startCommandExecution("update");

    await input.setText(configurationName);
    await input.confirm();

    await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
    await input.selectQuickPick(1);

    await input.setText(CommandUtils.loadAllContext);
    await input.confirm();

    await wait();

    await input.toggleAllQuickPicks(true);
    await input.confirm();

    await LiquibaseGUITestUtils.startCommandExecution("diff");

    await input.setText(configurationName);
    await input.confirm();

    await input.setText(secondConfiguration);
    await input.confirm();

    await CommandUtils.selectFolder(input, path.join(process.cwd(), "out", "temp", "workspace", "myFolder"));

    await wait();

    //name of file
    await input.setText("diff2.txt");
    await input.confirm();

    await wait();

    //available types
    await input.confirm();

    await wait();
    await wait();

    assert.ok(fs.existsSync(path.join(process.cwd(), "out", "temp", "workspace", "myFolder", "diff2.txt")));
  });

  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
    await DockerTestUtils.stopAndRemoveContainer("postgres");
  });
});
