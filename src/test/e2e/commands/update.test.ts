import assert from "assert";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { ContextOptions } from "../../../constants";

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
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  /**
   * Test case for executing the 'update' command with different context types.
   */
  LiquibaseGUITestUtils.matrixExecution((option, exec, key) => {
    test("should execute 'update' with context type '" + option + "' command with " + key, async function () {
      this.timeout(40_000);
      await DockerTestUtils.resetDB();

      const input = await LiquibaseGUITestUtils.startCommandExecution("update");

      await input.setText(configurationName);
      await input.confirm();

      await input.setText(LiquibaseGUITestUtils.CHANGELOG_FILE);
      await input.selectQuickPick(1);

      // todo auslagern? umstrukturieren?
      if (option === ContextOptions.NO_CONTEXT) {
        await input.setText(option);
        await input.confirm();

        await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'update' was executed successfully");

        assert.ok(
          (
            await DockerTestUtils.executeMariaDBSQL(
              "SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'person'"
            )
          )?.length === 0,
          "Table 'person' DOES exist, while it shouldn't"
        );
      } else {
        await input.setText(option);
        await input.confirm();

        await exec();

        await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'update' was executed successfully");

        if (key === "all available contexts" || key === "the first available context") {
          assert.ok(
            (
              await DockerTestUtils.executeMariaDBSQL(
                "SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'person'"
              )
            )?.length >= 1,
            "Table 'person' DOES NOT exist, while it should"
          );
        } else {
          assert.ok(
            (
              await DockerTestUtils.executeMariaDBSQL(
                "SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'person'"
              )
            )?.length === 0,
            "Table 'person' DOES exist, while it shouldn't"
          );
        }
      }
    });
  });

  /**
   * Clean up after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
