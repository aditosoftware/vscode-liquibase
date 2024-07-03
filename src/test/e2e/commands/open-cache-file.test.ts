import assert from "assert";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { TextEditor } from "vscode-extension-tester";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { ContextOptions } from "../../../constants";

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
    configurationName = await LiquibaseGUITestUtils.setupTests();
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
    // first, remove the whole cache
    await LiquibaseGUITestUtils.removeWholeCache(true);

    // try to execute the command
    await LiquibaseGUITestUtils.startCommandExecution({
      command: "Cache: Opens the file with the recently loaded elements",
    });

    // check that the cache is not there and the user is notified about it
    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution(
        /File .*cache\.json could not be opened, because it does not exist./
      )
    );
  });

  /**
   * Tests that the cache files can be opened.
   */
  test("should open cache file", async () => {
    // create some data for the cache
    await LiquibaseGUITestUtils.executeUpdate(configurationName, ContextOptions.LOAD_ALL_CONTEXT);

    // open the cache file
    await LiquibaseGUITestUtils.startCommandExecution({
      command: "Cache: Opens the file with the recently loaded elements",
    });

    // get the text from the editor
    const text = await new TextEditor().getText();
    const cache = JSON.parse(text);

    // get the key with our configuration name
    const keys = Object.keys(cache).filter((pKey) => pKey.includes(configurationName));
    assert.strictEqual(keys.length, 1, `there should be one element in ${keys}`);
    const key = keys[0];

    // get the cache for our key and check that the contexts are there
    const cacheForKey = cache[key];
    // sanitize the result to remove the lastUsed from the changelogs
    const sanitizedResult = {
      contexts: cacheForKey.contexts,
      changelogs: cacheForKey.changelogs.map((changelog: { path: string }) => ({
        path: changelog.path.toLowerCase(),
      })),
    };
    assert.deepStrictEqual(sanitizedResult, {
      contexts: ["bar", "baz", "foo"],
      changelogs: [{ path: LiquibaseGUITestUtils.CHANGELOG_FILE.toLowerCase() }],
    });
  });
});
