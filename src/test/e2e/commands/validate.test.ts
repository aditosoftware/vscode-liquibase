import path from "path";
import assert from "assert";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils, wait } from "./commandUtils";

suite("Validate", () => {

    suiteSetup(async function () {
        await CommandUtils.setupTests();
    });

    /**
     * 
     */
    test("should execute 'validate' command", async function () {
      this.timeout(40_000);

      await wait();

      const input = await LiquibaseGUITestUtils.preCommandExecution("validate");

      await input.setText('dummy');
      await input.confirm();
      await wait();

      await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
      await input.selectQuickPick(1);
      await wait();

      assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'validate' was executed successfully."));
    });

  });