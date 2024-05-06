import path from "path";
import assert from "assert";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils, wait } from "./commandUtils";

suite("Clear Checksums", function () {

    suiteSetup(async function () {
        await CommandUtils.setupTests();
    });

    /**
    * 
    */
    test("should execute 'Clear Checksums' command", async function () {
      this.timeout(40_000);
      await CommandUtils.resetDB(CommandUtils.pool);

      await wait();

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

      await input.toggleAllQuickPicks(true);
      await input.confirm();
      await wait();

      await LiquibaseGUITestUtils.preCommandExecution("Clear Checksums");

      await input.setText('dummy');
      await input.confirm();
      await wait();

      assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'clear-checksums' was executed successfully."));
    });
  });