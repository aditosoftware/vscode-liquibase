import assert from "assert";
import { CommandUtils, createDataViaUpdate, removeWholeCache } from "../CommandUtils";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { TextEditor } from "vscode-extension-tester";
import { DockerTestUtils } from "../../suite/DockerTestUtils";

/**
 * Tests the opening of the cache.
 */
suite("open cache", () => {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Set up the test suite.
   */
  suiteSetup(async function () {
    this.timeout(50_000);
    configurationName = await CommandUtils.setupTests();
  });

  /**
   * Teardown function that runs after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });

  /**
   * Tests that no cache file will be opened, when none does exist.
   */
  test("should fail open cache file", async () => {
    // create some data and remove them
    await createDataViaUpdate(configurationName);
    await removeWholeCache();

    // try to execute the command
    await LiquibaseGUITestUtils.startCommandExecution("Cache: Opens the file with the recently loaded elements");

    // check that the cache is not there and the user is notified about it
    assert.ok(
      LiquibaseGUITestUtils.notificationExists(/File .*cache\.json could not be opened, because it does not exist./)
    );
  });

  /**
   * Tests that the cache files can be opened.
   */
  test("should open cache file", async () => {
    // create some data for the cache
    await createDataViaUpdate(configurationName);

    // open the cache file
    await LiquibaseGUITestUtils.startCommandExecution("Cache: Opens the file with the recently loaded elements");

    // get the text from the editor
    const text = await new TextEditor().getText();
    const cache = JSON.parse(text);

    // get the key with our configuration name
    const keys = Object.keys(cache).filter((pKey) => pKey.includes(configurationName));
    assert.strictEqual(keys.length, 1, `there should be one element in ${keys}`);
    const key = keys[0];

    // get the cache for our key and check that the contexts are there
    const cacheForKey = cache[key];
    assert.deepStrictEqual(cacheForKey, { contexts: ["bar", "baz", "foo"] });
  });
});
