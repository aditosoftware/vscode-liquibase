import path from "path";
import assert from "assert";
import { MariaDbDockerTestUtils } from "../../suite/MariaDbDockerTestUtils";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils } from "../CommandUtils";

suite("Rollback to Tag", function () {

  suiteSetup(async function () {
    this.timeout(50_000);
    await CommandUtils.setupTests();
  });

  /**
  * 
  */
  test("should execute 'Rollback to Tag' command", async function () {
    this.timeout(80_000);
    await CommandUtils.resetDB(CommandUtils.pool);

    //execute only one changeset to roll back to
    const input = await LiquibaseGUITestUtils.startCommandExecution("update");

    await input.setText('dummy');
    await input.confirm();

    await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
    await input.selectQuickPick(1);

    await input.setText("Load All ");
    await input.confirm();

    await input.setText("foo");
    await input.toggleAllQuickPicks(true);
    await input.confirm();

    //set tag
    await LiquibaseGUITestUtils.startCommandExecution("create tag");

    await input.setText('dummy');
    await input.confirm();

    await input.setText("test");
    await input.confirm();


    //Update all datasets
    await LiquibaseGUITestUtils.startCommandExecution("update");

    await input.setText('dummy');
    await input.confirm();

    await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
    await input.selectQuickPick(1);

    await input.setText("Use any ");
    await input.confirm();

    await input.toggleAllQuickPicks(true);
    await input.confirm();

    //rollback time
    await LiquibaseGUITestUtils.startCommandExecution("Rollback to Tag");

    await input.setText('dummy');
    await input.confirm();

    await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
    await input.selectQuickPick(1);

    await input.setText("Load All ");
    await input.confirm();

    await input.toggleAllQuickPicks(true);
    await input.confirm();

    await input.setText("test");
    await input.confirm();

    //check if the message is popping up
    assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'rollback' was executed successfully."));
    assert.ok((await MariaDbDockerTestUtils.executeSQL(CommandUtils.pool, "SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'company'"))?.length);

    //TODO: add db query to check if the rollback was correct -> Spoiler, it is not, maybe splitting files will help
  });

  suiteTeardown(async () => {
    await MariaDbDockerTestUtils.stopAndRemoveContainer();
  });
});