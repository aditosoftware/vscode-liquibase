import assert from "assert";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils, wait } from "../CommandUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";

suite("Tag Exist", function () {
  suiteSetup(async function () {
    this.timeout(50_000);
    await CommandUtils.setupTests();
  });

  /**
   *
   */
  test("should execute 'tag-exists' command successfully when tag exists", async function () {
    this.timeout(40_000);

    const input = await LiquibaseGUITestUtils.startCommandExecution("create tag");

    await input.setText("dummy");
    await input.confirm();

    await input.setText("test");
    await input.confirm();

    await wait();

    await LiquibaseGUITestUtils.startCommandExecution("tag-exists");

    await input.setText("dummy");
    await input.confirm();

    await input.setText("test");
    await input.confirm();

    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'tag-exists' was executed successfully.")
    );
    assert.ok(
      (await CommandUtils.outputPanel.getText()).includes("The tag 'test' already exists in"),
      "Tag does NOT exist"
    );
  });

  /**
   *
   */
  test("should execute 'tag-exists' command successfully even if no tag exists", async function () {
    this.timeout(40_000);

    const input = await LiquibaseGUITestUtils.startCommandExecution("tag-exists");

    await input.setText("dummy");
    await input.confirm();

    await input.setText("test2");
    await input.confirm();

    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'tag-exists' was executed successfully.")
    );
    assert.ok((await CommandUtils.outputPanel.getText()).includes("does NOT exist"), "The tag DOES exist");
  });

  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
