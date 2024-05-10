import assert from "assert";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils } from "../CommandUtils";
import { MariaDbDockerTestUtils } from "../../suite/MariaDbDockerTestUtils";

suite("Tag", function () {

  suiteSetup(async function () {
    this.timeout(50_000);
    await CommandUtils.setupTests();
  });

  /**
   * 
   */
  test("should execute 'tag' command", async function () {
    this.timeout(40_000);

    const input = await LiquibaseGUITestUtils.startCommandExecution("tag");

    await input.setText('dummy');
    await input.confirm();

    await input.setText("test");
    await input.confirm();

    assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'tag' was executed successfully."));
  });

  suiteTeardown(async () => {
    await MariaDbDockerTestUtils.stopAndRemoveContainer();
  });
});