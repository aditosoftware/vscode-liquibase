import path from "path";
import assert from "assert";
import { MariaDbDockerTestUtils } from "../../suite/MariaDbDockerTestUtils";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils, wait } from "./commandUtils";


suite("Update", () => {

    suiteSetup(async function () {
        await CommandUtils.setupTests();
    });

    /**
     * 
     */
    CommandUtils.matrixExecution(CommandUtils.contextOptions, CommandUtils.contextFunctions, (option, exec, key) => {
      test("should execute 'update' with context type '" + option + "' command with " + key, async function () {
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

        if (option === CommandUtils.noContext) {

          await input.setText(option);
          await input.confirm();

          assert.ok((await MariaDbDockerTestUtils.executeSQL(CommandUtils.pool, "SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'person'"))?.length, "0");
        }
        else {
          await input.setText(option);
          await input.confirm();
          await wait();

          await exec();

          if (key === 'all available contexts' || key === 'the first available context') {
            assert.ok((await MariaDbDockerTestUtils.executeSQL(CommandUtils.pool, "SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'person'"))?.length, "1");
          }
          else {
            assert.ok((await MariaDbDockerTestUtils.executeSQL(CommandUtils.pool, "SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'person'"))?.length, "0");
          }
        }

        assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'update' was executed successfully."));
      });
    });
  });