import assert from "assert";
import { ModalDialog } from "vscode-extension-tester";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils, wait } from "../CommandUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";

suite("Drop-all", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  suiteSetup(async function () {
    this.timeout(50_000);
    configurationName = await CommandUtils.setupTests();
  });

  /**
   *
   */
  test("should execute 'drop-all' command", async function () {
    this.timeout(40_000);

    await wait();

    const input = await LiquibaseGUITestUtils.startCommandExecution("drop-all");

    await input.setText(configurationName);
    await input.confirm();

    const modalDialog = new ModalDialog();
    modalDialog.pushButton("Drop-all");

    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'drop-all' was executed successfully.")
    );

    //TODO: add comparison to db to check if everything was removed
  });

  // FIXME diese beiden Methoden zusammenlegen

  /**
   *
   */
  test("should cancel execute 'drop-all' command", async function () {
    this.timeout(40_000);

    const input = await LiquibaseGUITestUtils.startCommandExecution("drop-all");

    await input.setText(configurationName);
    await input.confirm();

    const modelDialog = new ModalDialog();
    modelDialog.pushButton("Cancel");

    assert.ok(
      !(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'drop-all' was executed successfully."))
    );
  });

  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
