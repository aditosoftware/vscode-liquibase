import { By, Key } from "vscode-extension-tester";
import { WebviewTestUtils } from "./WebviewTestUtils";
import assert from "node:assert";

/**
 * Tests various elements with the reference connection.
 */
suite("reference connection", () => {
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
});
