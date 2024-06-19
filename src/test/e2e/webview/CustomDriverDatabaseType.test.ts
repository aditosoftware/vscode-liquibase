import { By } from "vscode-extension-tester";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { WebviewTestUtils } from "./WebviewTestUtils";
import assert from "assert";

/**
 * Tests custom driver selection.
 */
suite("Custom Drivers", () => {
  /**
   * Tests that the change from no driver to a custom driver works as expected.
   */
  test("should correctly change to custom drivers", async function () {
    const customDriver = await LiquibaseGUITestUtils.createCustomDriver();
    await WebviewTestUtils.openAndExecuteOnWebview(async (webView) => {
      const databaseTypeSelection = await webView.findWebElement(By.id("dbConfig_databaseTypeSelection"));

      // change the value of the database selection to MariaDB
      await databaseTypeSelection.sendKeys(customDriver);

      assert.strictEqual(await databaseTypeSelection.getAttribute("value"), customDriver);

      // check that the necessary elements are visible
      await assert.doesNotReject(webView.findWebElement(By.id("dbConfig_url")));
      await assert.doesNotReject(webView.findWebElement(By.id("dbConfig_serverAddress")));
      await assert.doesNotReject(webView.findWebElement(By.id("dbConfig_port")));
      await assert.doesNotReject(webView.findWebElement(By.id("dbConfig_databaseName")));

      // and check that the elements for pre configured drivers are not visible and therefore throwing an error
      await assert.rejects(webView.findWebElement(By.id("dbConfig_driver")));
    });
  });
});
