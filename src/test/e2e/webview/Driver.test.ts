import { By } from "vscode-extension-tester";
import { NO_PRE_CONFIGURED_DRIVER } from "../../../configuration/drivers";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { WebviewTestUtils } from "./WebviewTestUtils";
import assert from "assert";

/**
 * Tests various conditions with the driver selection.
 */
suite("driver", () => {
  /**
   * The text that is used for the settings for no pre configured value.
   */
  const noPreConfiguredDriverText = "no pre-configured driver";

  /**
   * Tests that the database config is set up correctly when the default database is set to `NO_PRE_CONFIGURED_DRIVER`.
   */
  test("should be loaded correctly with no pre configured driver", async function () {
    await LiquibaseGUITestUtils.setSetting("liquibase.defaultDatabaseForConfiguration", noPreConfiguredDriverText);

    await WebviewTestUtils.openAndExecuteOnWebview(async (webView) => {
      // check that the value is set correctly
      const databaseTypeSelection = await webView.findWebElement(By.id("dbConfig_databaseTypeSelection"));
      const value = await databaseTypeSelection.getAttribute("value");

      assert.strictEqual(value, NO_PRE_CONFIGURED_DRIVER);

      // check that the necessary elements are visible
      await assert.doesNotReject(webView.findWebElement(By.id("dbConfig_url")));
      await assert.doesNotReject(webView.findWebElement(By.id("dbConfig_driver")));

      // and check that the elements for pre configured drivers are not visible and therefore throwing an error
      await assert.rejects(webView.findWebElement(By.id("dbConfig_serverAddress")));
      await assert.rejects(webView.findWebElement(By.id("dbConfig_port")));
      await assert.rejects(webView.findWebElement(By.id("dbConfig_databaseName")));
    });
  });

  /**
   * Tests that the database config is set up correctly when the default database is set to a pre configured database (in this case MariaDB).
   */
  test("should be loaded correctly with a pre configured driver", async function () {
    const database = "MariaDB";

    await LiquibaseGUITestUtils.setSetting("liquibase.defaultDatabaseForConfiguration", database);

    await WebviewTestUtils.openAndExecuteOnWebview(async (webView) => {
      // check that the value is set correctly
      const databaseTypeSelection = await webView.findWebElement(By.id("dbConfig_databaseTypeSelection"));
      const value = await databaseTypeSelection.getAttribute("value");

      assert.strictEqual(value, database);

      // check that the necessary elements are visible
      await assert.doesNotReject(webView.findWebElement(By.id("dbConfig_url")));
      await assert.doesNotReject(webView.findWebElement(By.id("dbConfig_serverAddress")));
      await assert.doesNotReject(webView.findWebElement(By.id("dbConfig_port")));
      await assert.doesNotReject(webView.findWebElement(By.id("dbConfig_databaseName")));

      // and check that the elements for pre configured drivers are not visible and therefore throwing an error
      await assert.rejects(webView.findWebElement(By.id("dbConfig_driver")));
    });
  });

  /**
   * Tests that the change from no pre configured driver to a configured driver works as expected.
   */
  test("should change correctly drivers", async function () {
    await LiquibaseGUITestUtils.setSetting("liquibase.defaultDatabaseForConfiguration", noPreConfiguredDriverText);

    await WebviewTestUtils.openAndExecuteOnWebview(async (webView) => {
      const databaseTypeSelection = await webView.findWebElement(By.id("dbConfig_databaseTypeSelection"));

      // check that the necessary elements are visible
      await assert.doesNotReject(webView.findWebElement(By.id("dbConfig_url")));
      await assert.doesNotReject(webView.findWebElement(By.id("dbConfig_driver")));

      // and check that the elements for pre configured drivers are not visible and therefore throwing an error
      await assert.rejects(webView.findWebElement(By.id("dbConfig_serverAddress")));
      await assert.rejects(webView.findWebElement(By.id("dbConfig_port")));
      await assert.rejects(webView.findWebElement(By.id("dbConfig_databaseName")));

      // change the value of the database selection to MariaDB
      await databaseTypeSelection.sendKeys("MariaDB");

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
