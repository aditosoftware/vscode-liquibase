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
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  /**
   * Test case for executing the 'update' command with different context types.
   */
  LiquibaseGUITestUtils.matrixExecution((option, exec, key) => {
    test("should execute 'update' with context type '" + option + "' command with " + key, async function () {
      await DockerTestUtils.resetDB();

      const input = await LiquibaseGUITestUtils.startCommandExecution({
        command: "update...",
        configurationName,
        changelogFile: true,
      });

      await LiquibaseGUITestUtils.selectContextsInMatrixExecution(input, option, exec);

      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'update' was executed successfully");

      const databaseInformation = await DockerTestUtils.executeMariaDBSQL(
        "SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'person'"
      );

      if (option === ContextOptions.NO_CONTEXT) {
        assert.strictEqual(
          databaseInformation.length,
          0,
          `Table 'person' DOES exist, while it shouldn't: ${databaseInformation}`
        );
      } else {
        if (key === "all available contexts" || key === "the first available context") {
          assert.ok(
            databaseInformation?.length >= 1,
            `Table 'person' DOES NOT exist, while it should: ${databaseInformation}`
          );
        } else {
          assert.strictEqual(
            databaseInformation.length,
            0,
            `Table 'person' DOES exist, while it shouldn't: ${databaseInformation}`
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
