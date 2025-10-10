import { BottomBarPanel } from "vscode-extension-tester";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { ContextOptions } from "../../../constants";
import assert from "node:assert";

/**
 * Test suite for the open output channel setting (`liquibase.openOutputChannelOnCommandStart`).
 */
suite("Open output Channel On Start", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Sets up the test suite before running any tests.
   */
  suiteSetup(async function () {
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  /**
   * Cleans up the test suite after running all tests.
   */
  suiteTeardown(async () => {
    await LiquibaseGUITestUtils.setSetting("liquibase.openOutputChannelOnCommandStart", true);
    await DockerTestUtils.stopAndRemoveContainer();
  });

  for (const settingValue of [false, true]) {
    /**
     * Tests the visibility of the output channel after that setting was set to a specific value.
     */
    test(`should ${settingValue ? "" : "not"} show the output channel after command start`, async function () {
      await LiquibaseGUITestUtils.setSetting("liquibase.openOutputChannelOnCommandStart", settingValue);

      // close the bottom bar panel, if it is visible.
      // per default, the panel would be always visible, but we do not want it
      if (await new BottomBarPanel().isDisplayed()) {
        await new BottomBarPanel().closePanel();
      }

      // execute any command that would open the output channel
      await LiquibaseGUITestUtils.executeUpdate(configurationName, ContextOptions.LOAD_ALL_CONTEXT);

      // check if the output channel was opened, after the command was executed
      assert.strictEqual(await new BottomBarPanel().isDisplayed(), settingValue, " bottom bar panel visibility");
      if (settingValue) {
        // If the setting is false, then there is no BottomBarPanel and therefore this call would produce an StaleElementReferenceError.
        assert.ok(await LiquibaseGUITestUtils.outputPanel.isDisplayed(), "output panel is displayed");
      }
    });
  }
});
