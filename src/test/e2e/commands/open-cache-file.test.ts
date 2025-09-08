import assert from "assert";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { ModalDialog, TextEditor } from "vscode-extension-tester";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { ContextOptions } from "../../../constants";
import { Connection, ContextSelection } from "../../../cache";

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
   * Trying to close any opened model dialog after the test.
   */
  teardown(async () => {
    try {
      const modalDialog = new ModalDialog();
      await modalDialog.close();
    } catch (e) {
      console.error(`error while trying to close the dialog ${e}`);
    }
  });

  /**
   * Tests that no cache file will be opened, when none does exist.
   */
  test("should fail open cache file", async () => {
    // first, remove the whole cache
    await LiquibaseGUITestUtils.removeWholeCache(true);

    // try to execute the command
    await LiquibaseGUITestUtils.startCommandExecution({
      command: "Cache: Open the file with the recently loaded elements",
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
    const expectedConnectionFromCache: Connection = {
      changelogs: [
        {
          path: LiquibaseGUITestUtils.CHANGELOG_FILE.toLowerCase(),
          lastUsed: 1,
          contexts: {
            loadedContexts: ["bar", "baz", "foo"],
            selectedContexts: ["foo"],
          },
        },
      ],
    };

    // create some data for the cache
    await LiquibaseGUITestUtils.executeUpdate(configurationName, ContextOptions.LOAD_ALL_CONTEXT, "foo");

    // open the cache file
    await LiquibaseGUITestUtils.startCommandExecution({
      command: "Cache: Open the file with the recently loaded elements",
    });

    // get the text from the editor
    const text = await new TextEditor().getText();
    const cache = JSON.parse(text);

    // get the key with our configuration name
    const keys = Object.keys(cache).filter((pKey) => pKey.includes(configurationName));
    assert.strictEqual(keys.length, 1, `there should be one element in ${keys}`);
    const key = keys[0];

    // get the cache for our key and check that the contexts are there
    const cacheForKey: Connection = cache[key];
    // sanitize the result to remove the lastUsed from the changelogs
    cacheForKey.changelogs.forEach((pChangelog) => {
      pChangelog.lastUsed = 1;
      pChangelog.path = pChangelog.path.toLowerCase();
    });

    assert.deepStrictEqual(cacheForKey, expectedConnectionFromCache);

    //// now, check that the selection is there in the context input
    const input = await LiquibaseGUITestUtils.startCommandExecution({
      command: "update...",
      configurationName,
      changelogFile: true,
    });

    await input.setText(ContextOptions.USE_RECENTLY_LOADED);
    await input.confirm();

    await LiquibaseGUITestUtils.waitForCheckboxesToBeThere(input);
    const quickPicks = await input.getCheckboxes();

    const actualContexts: ContextSelection = {
      loadedContexts: [],
      selectedContexts: [],
    };

    // check every quick pick for the cached selection
    for (const quickPick of quickPicks) {
      const label = await quickPick.getLabel();
      const selected = await quickPick.getAttribute("aria-checked");

      actualContexts.loadedContexts?.push(label);

      if (selected === "true") {
        actualContexts.selectedContexts?.push(label);
      }
    }

    assert.deepStrictEqual(
      actualContexts,
      expectedConnectionFromCache.changelogs[0].contexts,
      "contexts with selections"
    );

    // cancel any input after the test
    await input.cancel();
  });
});
