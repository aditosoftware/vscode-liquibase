import path from "path";
import assert from "assert";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils, wait } from "./commandUtils";

suite("Status", () => {

    suiteSetup(async function () {
        await CommandUtils.setupTests();
    });

    CommandUtils.matrixExecution(CommandUtils.contextOptions, CommandUtils.contextFunctions, (option, exec, key) => {
      test("should execute 'status' with context type '" + option + "' command with " + key, async function () {

        this.timeout(40_000);

        const input = await LiquibaseGUITestUtils.preCommandExecution("status");

        // wait a bit initially
        await wait();

        await input.setText("dummy");
        await input.confirm();
        await wait();

        await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
        await input.selectQuickPick(1);
        await wait();

        if (option === CommandUtils.noContext) {

          await input.setText(option);
          await input.confirm();
        }
        else {
          await input.setText(option);
          await input.confirm();
          await wait();

          await exec();
        }
        assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'status' was executed successfully."));
      });
    });
  });