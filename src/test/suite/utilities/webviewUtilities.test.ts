import assert from "assert";
import { getNonce, getUri } from "../../../utilities/webviewUtilities";
import * as vscode from "vscode";
import path from "path";

/**
 * Tests the webview utilities.
 */
suite("webviewUtilities", () => {
  /**
   * Tests the url function.
   */
  suite("getUri", () => {
    /**
     * Tests that an correct uri is returned.
     */
    test("should get uri", () => {
      const uri = vscode.Uri.file("/my/uri");

      const webviewPanel = vscode.window.createWebviewPanel("test", "test", vscode.ViewColumn.One);
      const webview = webviewPanel.webview;

      const actual = getUri(webview, uri, ["lorem", "ipsum"]);

      assert.strictEqual(path.normalize(actual.fsPath), path.normalize("/my/uri/lorem/ipsum"));
    });
  });

  /**
   * Tests the nonce function.
   */
  suite("getNonce", () => {
    /**
     * Tests that a valid nonce will be created.
     */
    test("should get nonce", () => {
      const actual = getNonce();

      assert.strictEqual(actual.length, 32);
      assert.match(actual, /^[a-zA-Z0-9]+$/);
    });
  });
});
