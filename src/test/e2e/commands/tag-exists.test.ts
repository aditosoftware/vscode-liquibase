import assert from "assert";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { wait, CommandUtils } from "./commandUtils";

suite("Tag Exist", () => {

    suiteSetup(async function () {
        await CommandUtils.setupTests();
    });

    /**
     * 
     */
    test("should execute 'tag-exists' command", async function () {
      this.timeout(40_000);

      await wait();

      const input = await LiquibaseGUITestUtils.preCommandExecution("tag-exists");

      await input.setText('dummy');
      await input.confirm();
      await wait();

      await input.setText("test");
      await input.confirm();
      await wait();

      assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'tag-exists' was executed successfully."));
      assert.ok((await CommandUtils.outputPanel.getText()).includes('does NOT exist'));
      //TODO: check logs for real result or change behaviour of tag-exists
    });

    /**
     * 
     */
    test("should execute 'tag-exists' command unsuccessfully", async function () {
      this.timeout(40_000);

      await wait();

      const input = await LiquibaseGUITestUtils.preCommandExecution("tag-exists");

      await input.setText('dummy');
      await input.confirm();
      await wait();

      await input.setText("test2");
      await input.confirm();
      await wait();

      assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'tag-exists' was executed successfully."));


      //TODO: check logs for real result or change behaviour of tag-exists
    });
  });