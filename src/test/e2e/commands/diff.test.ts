import path from "path";
import assert from "assert";
import fs from "fs";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils, wait } from "../CommandUtils";

suite("diff", function () {

  suiteSetup(async function () {
    this.timeout(50_000);
    await CommandUtils.setupTests();
  });

  /**
   * 
   */
  test("should execute 'diff' command", async function () {
    this.timeout(80_000);
    await CommandUtils.resetDB(CommandUtils.pool);

    await DockerTestUtils.executeMariaDBSQL(CommandUtils.pool, "CREATE SCHEMA data2");

    await LiquibaseGUITestUtils.addConfiguration("dummy2", path.join(process.cwd(), "out", "temp", "workspace"), "dummy2.liquibase.properties");

    const input = await LiquibaseGUITestUtils.startCommandExecution("update");

    await input.setText('dummy');
    await input.confirm();

    await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
    await input.selectQuickPick(1);

    await input.setText(CommandUtils.loadAllContext);
    await input.confirm();

    await wait();

    await input.toggleAllQuickPicks(true);
    await input.confirm();

    await LiquibaseGUITestUtils.startCommandExecution("diff");

    await input.setText('dummy');
    await input.confirm();

    await input.setText('dummy2');
    await input.confirm();

    await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "myFolder"));
    await input.confirm();
    await input.confirm();

    //name of file
    await input.confirm();

    //available types
    await input.confirm();

    await wait();
    await wait();

    assert.ok(fs.existsSync(path.join(process.cwd(), "out", "temp", "workspace", "myFolder", "diff.txt")));
  });

  /**
   * 
   */
  test("should execute 'diff' command", async function () {
    this.timeout(80_000);
    await CommandUtils.resetDB(CommandUtils.pool);

    await DockerTestUtils.startContainer("postgres", 5432);
    await DockerTestUtils.checkContainerStatus("postgres");

    await LiquibaseGUITestUtils.addConfiguration("dummy3", path.join(process.cwd(), "out", "temp", "workspace"), "dummy3.liquibase.properties");

    const input = await LiquibaseGUITestUtils.startCommandExecution("update");

    await input.setText('dummy');
    await input.confirm();

    await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
    await input.selectQuickPick(1);

    await input.setText(CommandUtils.loadAllContext);
    await input.confirm();

    await wait();

    await input.toggleAllQuickPicks(true);
    await input.confirm();

    await LiquibaseGUITestUtils.startCommandExecution("diff");

    await input.setText('dummy');
    await input.confirm();

    await input.setText('dummy3');
    await input.confirm();

    await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "myFolder"));
    await input.confirm();
    await input.confirm();

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