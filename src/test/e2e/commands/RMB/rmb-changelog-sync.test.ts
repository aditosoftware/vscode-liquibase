import assert from "assert";
import { CommandUtils, wait, openAndSelectRMBItem } from "../../CommandUtils";
import { LiquibaseGUITestUtils } from "../../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../../suite/DockerTestUtils";
import { InputBox } from "vscode-extension-tester";

suite("Right Click Menu", function () {
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
  test("should execute 'changelog sync' command", async function () {
    this.timeout(50_000);
    await CommandUtils.resetDB(CommandUtils.pool);

    await wait();
    await openAndSelectRMBItem("Changelog Sync");
    await wait();

    const input = await InputBox.create(50000);

    await input.setText(configurationName);
    await input.confirm();

    await input.setText(CommandUtils.noContext);
    await input.confirm();

    await wait();

    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution(
        "Liquibase command 'changelog-sync' was executed successfully."
      )
    );
  });

  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
