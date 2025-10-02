import { By, Key } from "vscode-extension-tester";
import { WebviewTestUtils } from "./WebviewTestUtils";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import assert from "node:assert";

/**
 * Tests the connection of the database.
 */
suite("DatabaseConnection", () => {
  /**
   * Tests that the password put into the the password field is disguised.
   */
  test("should disguise password", async () => {
    await WebviewTestUtils.openAndExecuteOnWebview(async (webView) => {
      const password = await webView.findWebElement(By.id("dbConfig_password"));

      await password.sendKeys("Lorem_ipsum1", Key.TAB);

      await WebviewTestUtils.assertMatchPreview(webView, /password = \*\*\*/);
    });
  });

  /**
   * Tests that the url is correctly built when server address, port and database name are filled.
   */
  test("should update url correctly", async function () {
    const database = "MariaDB";

    await LiquibaseGUITestUtils.setSetting("liquibase.defaultDatabaseForConfiguration", database);

    await WebviewTestUtils.openAndExecuteOnWebview(async (webView) => {
      const serverAddress = await webView.findWebElement(By.id("dbConfig_serverAddress"));
      await serverAddress.sendKeys("127.0.0.1", Key.TAB);

      const port = await webView.findWebElement(By.id("dbConfig_port"));
      await port.sendKeys("3307", Key.TAB);

      const databaseName = await webView.findWebElement(By.id("dbConfig_databaseName"));
      await databaseName.sendKeys("myDatabase", Key.TAB);

      const url = await webView.findWebElement(By.id("dbConfig_url"));
      const value = await url.getAttribute("value");

      assert.strictEqual(value, "jdbc:mariadb://127.0.0.1:3307/myDatabase");
    });
  });

  /**
   * Tests that the url parts are updated correctly when the url was updated.
   */
  test("should update url parts correctly", async function () {
    const database = "MariaDB";

    await LiquibaseGUITestUtils.setSetting("liquibase.defaultDatabaseForConfiguration", database);

    await WebviewTestUtils.openAndExecuteOnWebview(async (webView) => {
      const url = await webView.findWebElement(By.id("dbConfig_url"));
      await url.sendKeys("jdbc:mariadb://127.0.0.1:3307/myDatabase", Key.TAB);

      const serverAddress = await webView.findWebElement(By.id("dbConfig_serverAddress"));
      assert.strictEqual(await serverAddress.getAttribute("value"), "127.0.0.1");

      const port = await webView.findWebElement(By.id("dbConfig_port"));
      assert.strictEqual(await port.getAttribute("value"), "3307");

      const databaseName = await webView.findWebElement(By.id("dbConfig_databaseName"));
      assert.strictEqual(await databaseName.getAttribute("value"), "myDatabase");
    });
  });
});
