import assert from "assert";
import { TextEditor } from "vscode-extension-tester";
import { ContextOptions } from "../../constants";
import { DockerTestUtils } from "../suite/DockerTestUtils";
import { LiquibaseGUITestUtils } from "./LiquibaseGUITestUtils";
import { Connection } from "../../cache";

/**
 * Test suite for executeJar.
 */
suite("executeJar", function () {
  /**
   * The names of the configurations that were created during the setup.
   */
  let configurationName: string;
  let configurationNameDupe: string;

  /**
   * Set up the test suite.
   */
  suiteSetup(async function () {
    // create configuration that is used for the update
    configurationName = await LiquibaseGUITestUtils.setupTests({ startContainer: true, addChangelog: true });
    // create a second configuration that is NOT used for the update but gets the cache entry updated
    configurationNameDupe = await LiquibaseGUITestUtils.setupTests({ startContainer: false, addChangelog: true });
  });

  /**
   * Test case for loading contexts and checking if all property files are updated that point to the same changelog.
   */
  test("should insert loadedContext to all property-files which point to the same changelog", async function () {
    const expectedConnectionFromCache: Connection = {
      changelogs: [
        {
          path: LiquibaseGUITestUtils.CHANGELOG_FILE.toLowerCase(),
          lastUsed: 1,
          contexts: {
            loadedContexts: ["bar", "baz", "foo"],
            selectedContexts: [""],
          },
        },
      ],
    };

    await DockerTestUtils.resetDB();

    await LiquibaseGUITestUtils.executeUpdate(configurationName, ContextOptions.LOAD_ALL_CONTEXT, "foo");

    // open the cache file
    await LiquibaseGUITestUtils.startCommandExecution({
      command: "Cache: Open the file with the recently loaded elements",
    });

    // get the text from the editor
    const text = await new TextEditor().getText();
    const cache = JSON.parse(text);

    // get the key that was NOT used for the update but should be updated in the cache
    const keys = Object.keys(cache).filter((pKey) => pKey.includes(configurationNameDupe));
    assert.strictEqual(keys.length, 1, `there should be one element in ${keys}`);
    const key = keys[0];

    const cacheForKey: Connection = cache[key];
    // sanitize the result to remove the lastUsed from the changelogs and to lowercase the path
    cacheForKey.changelogs.forEach((pChangelog) => {
      pChangelog.lastUsed = 1;
      pChangelog.path = pChangelog.path.toLowerCase();
    });

    assert.deepStrictEqual(
      cacheForKey,
      expectedConnectionFromCache,
      "cache was not updated correctly after loading contexts"
    );
  });

  /**
   * Clean up after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
