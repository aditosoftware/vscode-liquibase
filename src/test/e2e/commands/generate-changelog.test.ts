import path from "path";
import assert from "assert";
import fs from "fs";
import { MariaDbDockerTestUtils } from "../../suite/MariaDbDockerTestUtils";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils, wait } from "./commandUtils";

suite("generate changelog",  function () {

    suiteSetup(async function () {
        await CommandUtils.setupTests();
    });

    /**
    * 
    */
    test("should execute 'generate changelog' command", async function () {
      this.timeout(80_000);
      await CommandUtils.resetDB(CommandUtils.pool);

      await wait();

      await MariaDbDockerTestUtils.executeSQL(CommandUtils.pool, "CREATE TABLE test_table (column1 char(36), column2 varchar(255))");

      await wait();

      const input = await LiquibaseGUITestUtils.preCommandExecution("generate changelog");

      await input.setText('dummy');
      await input.confirm();
      await wait();

      await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "myFolder"));
      await input.confirm();
      await input.confirm();
      await wait();

      await input.confirm();

      await wait();

      assert.ok(fs.existsSync(path.join(process.cwd(), "out", "temp", "workspace", "myFolder", "changelog.xml")));
    });
  });