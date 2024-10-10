import type { WebviewApi } from "vscode-webview";
import { MessageData } from "../../../src/configuration/transfer";

/**
 * A utility wrapper around the acquireVsCodeApi() function, which enables
 * message passing and state management between the webview and extension
 * contexts.
 *
 * This utility also enables webview code to be run in a web browser-based
 * dev server by using native web browser features that mock the functionality
 * enabled by acquireVsCodeApi.
 */
class VSCodeAPIWrapper {
  private readonly vsCodeApi: WebviewApi<unknown> | undefined;

  /**
   * Constructor.
   */
  constructor() {
    // Check if the acquireVsCodeApi function exists in the current development
    // context (i.e. VS Code development window or web browser)
    if (typeof acquireVsCodeApi === "function") {
      this.vsCodeApi = acquireVsCodeApi();
    }
  }

  /**
   * Post a message (i.e. send arbitrary data) to the owner of the webview.
   *
   * @remarks When running webview code inside a web browser, postMessage will instead
   * log the given message to the console.
   * @param message - Arbitrary data (must be JSON serializable) to send to the extension context.
   */
  public postMessage(message: MessageData): void {
    if (this.vsCodeApi) {
      this.vsCodeApi.postMessage(message);
    } else {
      console.log(message);
    }
  }

  /**
   * Adds an listener to the incoming message. When a correct message comes,
   * it will be parsed to MessageData and be handled by the given function.
   *
   * @param handleMessageData - the function to handle the message data
   */
  public addMessageListener(handleMessageData: (pMessageData: MessageData) => void): void {
    window.addEventListener("message", (event) => {
      if (event.origin.startsWith("vscode-webview://")) {
        const messageData = MessageData.clone(event.data);

        handleMessageData(messageData);
      } else {
        console.error(`unknown message origin ${event.origin}: message will not be parsed`);
      }
    });
  }
}

// Exports class singleton to prevent multiple invocations of acquireVsCodeApi.
export const vscodeApiWrapper = new VSCodeAPIWrapper();
