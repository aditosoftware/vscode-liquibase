import path from "path";
import assert from "assert";
import fs from "fs";
import { MariaDbDockerTestUtils } from "../../suite/MariaDbDockerTestUtils";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils } from "../CommandUtils";

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

    await MariaDbDockerTestUtils.executeSQL(CommandUtils.pool, "CREATE SCHEMA data2");

    await LiquibaseGUITestUtils.addConfiguration("dummy2", path.join(process.cwd(), "out", "temp", "workspace"), "dummy2.liquibase.properties");

    const input = await LiquibaseGUITestUtils.startCommandExecution("update");

    await input.setText('dummy');
    await input.confirm();

    await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
    await input.selectQuickPick(1);

    await input.setText("Use any ");
    await input.confirm();

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

    await input.confirm();

    await input.toggleAllQuickPicks(true);
    await input.confirm();

    assert.ok(fs.existsSync(path.join(process.cwd(), "out", "temp", "workspace", "myFolder", "diff.txt")));
  });

  suiteTeardown(async () => {
    await MariaDbDockerTestUtils.stopAndRemoveContainer();
  });
});