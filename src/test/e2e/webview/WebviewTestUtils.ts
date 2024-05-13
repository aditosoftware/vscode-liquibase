import { WebView, Workbench } from "vscode-extension-tester";

/**
 * Utility class for the webview e2e tests.
 */
export class WebviewTestUtils {
  /**
   * Opens the webview before each test.
   * @returns the opened webview
   */
  static async openWebview(): Promise<WebView> {
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
}
