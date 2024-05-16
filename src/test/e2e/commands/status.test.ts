import path from "path";
import assert from "assert";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils } from "../CommandUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";

suite("Status", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  suiteSetup(async function () {
    this.timeout(50_000);
    configurationName = await CommandUtils.setupTests();
  });

  CommandUtils.matrixExecution(CommandUtils.contextOptions, CommandUtils.contextFunctions, (option, exec, key) => {
    test("should execute 'status' with context type '" + option + "' command with " + key, async function () {
      this.timeout(40_000);

      const input = await LiquibaseGUITestUtils.startCommandExecution("status");

      await input.setText(configurationName);
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
      assert.ok(
        await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'status' was executed successfully.")
      );
    });
  });

  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
