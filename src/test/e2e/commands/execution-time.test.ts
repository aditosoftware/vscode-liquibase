import assert from "assert";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";

/**
 * Test suite for the execution time functionality.
 */
suite("Execution time", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Sets up the test suite before running any tests.
   */
  suiteSetup(async function () {
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  /**
   * Test case showing the execution time after the 'tag' command.
   */
  test("should show execution time after command execution", async function () {
    const input = await LiquibaseGUITestUtils.startCommandExecution({ command: "create tag...", configurationName });

    await input.setText("test");
    await input.confirm();

    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'tag' was executed successfully.")
    );

    const outputPanelText = await LiquibaseGUITestUtils.outputPanel.getText();
    assert.match(outputPanelText, /Liquibase command 'tag' finished in \d{2}:\d{2}:\d{3} min/);
  });

  /**
   * Cleans up the test suite after running all tests.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
