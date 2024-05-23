import assert from "assert";
import { WebviewTestUtils } from "./WebviewTestUtils";
import { By, InputBox, Key } from "vscode-extension-tester";
import path from "path";
import { CommandUtils } from "../CommandUtils";

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
   * Tests that the changelog can be selected from the folder selection button.
   */
  test("should be able to select changelog", async () => {
    await CommandUtils.openWorkspace();

    await WebviewTestUtils.openAndExecuteOnWebview(async (webView) => {
      const changelogSelection = await webView.findWebElement(By.id("changelogSelection"));

      await changelogSelection.click();

      // swap out of the webview to fill in the folder
      await webView.switchBack();

      const input = new InputBox();
      await input.setText(CommandUtils.CHANGELOG_FILE);
      await input.selectQuickPick(1);

      // swap back to the webview
      await webView.switchToFrame();

      const changelogInput = await webView.findWebElement(By.id("changelogInput"));

      const changelogValue = await changelogInput.getAttribute("value");

      assert.strictEqual(changelogValue, path.join(".liquibase", "changelog.xml"));
    });
  });
});
