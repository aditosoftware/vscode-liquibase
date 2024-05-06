import assert from "assert";
import { ModalDialog } from "vscode-extension-tester";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils, wait } from "./commandUtils";

suite("Drop-all", () => {

    suiteSetup(async function () {
        await CommandUtils.setupTests();
    });
    
    /**
       * 
       */
    test("should execute 'drop-all' command", async function () {
      this.timeout(40_000);

      await wait();

      const input = await LiquibaseGUITestUtils.preCommandExecution("drop-all");

      await input.setText('dummy');
      await input.confirm();

      await wait();

      const test = new ModalDialog();
      test.pushButton('Drop-all');

      assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'drop-all' was executed successfully."));

      //TODO: add comparison to db to check if everything was removed
    });

    /**
     * 
     */
    test("should cancel execute 'drop-all' command", async function () {
      this.timeout(40_000);

      await wait();

      const input = await LiquibaseGUITestUtils.preCommandExecution("drop-all");

      await input.setText('dummy');
      await input.confirm();

      await wait();

      const test = new ModalDialog();
      test.pushButton('Cancel');

      assert.ok(!await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'drop-all' was executed successfully."));
    });
  });