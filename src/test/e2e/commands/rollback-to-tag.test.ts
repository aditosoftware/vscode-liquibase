import path from "path";
import assert from "assert";
import { MariaDbDockerTestUtils } from "../../suite/MariaDbDockerTestUtils";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils, wait } from "./commandUtils";

suite("Rollback to Tag", function () {

    suiteSetup(async function () {
        await CommandUtils.setupTests();
    });

    /**
    * 
    */
    test("should execute 'Rollback to Tag' command", async function () {
      this.timeout(80_000);
      await CommandUtils.resetDB(CommandUtils.pool);

      await wait();

      //execute only one changeset to roll back to
      const input = await LiquibaseGUITestUtils.preCommandExecution("update");

      await input.setText('dummy');
      await input.confirm();
      await wait();

      await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
      await input.selectQuickPick(1);
      await wait();

      await input.setText("Load All ");
      await input.confirm();
      await wait();

      await input.setText("foo");
      await input.toggleAllQuickPicks(true);
      await input.confirm();
      await wait();

      //set tag
      await LiquibaseGUITestUtils.preCommandExecution("create tag");

      await input.setText('dummy');
      await input.confirm();
      await wait();

      await input.setText("test");
      await input.confirm();
      await wait();


      //Update all datasets
      await LiquibaseGUITestUtils.preCommandExecution("update");

      await input.setText('dummy');
      await input.confirm();
      await wait();

      await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
      await input.selectQuickPick(1);
      await wait();

      await input.setText("Use any ");
      await input.confirm();
      await wait();

      await input.toggleAllQuickPicks(true);
      await input.confirm();
      await wait();

      //rollback time
      await LiquibaseGUITestUtils.preCommandExecution("Rollback to Tag");

      await input.setText('dummy');
      await input.confirm();
      await wait();

      await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
      await input.selectQuickPick(1);
      await wait();

      await input.setText("Load All ");
      await input.confirm();
      await wait();

      await input.toggleAllQuickPicks(true);
      await input.confirm();
      await wait();

      await input.setText("test");
      await input.confirm();
      await wait();
      await wait();

      //check if the message is popping up
      assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'rollback' was executed successfully."));
      assert.ok((await MariaDbDockerTestUtils.executeSQL(CommandUtils.pool, "SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'company'"))?.length);

      //TODO: add db query to check if the rollback was correct -> Spoiler, it is not, maybe splitting files will help
    });
  });