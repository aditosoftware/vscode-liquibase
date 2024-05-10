import path from "path";
import assert from "assert";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils } from "../CommandUtils";
import { MariaDbDockerTestUtils } from "../../suite/MariaDbDockerTestUtils";

suite("Unexpected Changesets", function () {

  suiteSetup(async function () {
    this.timeout(50_000);
    await CommandUtils.setupTests();
  });

  /**
  * 
  */
  CommandUtils.matrixExecution(CommandUtils.contextOptions, CommandUtils.contextFunctions, (option, exec, key) => {
    test("should execute 'Unexpected Changesets' with context type '" + option + "' command with " + key, async function () {
      this.timeout(40_000);

      await CommandUtils.resetDB(CommandUtils.pool);

      const input = await LiquibaseGUITestUtils.startCommandExecution("unexpected changesets");

      await input.setText('dummy');
      await input.confirm();

      await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
      await input.selectQuickPick(1);

      if (option === CommandUtils.noContext) {
        await input.setText(option);
        await input.confirm();
      }
      else {
        await input.setText(option);
        await input.confirm();

        await exec();
      }

      assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'unexpected-changesets' was executed successfully."));
    });
  });

  suiteTeardown(async () => {
    await MariaDbDockerTestUtils.stopAndRemoveContainer();
  });
});