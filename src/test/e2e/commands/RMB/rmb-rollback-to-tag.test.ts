import { CommandUtils, openAndSelectRMBItem, wait } from "../../CommandUtils";
import { DockerTestUtils } from "../../../suite/DockerTestUtils";
import path from "path";
import { LiquibaseGUITestUtils } from "../../LiquibaseGUITestUtils";
import assert from "assert";

suite("Right Click Menu", function () {
  suiteSetup(async function () {
    this.timeout(50_000);
    await CommandUtils.setupTests();
  });

  /**
   *
   */
  test("should execute 'rollback-to-tag' command", async function () {
    this.timeout(80_000);
    await CommandUtils.resetDB(CommandUtils.pool);

    const input = await LiquibaseGUITestUtils.startCommandExecution("update");

    await input.setText("dummy");
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

    //set tag
    await LiquibaseGUITestUtils.startCommandExecution("create tag");

    await input.setText("dummy");
    await input.confirm();

    await input.setText("test");
    await input.confirm();

    //Update all datasets
    await LiquibaseGUITestUtils.startCommandExecution("update");

    await input.setText("dummy");
    await input.confirm();

    await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
    await input.selectQuickPick(1);

    await input.setText(CommandUtils.recentContext);
    await input.confirm();

    await wait();

    await input.toggleAllQuickPicks(true);
    await input.confirm();

    await wait();

    await openAndSelectRMBItem("Rollback to Tag");
    await wait();

    await input.setText("dummy");
    await input.confirm();

    await input.setText(CommandUtils.loadAllContext);
    await input.confirm();

    await wait();

    await input.toggleAllQuickPicks(true);
    await input.confirm();

    await wait();

    await input.setText("test");
    await input.confirm();

    await wait();
    await wait();
    await wait();

    //check if the message is popping up
    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'rollback' was executed successfully.")
    );
    assert.ok(
      (
        await DockerTestUtils.executeMariaDBSQL(
          CommandUtils.pool,
          "SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'company'"
        )
      )?.length === 0,
      "Rollback did not remove values from DB"
    );
  });

  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
