import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";

/**
 * Test suite for the 'Changelog Sync' functionality.
 */
suite("Changelog Sync", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Sets up the test suite before running the tests.
   */
  suiteSetup(async function () {
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  /**
   * Executes the 'Changelog Sync' command with different context types and options.
   */
  LiquibaseGUITestUtils.matrixExecution((option, exec, key) => {
    /**
     * Test case for executing the 'Changelog Sync' command with a specific context type and option.
     */
    test("should execute 'Changelog Sync' with context type '" + option + "' command with " + key, async function () {
      await DockerTestUtils.resetDB();

      await LiquibaseGUITestUtils.executeCommandInMatrixExecution(
        "changelog-sync",
        {
          command: "Changelog Sync...",
          configurationName,
          changelogFile: true,
        },
        option,
        exec
      );
    });
  });

  /**
   * Cleans up the test suite after running the tests.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
