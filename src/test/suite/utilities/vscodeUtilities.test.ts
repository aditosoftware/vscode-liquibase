import assert from "assert";
import * as fs from "fs";
import { TestUtils } from "../TestUtils";
import Sinon from "sinon";
import { Logger, LoggingMessage } from "@aditosoftware/vscode-logging";
import { openDocument } from "../../../utilities/vscodeUtilities";
import path from "path";
import * as vscode from "vscode";

/**
 * Tests the vscode utility methods.
 */
suite("vscodeUtilities", () => {
  let infoLog: Sinon.SinonStub;

  /**
   * Init the logger before the tests.
   */
  suiteSetup("init logger", () => {
    TestUtils.initLoggerForTests();
  });

  /**
   * Init the stubs before each tests.
   */
  setup("init stubs", () => {
    infoLog = Sinon.stub(Logger.getLogger(), "info");
  });

  /**
   * Restore all stubs after each test.
   */
  teardown("restore stubs", () => {
    Sinon.restore();
  });

  /**
   * Tests the method `openDocument`.
   */
  suite("openDocument", () => {
    /**
     * Tests that a document will be opened, if the path was valid.
     */
    test("should open Document with valid path", (done) => {
      const fileContent = "Lorem ipsum dolor sit amet";

      const folder = TestUtils.createTempFolderForTests("vscodeUtilities");
      const fileName = "myFile.txt";
      const file = path.join(folder, fileName);

      fs.writeFileSync(file, fileContent, "utf-8");

      openDocument(file)
        .then(() => {
          assertFileWasOpened(fileName, fileContent);

          done();
        })
        .catch(done);
    });

    /**
     * Tests that it will not open any document with an invalid path.
     */
    test("should not open Document with invalid path", (done) => {
      const invalidPath = "invalidPath";

      assert.ok(!fs.existsSync(invalidPath), "file does not exists");

      openDocument(invalidPath)
        .then(() => {
          Sinon.assert.calledWith(infoLog, {
            message: `File ${invalidPath} could not be opened, because it does not exist.`,
            notifyUser: true,
          } as LoggingMessage);

          done();
        })
        .catch(done);
    });
  });
});

/**
 * Tests that a file with the given name was opened.
 * 
 * @param fileName - the name of the file
 * @param fileContent - the expected content of the file
 */
export function assertFileWasOpened(fileName: string, fileContent: string): void {
  const text = vscode.window.visibleTextEditors
    .filter((pEditor) => pEditor.document.uri.fsPath.endsWith(fileName))
    .map((pEditor) => {
      return pEditor.document.getText();
    });
  // and check the content of the opened editor
  assert.strictEqual(text.length, 1, "one editor should be opened");
  assert.deepStrictEqual(text[0], fileContent, "one editor should be opened");
}