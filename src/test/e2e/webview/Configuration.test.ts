import { By, InputBox, Key } from "vscode-extension-tester";
import { WebviewTestUtils } from "./WebviewTestUtils";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import assert from "assert";
import { randomUUID } from "crypto";
import { CommandUtils } from "../CommandUtils";
import path from "path";
import { DockerTestUtils } from "../../suite/DockerTestUtils";

/**
 * Tests the normal configuration of the webview.
 */
suite("Configuration of the Webview", () => {
  /**
   * Before the tests, open a temp workspace.
   */
  suiteSetup(async function () {
    this.timeout(50_000);
    await CommandUtils.setupTests();
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

    await addConfigurationDataToWebview(name, "testButton");

    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'validate' was executed successfully.")
    );
  });

  /**
   * Tests that a normal configuration can be saved as expected.
   */
  test("should save configuration", async function () {
    const name = randomUUID();

    await addConfigurationDataToWebview(name, "saveButton");

    assert.ok(await LiquibaseGUITestUtils.notificationExists(`Configuration for ${name} was successfully saved.`));
  });
});

/**
 * Writes MariaDB data for a normal configuration to the webview.
 * Also clicks the given button.
 *
 * @param name - the name of the configuration that should be written
 * @param buttonToClick - the button that should be clicked
 * @param pPort - the port that should be written
 */
async function addConfigurationDataToWebview(
  name: string,
  buttonToClick: "saveButton" | "testButton",
  pPort: number = 3310
): Promise<void> {
  await WebviewTestUtils.openAndExecuteOnWebview(async (webView) => {
    const nameInput = await webView.findWebElement(By.id("nameInput"));
    await nameInput.sendKeys(name);

    // select changelog
    const changelogSelection = await webView.findWebElement(By.id("changelogSelection"));

    await changelogSelection.click();
    // swap out of the webview to fill in the folder
    await webView.switchBack();

    const input = new InputBox();
    await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
    await input.selectQuickPick(1);

    // swap back to the webview
    await webView.switchToFrame();

    const username = await webView.findWebElement(By.id("dbConfig_username"));
    await username.sendKeys(DockerTestUtils.username, Key.TAB);

    const password = await webView.findWebElement(By.id("dbConfig_password"));
    await password.sendKeys(DockerTestUtils.password, Key.TAB);

    const databaseType = await webView.findWebElement(By.id("dbConfig_databaseTypeSelection"));
    await databaseType.sendKeys("MariaDB");

    const serverAddress = await webView.findWebElement(By.id("dbConfig_serverAddress"));
    await serverAddress.sendKeys("localhost", Key.TAB);

    const port = await webView.findWebElement(By.id("dbConfig_port"));
    await port.sendKeys(pPort, Key.TAB);

    const databaseName = await webView.findWebElement(By.id("dbConfig_databaseName"));
    await databaseName.sendKeys(DockerTestUtils.dbName, Key.TAB);

    const button = await webView.findWebElement(By.id(buttonToClick));

    await button.click();
  });
}
