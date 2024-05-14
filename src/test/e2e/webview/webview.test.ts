import assert from "assert";
import { By, EditorView, InputBox, Key, WebView } from "vscode-extension-tester";
import { CommandUtils } from "../CommandUtils";
import { MariaDbDockerTestUtils } from "../../suite/MariaDbDockerTestUtils";
import { WebviewTestUtils } from "./WebviewTestUtils";
import path from "path";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { NO_PRE_CONFIGURED_DRIVER } from "../../../configuration/drivers";

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
    await new EditorView().closeAllEditors();
    await MariaDbDockerTestUtils.stopAndRemoveContainer();
  });

  /**
   * Tests that the title should be correct.
   */
  test("should title be correct", async function () {
    await WebviewTestUtils.openAndExecuteOnWebview(async (webView) => {
      const element = await webView.findWebElement(By.css("h1"));
      assert.strictEqual(await element.getText(), "Liquibase Configuration");
    });
  });

  /**
   * Tests that the classpath was written correctly to the preview.
   */
  [
    {
      title: "Linux/Mac",
      expected: /classpath = a:b/,
      selection: "classpathSeparatorUnix",
    },
    {
      title: "Windows",
      expected: /classpath = a;b/,
      selection: "classpathSeparatorWindows",
    },
  ].forEach((pArgument) => {
    test(`should have correct classpath for ${pArgument.title}`, async function () {
      await WebviewTestUtils.openAndExecuteOnWebview(async (webView) => {
        const classpathInput = await webView.findWebElement(By.id("classpathInput"));
        await classpathInput.sendKeys("a", Key.ENTER, "b");

        const classpathSeparator = await webView.findWebElement(By.id(pArgument.selection));
        await classpathSeparator.click();

        // find the preview text
        await WebviewTestUtils.assertMatchPreview(webView, pArgument.expected);
      });
    });
  });

  /**
   * Tests that the link to the documentation should be there.
   */
  test("should have link to documentation", async () => {
    await WebviewTestUtils.openAndExecuteOnWebview(async (webView) => {
      const link = await webView.findWebElement(By.id("documentationLink"));
      const href = await link.getAttribute("href");

      assert.strictEqual(href, "https://docs.liquibase.com/concepts/connections/creating-config-properties.html");
    });
  });

  /**
   * Tests that the changelog can be selected from the folder selection button.
   */
  test("should be able to select changelog", async () => {
    await WebviewTestUtils.openAndExecuteOnWebview(async (webView) => {
      const changelogSelection = await webView.findWebElement(By.id("changelogSelection"));

      await changelogSelection.click();

      // swap out of the webview to fill in the folder
      await webView.switchBack();

      const input = new InputBox();
      await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
      await input.selectQuickPick(1);

      // swap back to the webview
      await webView.switchToFrame();

      const changelogInput = await webView.findWebElement(By.id("changelogInput"));

      const changelogValue = await changelogInput.getAttribute("value");

      assert.strictEqual(changelogValue, path.join("liquibase", "changelog.xml"));
    });
  });

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
   * Tests that the password put into the the password field of the reference connection is disguised.
   */
  test("should disguise reference password", async function () {
    await WebviewTestUtils.openAndExecuteOnWebview(async (webView) => {
      // click the button to show the reference connection
      const addReferenceConnection = await webView.findWebElement(By.id("addReferenceConnection"));
      await addReferenceConnection.click();

      const password = await webView.findWebElement(By.id("referenceConfig_password"));

      await password.sendKeys("Lorem_ipsum1", Key.TAB);

      await WebviewTestUtils.assertMatchPreview(webView, /referencePassword = \*\*\*/);
    });
  });

  /**
   * Tests that the database config is set up correctly when the default database is set to `NO_PRE_CONFIGURED_DRIVER`.
   */
  test("should be loaded correctly with no pre configured driver", async function () {
    await LiquibaseGUITestUtils.setSetting("liquibase.defaultDatabaseForConfiguration", NO_PRE_CONFIGURED_DRIVER);

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

  /**
   * Tests that the change from no pre configured driver to a configured driver works as expected.
   */
  test("should change correctly drivers", async function () {
    await LiquibaseGUITestUtils.setSetting("liquibase.defaultDatabaseForConfiguration", NO_PRE_CONFIGURED_DRIVER);

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

  /**
   * Tests that the reference connection will be shown correctly when it should be shown via button. Also checks if the reference connection will not be shown when removed
   */
  test("should show correctly the reference connection", async function () {
    await WebviewTestUtils.openAndExecuteOnWebview(async (webView) => {
      const addReferenceConnection = await webView.findWebElement(By.id("addReferenceConnection"));
      const removeReferenceConnection = await webView.findWebElement(By.id("removeReferenceConnection"));

      // test that the reference connection is currently not visible
      await assert.rejects(webView.findWebElement(By.id("referenceConfig_databaseConnection")));
      assert.ok(await addReferenceConnection.isEnabled());

      // click the button to show the reference connection
      await addReferenceConnection.click();

      // check that the reference connection is now there
      await assert.doesNotReject(webView.findWebElement(By.id("referenceConfig_databaseConnection")));
      assert.ok(await removeReferenceConnection.isEnabled());

      // click the button to remove the reference connection
      await removeReferenceConnection.click();

      // test that the reference connection is currently not visible
      await assert.rejects(webView.findWebElement(By.id("referenceConfig_databaseConnection")));
      assert.ok(await addReferenceConnection.isEnabled());
    });
  });

  /**
   * Tests that an additional element can be added.
   */
  test("should add additional element", async function () {
    await WebviewTestUtils.openAndExecuteOnWebview(async (webView) => {
      await addAdditionalElement(webView);
    });
  });

  /**
   * Tests that an addition element can be removed.
   */
  test("should remove additional element", async function () {
    await WebviewTestUtils.openAndExecuteOnWebview(async (webView) => {
      await addAdditionalElement(webView);

      // find the delete button of the row and remove the content
      const removeButton = await webView.findWebElement(By.id("delete;;;lorem;;;ipsum"));
      await removeButton.click();

      await WebviewTestUtils.assertEqualsPreview(webView, "");
    });
  });

  /**
   * Tests that the key of an additional element can be edited.
   */
  test("should edit the key of additional element", async function () {
    await WebviewTestUtils.openAndExecuteOnWebview(async (webView) => {
      await addAdditionalElement(webView);

      const key = await webView.findWebElement(By.id("key;;;lorem;;;ipsum"));
      // first click to start editing
      await key.click();
      // then send the new keys and leave with tab
      await key.sendKeys("_dolor", Key.TAB);

      await WebviewTestUtils.assertMatchPreview(webView, /lorem_dolor = ipsum/);
    });
  });

  /**
   * Tests that the value of an additional element can be edited.
   */
  test("should edit the value of additional element", async function () {
    await WebviewTestUtils.openAndExecuteOnWebview(async (webView) => {
      await addAdditionalElement(webView);

      const value = await webView.findWebElement(By.id("value;;;lorem;;;ipsum"));
      // first click to start editing
      await value.click();
      // then send the new keys and leave with tab
      await value.sendKeys("_dolor", Key.TAB);

      await WebviewTestUtils.assertMatchPreview(webView, /lorem = ipsum_dolor/);
    });
  });
});

/**
 * Adds an additional element with key `lorem` and value `ipsum` to the additional elements.
 * Also verifies that this element was correctly added by checking the preview.
 *
 * @param webView - the webview to which an additional element should be added
 */
async function addAdditionalElement(webView: WebView): Promise<void> {
  const keyInput = await webView.findWebElement(By.id("keyInput"));
  await keyInput.sendKeys("lorem");

  const valueInput = await webView.findWebElement(By.id("valueInput"));
  await valueInput.sendKeys("ipsum");

  const addButton = await webView.findWebElement(By.id("addButton"));
  await addButton.click();

  await WebviewTestUtils.assertMatchPreview(webView, /lorem = ipsum/);
}
