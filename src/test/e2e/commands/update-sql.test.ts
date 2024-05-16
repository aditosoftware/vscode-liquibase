import path from "path";
import assert from "assert";
import fs from "fs";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils, wait } from "../CommandUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";

suite("Update-sql", async function () {

  suiteSetup(async function () {
    this.timeout(50_000);
    await CommandUtils.setupTests();
  });

  test("should execute 'Update SQL' command", async function () {
    this.timeout(80_000);

    const input = await LiquibaseGUITestUtils.startCommandExecution("update");

    await input.setText('dummy');
    await input.confirm();

    await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
    await input.selectQuickPick(1);

    await input.setText(CommandUtils.loadAllContext);
    await input.confirm();

    await wait();

    await input.setText("foo");
    await input.toggleAllQuickPicks(true);
    await input.confirm();

    await wait();

    //execute only one changeset to roll back to
    await LiquibaseGUITestUtils.startCommandExecution("Generate SQL File for incoming changes");

    await input.setText('dummy');
    await input.confirm();

    await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
    await input.selectQuickPick(1);

    await input.setText(CommandUtils.loadAllContext);
    await input.confirm();

    await wait();

    await input.toggleAllQuickPicks(true);
    await input.confirm();



    await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "myFolder"));
    await input.confirm();
    await input.confirm();

    await wait();

    await input.setText("update.sql");
    await input.confirm();

    await wait();

    assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'update-sql' was executed successfully."), "Notification did NOT show up");
    assert.ok(fs.existsSync(path.join(process.cwd(), "out", "temp", "workspace", "myFolder", "update.sql")), "Did NOT create a SQL File");
  });

  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});