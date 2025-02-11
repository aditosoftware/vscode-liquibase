import { By, Key, VSBrowser, WebView } from "vscode-extension-tester";
import { WebviewTestUtils } from "./WebviewTestUtils";
import assert from "assert";

/**
 * Tests the additional elements from the webview.
 */
suite("AdditionalElements", () => {
  /**
   * Tests that an additional element can be added.
   */
  test("should add additional element", async function () {
    await WebviewTestUtils.openAndExecuteOnWebview(async (webView) => {
      await addAdditionalElement(webView, "add_additional");
    });
  });

  /**
   * Tests that an addition element can be removed.
   */
  test("should remove additional element", async function () {
    await WebviewTestUtils.openAndExecuteOnWebview(async (webView) => {
      await addAdditionalElement(webView, "remove_additional");

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
      await addAdditionalElement(webView, "edit_key");

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
      await addAdditionalElement(webView, "edit_val");

      const value = await webView.findWebElement(By.id("value;;;lorem;;;ipsum"));
      // first click to start editing
      await value.click();
      // then send the new keys and leave with tab
      await value.sendKeys("_dolor", Key.TAB);

      await WebviewTestUtils.assertMatchPreview(webView, /lorem = ipsum_dolor/);
    });
  });

  /**
   * Tests that an additional element can not be added with an unacceptable key.
   */
  test("should not add an element with an unacceptable key", async function () {
    await WebviewTestUtils.openAndExecuteOnWebview(async (webView) => {
      const keyInput = await webView.findWebElement(By.id("keyInput"));
      await keyInput.sendKeys("driver", Key.TAB);

      const valueInput = await webView.findWebElement(By.id("valueInput"));
      await valueInput.sendKeys("lorem", Key.TAB);

      const addButton = await webView.findWebElement(By.id("addButton"));
      await addButton.click();

      await WebviewTestUtils.assertEqualsPreview(webView, ""); //should not add the key-value pair
    });
  });

  /**
   * Tests that the link of help button is correct.
   */
  test("should validate the link of the help button", async function () {
    await WebviewTestUtils.openAndExecuteOnWebview(async (webView) => {
      const link = await webView.findWebElement(By.id("helpLink"));
      const href = await link.getAttribute("href");

      assert.strictEqual(href, "https://docs.liquibase.com/concepts/connections/creating-config-properties.html");
    });
  });

  /**
   * Tests that an additional element will be reverted to the old value if the key was an unacceptable key.
   */
  test("should return old value when editing an element with an unacceptable key", async function () {
    await WebviewTestUtils.openAndExecuteOnWebview(async (webView) => {
      const keyInput = await webView.findWebElement(By.id("keyInput"));
      await keyInput.sendKeys("driver2", Key.TAB);

      const valueInput = await webView.findWebElement(By.id("valueInput"));
      await valueInput.sendKeys("lorem", Key.TAB);

      const addButton = await webView.findWebElement(By.id("addButton"));
      await addButton.click();

      await VSBrowser.instance.takeScreenshot("old_value_before_edit");

      const value = await webView.findWebElement(By.id("key;;;driver2;;;lorem"));
      await value.click();
      const markAll = process.platform === "darwin" ? Key.chord(Key.COMMAND, "a") : Key.chord(Key.CONTROL, "a");
      await value.sendKeys(markAll, Key.BACK_SPACE, "driver", Key.TAB);

      await WebviewTestUtils.assertMatchPreview(webView, /driver2 = lorem/); //should not edit the first inserted key-value pair
    });
  });
});

/**
 * Adds an additional element with key `lorem` and value `ipsum` to the additional elements.
 * Also verifies that this element was correctly added by checking the preview.
 *
 * @param webView - the webview to which an additional element should be added
 */
async function addAdditionalElement(webView: WebView, name: string): Promise<void> {
  const keyInput = await webView.findWebElement(By.id("keyInput"));
  await keyInput.sendKeys("lorem", Key.TAB);

  const valueInput = await webView.findWebElement(By.id("valueInput"));
  await valueInput.sendKeys("ipsum", Key.TAB);

  const addButton = await webView.findWebElement(By.id("addButton"));
  await addButton.click();

  await VSBrowser.instance.takeScreenshot("add_" + name);

  await WebviewTestUtils.assertMatchPreview(webView, /lorem = ipsum/);
}
