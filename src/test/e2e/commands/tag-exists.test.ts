import assert from "assert";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { randomUUID } from "crypto";

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
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  /**
   * Test case for executing the 'tag-exists' command when the tag already exists.
   */
  test("should execute 'tag-exists' command successfully when tag exists", async function () {
    const tagName = "test";

    // first create a tag with the given name
    await LiquibaseGUITestUtils.executeCreateTag(configurationName, tagName);

    // and then check for the tag
    await executeTagExists(configurationName, tagName, /The tag 'test' already exists in/);
  });

  /**
   * Test case for executing the 'tag-exists' command when the tag does not exist.
   */
  test("should execute 'tag-exists' command successfully even if no tag exists", async function () {
    await executeTagExists(configurationName, randomUUID(), /does NOT exist/);
  });

  /**
   * Teardown function that runs after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});

/**
 * Executes the tag exist command and verify the message in the output channel.
 *
 * @param configurationName - the name of the configuration
 * @param tagName - the name of the tag that should be put into the tg command
 * @param messageToCheck - the message that should be in the output panel
 */
async function executeTagExists(configurationName: string, tagName: string, messageToCheck: RegExp): Promise<void> {
  const input = await LiquibaseGUITestUtils.startCommandExecution({ command: "tag-exists", configurationName });

  // set the name of the tag to check
  await input.setText(tagName);
  await input.confirm();

  assert.ok(
    await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'tag-exists' was executed successfully.")
  );
  assert.match(await LiquibaseGUITestUtils.outputPanel.getText(), messageToCheck);
}
