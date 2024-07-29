import { WebviewTestUtils } from "./WebviewTestUtils";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import assert from "assert";
import { randomUUID } from "crypto";
import { DockerTestUtils } from "../../suite/DockerTestUtils";

/**
 * Tests the normal configuration of the webview.
 */
suite("Configuration of the Webview", () => {
  /**
   * Before the tests, open a temp workspace.
   */
  suiteSetup(async function () {
    await LiquibaseGUITestUtils.setupTests();
  });

  /**
   * Stop all docker containers after the test.
   */
  suiteTeardown(async function () {
    await DockerTestUtils.stopAndRemoveContainer();
  });

  /**
   * Tests that the "Test configuration" will work.
   */
  test("should test configuration", async function () {
    const name = randomUUID();

    await WebviewTestUtils.addConfigurationDataToWebview({
      name,
      port: 3310,
      buttonToClick: "testButton",
      databaseType: "MariaDB",
      databaseName: DockerTestUtils.dbName,
      addChangelog: true,
    });

    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'validate' was executed successfully.")
    );
  });

  /**
   * Tests that a normal configuration can be saved as expected.
   */
  test("should save configuration", async function () {
    const name = randomUUID();

    await WebviewTestUtils.addConfigurationDataToWebview({
      name,
      port: 3310,
      buttonToClick: "saveButton",
      databaseType: "MariaDB",
      databaseName: DockerTestUtils.dbName,
      addChangelog: true,
    });

    assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution(`Configuration for ${name} was successfully saved.`));
  });
});
