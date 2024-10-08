import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";

/**
 * Test suite for testing unexpected changesets.
 */
suite("Unexpected Changesets", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Setup function that runs before the test suite.
   */
  suiteSetup(async function () {
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  /**
   * Test function that executes the 'Unexpected Changesets' command with different context types.
   */
  LiquibaseGUITestUtils.matrixExecution((option, exec, key) => {
    test(
      "should execute 'Unexpected Changesets' with context type '" + option + "' command with " + key,
      async function () {
        await DockerTestUtils.resetDB();

        await LiquibaseGUITestUtils.executeCommandInMatrixExecution(
          "unexpected-changesets",
          {
            command: "unexpected changesets...",
            configurationName,
            changelogFile: true,
          },
          option,
          exec
        );
      }
    );
  });

  /**
   * Teardown function that runs after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
