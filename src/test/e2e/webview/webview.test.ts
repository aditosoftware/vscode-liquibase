import { CommandUtils } from "../CommandUtils";
import { MariaDbDockerTestUtils } from "../../suite/MariaDbDockerTestUtils";

/**
 * Tests the webview
 */
suite("Webview Test", () => {
  /**
   * Before the tests, open a temp workspace and close all opened editors (like welcome screen).
   */
  suiteSetup(async function () {
    this.timeout(50_000);
    await CommandUtils.setupTests();
  });

  /**
   * Close all editors after the test.
   */
  suiteTeardown(async function () {
    await MariaDbDockerTestUtils.stopAndRemoveContainer();
  });
});
