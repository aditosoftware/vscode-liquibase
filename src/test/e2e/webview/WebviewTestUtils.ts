import assert from "assert";
import { By, WebView, Workbench } from "vscode-extension-tester";

/**
 * Utility class for the webview e2e tests.
 */
export class WebviewTestUtils {
  /**
   * Opens the webview before each test.
   * @returns the opened webview
   */
  private static async openWebview(): Promise<WebView> {
    // command for opening the webview
    await new Workbench().executeCommand("liquibase.createLiquibaseConfiguration");

    // wait a bit to have the webview there // TODO besserer Timeout?
    await new Promise((res) => setTimeout(res, 10_000));

    // init the WebView page object
    const webView = new WebView();
    // switch webdriver into the webview iframe, now all webdriver commands are
    // relative to the webview document's root
    // make sure not to try accessing elements outside the web view while switched inside and vice versa
    await webView.switchToFrame();

    return webView;
  }

  /**
   * Opens the webview and executes the desired method on it.
   *
   * **IMPORTANT:** After the webview is opened, you can only access everything else outside by swapping out of the webView via  `await webview.switchBack()`.
   * After you have done your outside calls, you need to swap to the webview to do your further calls via `await webView.switchToFrame()`.
   *
   * After the `toExecute` was executed, the webView will be switched back, so it will not interfere with other tests.
   *
   * @param toExecute - the tests that should be executed on the webview
   */
  static async openAndExecuteOnWebview(toExecute: (webView: WebView) => Promise<void>): Promise<void> {
    const webView = await this.openWebview();

    try {
      await toExecute(webView);
    } finally {
      // Switch webdriver back to the vscode window after each test.
      await webView.switchBack();
    }
  }

  /**
   * Tests if the content in the preview matches the expected expression.
   * @param webView - the webview from which the preview should be taken
   * @param expected - the expected text that should be contained in the preview
   */
  static async assertMatchPreview(webView: WebView, expected: RegExp): Promise<void> {
    const preview = await webView.findWebElement(By.id("preview"));

    // make a dummy click in order to leave any last element
    await preview.click();

    const text = await preview.getText();
    assert.match(text, expected);
  }
}
