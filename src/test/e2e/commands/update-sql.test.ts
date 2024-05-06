import path from "path";
import assert from "assert";
import fs from "fs";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils, wait } from "./commandUtils";

suite("Update-sql", async function () {  
    
    suiteSetup(async function () {
        await CommandUtils.setupTests();
    });

    test("should execute 'Update SQL' command", async function () {
      this.timeout(80_000);
      await CommandUtils.resetDB(CommandUtils.pool);
  
      //execute only one changeset to roll back to
      const input = await LiquibaseGUITestUtils.preCommandExecution("update-sql");
  
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
  
      await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase"));
      await input.confirm(); //this dumb shit only works if you DOUBLE CONFIRM IT -> https://github.com/redhat-developer/vscode-extension-tester/blob/b283b0f7a1ca451b9decf6b08d76fda24134f897/docs/Home.md?plain=1#L77
      await input.confirm();
      await wait();
  
      await input.setText("update.sql");
      await input.confirm();
      await wait();
      await wait();
  
      assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'update-sql' was executed successfully."));
      assert.ok(fs.existsSync(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "update.sql")));
    });
    
  
  });