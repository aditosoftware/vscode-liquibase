import assert from "node:assert";
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
  const clock = 1744016763539;

  /**
   * Set up the test suite.
   */
  suiteSetup(async function () {
    // create configuration that is used for the update
    configurationName = await LiquibaseGUITestUtils.setupTests({ startContainer: true, addChangelog: true });
    // create a second configuration that is NOT used for the update but gets the cache entry updated
    configurationNameDupe = await LiquibaseGUITestUtils.setupTests({ startContainer: false, addChangelog: true });

    await DockerTestUtils.resetDB();
  });

  /**
   * Test case for loading contexts and checking if all property files are updated that point to the same changelog.
   */
  test("should insert loadedContext to all property-files which point to the same changelog", async function () {
    const expectedConnectionFromCache: Connection = {
      changelogs: [
        {
          path: LiquibaseGUITestUtils.CHANGELOG_FILE.toLowerCase(),
          lastUsed: clock,
          contexts: {
            loadedContexts: ["bar", "baz", "foo"],
            selectedContexts: [""],
          },
        },
      ],
    };

    await LiquibaseGUITestUtils.executeUpdate(configurationName, ContextOptions.LOAD_ALL_CONTEXT, "foo");

    // open the cache file
    await LiquibaseGUITestUtils.startCommandExecution({
      command: "Cache: Open the file with the recently loaded elements",
    });

    // get the text from the editor
    const text = await new TextEditor().getText();
    const cache = JSON.parse(text);

    // get the key that was NOT used for the update but should be updated in the cache
    const key = Object.keys(cache).find((pKey) => pKey.includes(configurationNameDupe));
    assert.ok(key);
    const cacheForKey: Connection = cache[key];
    // sanitize the result to remove the lastUsed from the changelogs and to lowercase the path
    for (const pChangelog of cacheForKey.changelogs) {
      pChangelog.lastUsed = clock;
      pChangelog.path = pChangelog.path.toLowerCase();
    }

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
