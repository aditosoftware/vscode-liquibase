import assert from "assert";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils, wait } from "./commandUtils";

suite("Tag", () => {

    suiteSetup(async function () {
        await CommandUtils.setupTests();
    });

    /**
     * 
     */
    test("should execute 'tag' command", async function () {
      this.timeout(40_000);

      await wait();

      const input = await LiquibaseGUITestUtils.preCommandExecution("tag");

      await input.setText('dummy');
      await input.confirm();
      await wait();

      await input.setText("test");
      await input.confirm();
      await wait();

      assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'tag' was executed successfully."));
    });
  });