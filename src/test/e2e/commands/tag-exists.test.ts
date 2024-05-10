import assert from "assert";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils } from "../CommandUtils";
import { MariaDbDockerTestUtils } from "../../suite/MariaDbDockerTestUtils";

suite("Tag Exist", function () {

  suiteSetup(async function () {
    this.timeout(50_000);
    await CommandUtils.setupTests();
  });

  /**
   * 
   */
  test("should execute 'tag-exists' command", async function () {
    this.timeout(40_000);

    const input = await LiquibaseGUITestUtils.startCommandExecution("tag-exists");

    await input.setText('dummy');
    await input.confirm();

    await input.setText("test");
    await input.confirm();

    assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'tag-exists' was executed successfully."));
    assert.ok((await CommandUtils.outputPanel.getText()).includes('does NOT exist'));
    //TODO: check logs for real result or change behaviour of tag-exists
  });

  /**
   * 
   */
  test("should execute 'tag-exists' command unsuccessfully", async function () {
    this.timeout(40_000);

    const input = await LiquibaseGUITestUtils.startCommandExecution("tag-exists");

    await input.setText('dummy');
    await input.confirm();

    await input.setText("test2");
    await input.confirm();

    assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'tag-exists' was executed successfully."));


    //TODO: check logs for real result or change behaviour of tag-exists
  });

  suiteTeardown(async () => {
    await MariaDbDockerTestUtils.stopAndRemoveContainer();
  });
});