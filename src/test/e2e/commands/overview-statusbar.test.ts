import { InputBox, StatusBar } from "vscode-extension-tester";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import assert from "assert";
/**
 * Tests the overview item in the status bar.
 */
suite("overview item in statusbar", () => {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Create the configuration before all tests.
   */
  suiteSetup(async () => {
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  /**
   * Removes the container after the tests.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });

  /**
   * Tests that the status bar item exists and is clickable
   */
  test("should have status bar and clicks it", async () => {
    const statusBar = new StatusBar();

    const item = await statusBar.getItem("book, Generate an overview of your Liquibase database");
    assert.ok(item, "no status bar item is there");

    await item.click();

    const inputBox = new InputBox();

    await LiquibaseGUITestUtils.selectConfigurationAndChangelogFile(inputBox, configurationName, true);

    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'db-doc' was executed successfully.")
    );
  });
});
