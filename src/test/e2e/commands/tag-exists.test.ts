import assert from "assert";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";

/**
 * Test suite for the 'tag-exists' command.
 */
suite("Tag Exist", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Setup function that runs before the test suite.
   */
  suiteSetup(async function () {
    this.timeout(50_000);
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  /**
   * Test case for executing the 'tag-exists' command when the tag already exists.
   */
  test("should execute 'tag-exists' command successfully when tag exists", async function () {
    this.timeout(40_000);

    const tagName = "test";

    await LiquibaseGUITestUtils.executeCreateTag(configurationName, tagName);

    const input = await LiquibaseGUITestUtils.startCommandExecution("tag-exists");

    await input.setText(configurationName);
    await input.confirm();

    await input.setText(tagName);
    await input.confirm();

    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'tag-exists' was executed successfully.")
    );
    assert.ok(
      (await LiquibaseGUITestUtils.outputPanel.getText()).includes("The tag 'test' already exists in"),
      "Tag does NOT exist"
    );
  });

  /**
   * Test case for executing the 'tag-exists' command when the tag does not exist.
   */
  test("should execute 'tag-exists' command successfully even if no tag exists", async function () {
    this.timeout(40_000);

    const input = await LiquibaseGUITestUtils.startCommandExecution("tag-exists");

    await input.setText(configurationName);
    await input.confirm();

    await input.setText("test2");
    await input.confirm();

    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'tag-exists' was executed successfully.")
    );
    assert.ok((await LiquibaseGUITestUtils.outputPanel.getText()).includes("does NOT exist"), "The tag DOES exist");
  });

  /**
   * Teardown function that runs after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
