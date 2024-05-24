import assert from "assert";
import { ModalDialog } from "vscode-extension-tester";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";

/**
 * Test suite for the 'drop-all' command.
 */
suite("Drop-all", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Sets up the test suite before running any tests.
   */
  suiteSetup(async function () {
    this.timeout(50_000);
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  /**
   * Test case for executing the 'drop-all' command.
   */
  test("should execute 'drop-all' command", async function () {
    this.timeout(40_000);

    const input = await LiquibaseGUITestUtils.startCommandExecution("drop-all");

    await input.setText(configurationName);
    await input.confirm();

    const modalDialog = new ModalDialog();
    await modalDialog.pushButton("Drop-all");

    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'drop-all' was executed successfully.")
    );

    //TODO: add comparison to db to check if everything was removed
  });

  // TODO Methoden zusammenlegen?

  /**
   * Test case for cancelling the execution of the 'drop-all' command.
   */
  test("should cancel execute 'drop-all' command", async function () {
    this.timeout(40_000);

    const input = await LiquibaseGUITestUtils.startCommandExecution("drop-all");

    await input.setText(configurationName);
    await input.confirm();

    const modelDialog = new ModalDialog();
    await modelDialog.pushButton("Cancel");

    assert.ok(
      !(await LiquibaseGUITestUtils.waitForCommandExecution(
        "Liquibase command 'drop-all' was executed successfully.",
        false
      ))
    );
  });

  /**
   * Cleans up the test suite after running all tests.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
