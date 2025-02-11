import assert from "assert";
import { WebviewTestUtils } from "./WebviewTestUtils";
import { By, InputBox, VSBrowser } from "vscode-extension-tester";
import path from "path";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";

/**
 * Tests basic functionality from the webview.
 */
suite("Basic webview tests", () => {
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
    await LiquibaseGUITestUtils.openWorkspace();

    await WebviewTestUtils.openAndExecuteOnWebview(async (webView) => {
      const changelogSelection = await webView.findWebElement(By.id("changelogSelection"));

      await changelogSelection.click();

      // swap out of the webview to fill in the folder
      await webView.switchBack();

      await VSBrowser.instance.takeScreenshot("select_changelog_dialog");

      const input = new InputBox();
      await input.setText(LiquibaseGUITestUtils.CHANGELOG_FILE);
      await VSBrowser.instance.takeScreenshot("select_changelog_dialog_filled");
      await input.selectQuickPick(1);

      // swap back to the webview
      await webView.switchToFrame();

      const changelogInput = await webView.findWebElement(By.id("changelogInput"));

      const changelogValue = await changelogInput.getAttribute("value");

      assert.strictEqual(changelogValue, path.join(".liquibase", "changelog.xml"));
    });
  });
});
