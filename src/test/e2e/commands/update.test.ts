import path from "path";
import assert from "assert";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils, wait } from "../CommandUtils";

/**
 * Test suite for the 'update' command.
 */
suite("Update", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Set up the test suite.
   */
  suiteSetup(async function () {
    this.timeout(50_000);
    configurationName = await CommandUtils.setupTests();
  });

  /**
   * Test case for executing the 'update' command with different context types.
   */
  CommandUtils.matrixExecution(CommandUtils.contextOptions, CommandUtils.contextFunctions, (option, exec, key) => {
    test("should execute 'update' with context type '" + option + "' command with " + key, async function () {
      this.timeout(40_000);
      await CommandUtils.resetDB(CommandUtils.pool);

      const input = await LiquibaseGUITestUtils.startCommandExecution("update");

      await input.setText(configurationName);
      await input.confirm();

      await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
      await input.selectQuickPick(1);

      if (option === CommandUtils.noContext) {
        await input.setText(option);
        await input.confirm();

        await wait();

        assert.ok(
          (
            await DockerTestUtils.executeMariaDBSQL(
              CommandUtils.pool,
              "SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'person'"
            )
          )?.length === 0,
          "Table 'person' DOES exist, while it shouldn't"
        );
      } else {
        await input.setText(option);
        await input.confirm();

        await exec();

        await wait();

        if (key === "all available contexts" || key === "the first available context") {
          assert.ok(
            (
              await DockerTestUtils.executeMariaDBSQL(
                CommandUtils.pool,
                "SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'person'"
              )
            )?.length >= 1,
            "Table 'person' DOES NOT exist, while it should"
          );
        } else {
          assert.ok(
            (
              await DockerTestUtils.executeMariaDBSQL(
                CommandUtils.pool,
                "SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'person'"
              )
            )?.length === 0,
            "Table 'person' DOES exist, while it shouldn't"
          );
        }
      }

      assert.ok(
        await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'update' was executed successfully.")
      );
    });
  });

  /**
   * Clean up after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
