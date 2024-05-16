import path from "path";
import assert from "assert";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils } from "../CommandUtils";
import { suiteTeardown } from "mocha";
import { DockerTestUtils } from "../../suite/DockerTestUtils";

suite("Clear Checksums", function () {
  suiteSetup(async function () {
    this.timeout(50_000);
    await CommandUtils.setupTests();
  });

  /**
   *
   */
  CommandUtils.matrixExecution(CommandUtils.contextOptions, CommandUtils.contextFunctions, (option, exec, key) => {
    test("should execute 'Clear Checksums' with context type '" + option + "' command with " + key, async function () {
      this.timeout(40_000);
      await CommandUtils.resetDB(CommandUtils.pool);

      const input = await LiquibaseGUITestUtils.startCommandExecution("update");

      await input.setText("dummy");
      await input.confirm();

      await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
      await input.selectQuickPick(1);

      if (option === CommandUtils.noContext) {
        await input.setText(option);
        await input.confirm();
      } else {
        await input.setText(option);
        await input.confirm();

        await exec();
      }

      await LiquibaseGUITestUtils.startCommandExecution("Clear Checksums");

      await input.setText("dummy");
      await input.confirm();

      assert.ok(
        await LiquibaseGUITestUtils.waitForCommandExecution(
          "Liquibase command 'clear-checksums' was executed successfully."
        )
      );
    });
  });

  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
