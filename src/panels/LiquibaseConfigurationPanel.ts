import { Disposable, Webview, WebviewPanel, window, Uri, ViewColumn } from "vscode";
import { getUri, getNonce } from "../utilities/webviewUtilities";
import { createLiquibaseProperties } from "../configuration/handle/createAndAddConfiguration";
import { MessageData, MessageType } from "../configuration/transfer";
import { LiquibaseConfigurationData, ConfigurationStatus } from "../configuration/data/LiquibaseConfigurationData";
import { getDefaultDatabaseForConfiguration, getLiquibaseFolder } from "../handleLiquibaseSettings";
import { testLiquibaseConnection } from "../configuration/handle/testConfiguration";
import { chooseFileForChangelog } from "../configuration/handleChangelogSelection";
import { Logger, LoggingMessageWithLevel } from "@aditosoftware/vscode-logging";
import { getCustomDrivers } from "../utilities/customDrivers";
/**
 * This class manages the state and behavior of LiquibaseConfiguration webview panels.
 *
 * It contains all the data and methods for:
 *
 * - Creating and rendering LiquibaseConfiguration webview panels
 * - Properly cleaning up and disposing of webview resources when the panel is closed
 * - Setting the HTML (and by proxy CSS/JavaScript) content of the webview panel
 * - Setting message listeners so data can be passed between the webview and extension
 */
export class LiquibaseConfigurationPanel {
  public static currentPanel: LiquibaseConfigurationPanel | undefined;
  private readonly _panel: WebviewPanel;
  private _disposables: Disposable[] = [];

  /**
   * The LiquibaseConfigurationPanel class private constructor (called only from the render method).
   *
   * @param panel - A reference to the webview panel
   * @param extensionUri - The URI of the directory containing the extension
   */
  private constructor(panel: WebviewPanel, extensionUri: Uri) {
    this._panel = panel;

    // Set an event listener to listen for when the panel is disposed (i.e. when the user closes
    // the panel or when the panel is closed programmatically)
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Set the HTML content for the webview panel
    this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri);

    // Set an event listener to listen for messages passed from the webview context
    this._setWebviewMessageListener(this._panel.webview);
  }

  /**
   * Renders the current webview panel if it exists otherwise a new webview panel
   * will be created and displayed.
   *
   * @param extensionUri - The URI of the directory containing the extension.
   * @param data - the configuration data that should be passed to the webview.
   * If there is no data given, then a default init data will be passed
   */
  public static render(extensionUri: Uri, data?: LiquibaseConfigurationData): void {
    if (LiquibaseConfigurationPanel.currentPanel) {
      // If the webview panel already exists reveal it
      LiquibaseConfigurationPanel.currentPanel._panel.reveal(ViewColumn.One);
    } else {
      // If a webview panel does not already exist create and show a new one
      const panel = window.createWebviewPanel(
        // Panel view type
        "showLiquibaseConfiguration",
        // Panel title
        "Liquibase Configuration",
        // The editor column the panel should be displayed in
        ViewColumn.One,
        // Extra panel configurations
        {
          // Enable JavaScript in the webview
          enableScripts: true,
          // Restrict the webview to only load resources from the `out` and `webview-ui/build` directories
          localResourceRoots: [Uri.joinPath(extensionUri, "out"), Uri.joinPath(extensionUri, "webview-ui/build")],
          retainContextWhenHidden: true,
        }
      );

      LiquibaseConfigurationPanel.currentPanel = new LiquibaseConfigurationPanel(panel, extensionUri);
    }

    // In all cases, transfer a message with the current data
    this.transferMessage(
      MessageType.INIT,
      data
        ? data
        : LiquibaseConfigurationData.createDefaultData(
            {
              defaultDatabaseForConfiguration: getDefaultDatabaseForConfiguration(),
              liquibaseDirectoryInProject: getLiquibaseFolder(),
              customDrivers: getCustomDrivers(),
            },
            ConfigurationStatus.NEW
          )
    );
  }

  /**
   * Transfers a message to the webview.
   *
   * @param pMessageType - the type of the message
   * @param data - the data of the message
   */
  static transferMessage(pMessageType: MessageType, data: LiquibaseConfigurationData): void {
    LiquibaseConfigurationPanel.currentPanel?._panel.webview.postMessage(new MessageData(pMessageType, data)).then(
      (success) => {
        if (!success) {
          Logger.getLogger().error({ message: "error transferring the message to the webview" });
        }
      },
      (reject) => Logger.getLogger().debug({ message: `transfer message was rejected ${reject}` })
    );
  }

  /**
   * Cleans up and disposes of webview resources when the webview panel is closed.
   */
  public dispose(): void {
    LiquibaseConfigurationPanel.currentPanel = undefined;

    // Dispose of the current webview panel
    this._panel.dispose();

    // Dispose of all disposables (i.e. commands) for the current webview panel
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  /**
   * Defines and returns the HTML that should be rendered within the webview panel.
   *
   * @remarks This is also the place where references to the React webview build files
   * are created and inserted into the webview HTML.
   * @param webview - A reference to the extension webview
   * @param extensionUri - The URI of the directory containing the extension
   * @returns A template string literal containing the HTML that should be
   * rendered within the webview panel
   */
  private _getWebviewContent(webview: Webview, extensionUri: Uri): string {
    // The CSS file from the React build output
    const stylesUri = getUri(webview, extensionUri, ["webview-ui", "build", "assets", "index.css"]);
    // Codicon font file from the React build output
    const codiconFontUri = getUri(webview, extensionUri, ["webview-ui", "build", "assets", "codicon.ttf"]);
    // The JS file from the React build output
    const scriptUri = getUri(webview, extensionUri, ["webview-ui", "build", "assets", "index.js"]);

    const nonce = getNonce();

    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'nonce-${nonce}'; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
          <link rel="stylesheet" type="text/css" href="${stylesUri}">
          <title>Liquibase Configuration</title>
          <style nonce="${nonce}">
            @font-face {
              font-family: "codicon";
              font-display: block;
              src: url("${codiconFontUri}") format("truetype");
            }
          </style>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>
    `;
  }

  /**
   * Sets up an event listener to listen for messages passed from the webview context and
   * executes code based on the message that is received.
   *
   * @param webview - A reference to the extension webview
   */
  private _setWebviewMessageListener(webview: Webview): void {
    webview.onDidReceiveMessage(
      (message: unknown) => {
        // recreate a new object, because otherwise no methods will be there
        const messageData: MessageData = MessageData.clone(message as MessageData);

        const messageType: string = messageData.messageType;
        const data: LiquibaseConfigurationData | LoggingMessageWithLevel = messageData.data;

        if (data instanceof LiquibaseConfigurationData) {
          switch (messageType) {
            case MessageType.SAVE_CONNECTION:
              createLiquibaseProperties(data).catch((error) =>
                Logger.getLogger().error({ message: "Error saving the connection", error })
              );
              break;
            case MessageType.TEST_CONNECTION:
              testLiquibaseConnection(data).catch((error) =>
                Logger.getLogger().error({ message: "Error testing the connection", error })
              );
              break;
            case MessageType.CHOOSE_CHANGELOG:
              chooseFileForChangelog(data).catch((error) =>
                Logger.getLogger().error({ message: "Error choosing a changelog", error })
              );
              break;
            default:
              throw new Error(`Handling for command ${messageType} not found.`);
          }
        } else {
          if (messageData.messageType === MessageType.LOG_MESSAGE) {
            Logger.getLogger().log(data);
          } else {
            throw new Error(`Handling for command ${messageType} not found.`);
          }
        }
      },
      undefined,
      this._disposables
    );
  }
}
