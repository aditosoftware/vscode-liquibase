import assert from "assert";
import { By, EditorView, WebView, Workbench } from "vscode-extension-tester";

/**
 * Tests the webview
 */
suite("Webview Test", () => {
  let webView: WebView;

  /**
   * Before the tests, open a temp workspace and close all opened editors (like welcome screen).
   */
  suiteSetup(async function () {
    this.timeout(20_000);
    await new EditorView().closeAllEditors();
  });

  /**
   * Before each test, open the webview in order to not have any rests from previous tests.
   */
  setup(async function () {
    this.timeout(20_000);

    // command for opening the webview
    await new Workbench().executeCommand("liquibase.createLiquibaseConfiguration");

    // wait a bit to have the webview there
    await new Promise((res) => setTimeout(res, 5_000));

    // init the WebView page object
    webView = new WebView();
    // switch webdriver into the webview iframe, now all webdriver commands are
    // relative to the webview document's root
    // make sure not to try accessing elements outside the web view while switched inside and vice versa
    await webView.switchToFrame();
  });

  /**
   * Switch webdriver back to the vscode window after each test.
   */
  teardown(async function () {
    await webView.switchBack();
  });

  /**
   * Close all editors after the test.
   */
  suiteTeardown(async function () {
    await new EditorView().closeAllEditors();
  });

  /**
   * Tests that the title should be correct.
   */
  test("should title be correct", async function () {
    const element = await webView.findWebElement(By.css("h1"));
    assert.strictEqual(await element.getText(), "Liquibase Configuration");
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
      const classpathInput = await webView.findWebElement(By.id("classpathInput"));
      await classpathInput.sendKeys("a\nb");

      const classpathSeparator = await webView.findWebElement(By.id(pArgument.selection));
      await classpathSeparator.click();

      // find the preview text
      const preview = await webView.findWebElement(By.id("preview"));
      const text = await preview.getText();
      assert.match(text, pArgument.expected);
    });
  });
});
