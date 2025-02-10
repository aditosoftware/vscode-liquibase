import assert from "assert";
import { By, EditorView, InputBox, Key, VSBrowser, WebView, Workbench } from "vscode-extension-tester";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { randomUUID } from "crypto";

/**
 * Utility class for the webview e2e tests.
 */
export class WebviewTestUtils {
  /**
   * Opens the webview before each test.
   *
   * @returns the opened webview
   */
  private static async openWebview(): Promise<WebView> {
    // command for opening the webview
    await new Workbench().executeCommand("liquibase.createLiquibaseConfiguration");

    assert.ok(await this.checkForOpenedWebview());

    // clear all notifications after the webview was loaded
    await LiquibaseGUITestUtils.clearNotifications();

    // init the WebView page object
    const webView = new WebView();
    // switch webdriver into the webview iframe, now all webdriver commands are
    // relative to the webview document's root
    // make sure not to try accessing elements outside the web view while switched inside and vice versa
    await webView.switchToFrame();

    return webView;
  }

  /**
   * Check if the webview is opened
   *
   * @returns `true`, if the webview was opened
   */
  static async checkForOpenedWebview(): Promise<boolean> {
    const editor = new EditorView();

    return VSBrowser.instance.driver.wait(
      async () => {
        try {
          await editor.getTabByTitle("Liquibase Configuration");
          return true;
        } catch (error) {
          console.debug("error finding webview in the opened editor", error);
          return false;
        }
      },
      2_000,
      "waiting for the webview to open"
    );
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
    await LiquibaseGUITestUtils.clearNotifications();

    // if we have any remaining input fields, close them
    try {
      const input = new InputBox();
      if (await input.isDisplayed()) {
        await input.cancel();
      }
    } catch (error) {
      // if it does not work, just log the error and ignore it
      console.error("error trying to cancel any input box", error);
    }

    const editorView = new EditorView();
    if (await editorView.isDisplayed()) {
      await editorView.closeAllEditors();
    }

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
   *
   * @param webView - the webview from which the preview should be taken
   * @param expected - the expected text that should be contained in the preview
   */
  static async assertMatchPreview(webView: WebView, expected: RegExp): Promise<void> {
    const text = await WebviewTestUtils.extractPreviewText(webView);

    assert.match(text, expected);
  }

  /**
   * Tests if the content in the preview is equals to the expected expression.
   *
   * @param webView - the webview from which the preview should be taken
   * @param expected - the expected text that should be equals the preview
   */
  static async assertEqualsPreview(webView: WebView, expected: string): Promise<void> {
    const text = await WebviewTestUtils.extractPreviewText(webView);

    assert.strictEqual(text, expected);
  }

  /**
   *Extracts the text of the preview.
   *
   * @param webView - the webview from which the preview should be taken
   * @returns the text of the preview
   */
  private static async extractPreviewText(webView: WebView): Promise<string> {
    const preview = await webView.findWebElement(By.id("preview"));
    const text = await preview.getText();
    return text;
  }

  /**
   * Writes MariaDB data for a normal configuration to the webview.
   * Also clicks the given button.
   *
   * @param config - the configuration that should be written
   */
  static async addConfigurationDataToWebview(
    config: Config = {
      name: randomUUID(),
      buttonToClick: "saveButton",
      port: 3310,
      databaseType: "MariaDB",
      databaseName: DockerTestUtils.dbName,
    }
  ): Promise<void> {
    await WebviewTestUtils.openAndExecuteOnWebview(async (webView) => {
      const nameInput = await webView.findWebElement(By.id("nameInput"));
      await nameInput.sendKeys(config.name);

      if (config.addChangelog) {
        // only select a changelog when needed
        const changelogSelection = await webView.findWebElement(By.id("changelogSelection"));

        await changelogSelection.click();
        // swap out of the webview to fill in the folder
        await webView.switchBack();

        const input = new InputBox();
        await input.setText(LiquibaseGUITestUtils.CHANGELOG_FILE);
        await input.selectQuickPick(1);

        // swap back to the webview
        await webView.switchToFrame();
      }

      const username = await webView.findWebElement(By.id("dbConfig_username"));
      await username.sendKeys(DockerTestUtils.username, Key.TAB);

      const password = await webView.findWebElement(By.id("dbConfig_password"));
      await password.sendKeys(DockerTestUtils.password, Key.TAB);

      const databaseType = await webView.findWebElement(By.id("dbConfig_databaseTypeSelection"));
      await databaseType.sendKeys(config.databaseType);

      const serverAddress = await webView.findWebElement(By.id("dbConfig_serverAddress"));
      await serverAddress.sendKeys(DockerTestUtils.getDockerIP(), Key.TAB);

      const port = await webView.findWebElement(By.id("dbConfig_port"));
      await port.sendKeys(config.port, Key.TAB);

      const databaseName = await webView.findWebElement(By.id("dbConfig_databaseName"));
      await databaseName.sendKeys(config.databaseName, Key.TAB);

      const button = await webView.findWebElement(By.id(config.buttonToClick));
      assert.deepStrictEqual(await button.getAttribute("id"), config.buttonToClick, "button id");

      try {
        await button.click();
      } catch {
        await webView.switchToFrame(1000);
        await webView.getDriver().executeScript("arguments[0].click();", button);
      }
    });

    if (config.buttonToClick === "saveButton") {
      await LiquibaseGUITestUtils.waitForCommandExecution(`Configuration for ${config.name} was successfully saved.`);
    }
  }
}

/**
 * The configuration that should be used for saving the default config to the webview.
 */
interface Config {
  /**
   * The name of the configuration.
   */
  name: string;
  /**
   * The databaseType that should be selected
   */
  databaseType: "MariaDB" | "PostgreSQL";

  /**
   * The name of the database.
   */
  databaseName: string;

  /**
   * If a changelog should be written.
   */
  addChangelog?: boolean;

  /**
   * The button that should be clicked  after the configuration was added.
   */
  buttonToClick: "saveButton" | "testButton";

  /**
   * The port that should be written
   */
  port: number;
}
