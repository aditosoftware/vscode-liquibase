import Sinon from "sinon";
import { convertFormats } from "../../convertFormats";
import { TestUtils } from "./TestUtils";
import * as vscode from "vscode";
import path from "path";
import assert from "assert";
import * as fs from "fs";
import chai from "chai";
import chaiFs from "chai-fs";

chai.use(chaiFs);

/**
 * Tests the converting from one format to another format.
 */
suite("convert format", () => {
  const tempFolder = TestUtils.createTempFolderForTests();

  const workspacePath = path.join(__dirname, "..", "..", "temp", "workspace");
  const liquibaseFolder = path.join(workspacePath, ".liquibase");
  const changelogFile = path.join(liquibaseFolder, "changelog.xml");

  suiteSetup(() => {
    TestUtils.init();
  });

  teardown(() => {
    Sinon.restore();
  });

  /**
   * The arguments for the converting test.
   */
  type TestArgument = {
    /**
     * The format to which the changelog should be converted.
     */
    format: string;
    /**
     * The location to the changelog.
     * If it is a `vscode.Uri`, then it is from the RMB.
     */
    changelogLocation: string | vscode.Uri;
    /**
     * If a file selection should be possible
     */
    fileSelection: boolean;
  };

  const testArguments: TestArgument[] = [
    // file selection
    {
      format: "SQL",
      changelogLocation: changelogFile,
      fileSelection: true,
    },
    {
      format: "YAML",
      changelogLocation: changelogFile,
      fileSelection: true,
    },
    {
      format: "XML",
      changelogLocation: changelogFile,
      fileSelection: true,
    },
    {
      format: "JSON",
      changelogLocation: changelogFile,
      fileSelection: true,
    },

    // folder selections
    {
      format: "SQL",
      changelogLocation: liquibaseFolder,
      fileSelection: false,
    },
    {
      format: "YAML",
      changelogLocation: liquibaseFolder,
      fileSelection: false,
    },
    {
      format: "XML",
      changelogLocation: liquibaseFolder,
      fileSelection: false,
    },
    {
      format: "JSON",
      changelogLocation: liquibaseFolder,
      fileSelection: false,
    },

    // RMB selections
    {
      format: "SQL",
      changelogLocation: vscode.Uri.file(changelogFile),
      fileSelection: true,
    },
    {
      format: "YAML",
      changelogLocation: vscode.Uri.file(changelogFile),
      fileSelection: true,
    },
    {
      format: "XML",
      changelogLocation: vscode.Uri.file(changelogFile),
      fileSelection: true,
    },
    {
      format: "JSON",
      changelogLocation: vscode.Uri.file(changelogFile),
      fileSelection: true,
    },
  ];

  testArguments.forEach((pArgument) => {
    /**
     * Tests the converting of the given argument to a new format.
     */
    test(`should transform ${pArgument.format} with ${pArgument.fileSelection ? "file" : "folder"} ${
      pArgument.changelogLocation
    }  ${typeof pArgument.changelogLocation !== "string" ? "selected from rmb" : ""}`, async function () {
      this.timeout(8000);

      const infoMessage = TestUtils.createInfoMessageStubWithSelection();

      await assertConverting(
        () =>
          convertFormats(
            pArgument.fileSelection,
            typeof pArgument.changelogLocation !== "string" ? pArgument.changelogLocation : undefined
          ),
        tempFolder,
        pArgument.format,
        pArgument.changelogLocation
      );

      Sinon.assert.calledOnce(infoMessage);
      Sinon.assert.calledWith(
        infoMessage,
        `Converting the changelogs to ${pArgument.format} was executed successfully. Please check the files for correctness.`
      );
    });
  });

  /**
   * Tests that the user receives a warn message, when a file could not be converted.
   */
  test("should give warn message when one file could not be converted", async () => {
    const emptyFile = path.join(tempFolder, "empty.xml");
    fs.writeFileSync(emptyFile, "");
    chai.assert.pathExists(emptyFile);

    const warnMessage = Sinon.spy(vscode.window, "showWarningMessage");

    await assertConverting(() => convertFormats(true), tempFolder, "YAML", emptyFile);

    Sinon.assert.calledOnce(warnMessage);
    Sinon.assert.calledWith(
      warnMessage,
      "Converting the changelogs was partly successful. Please check files and the error log."
    );
  });

  /**
   * Tests that a not existing file does lead to a rejected promise.
   */
  test("should handle calling with not existing file", async () => {
    const invalidFile = path.join(tempFolder, "invalid.xml");
    chai.assert.notPathExists(invalidFile);

    await assert.rejects(assertConverting(() => convertFormats(true), tempFolder, "YAML", invalidFile));
  });
});

/**
 * Asserts the converting calls.
 *
 * @param call - the call for `convertFormat`, that should be done
 * @param tempFolder - the temp folder were the output should be written
 * @param format - the format to which it should be converted
 * @param changelogLocation - the changelog that should be converted.
 * This can be a folder or a file as string (when selected in OpenDialog)
 * or a vscode.URI (when selected in RMB)
 */
async function assertConverting(
  call: () => Promise<void>,
  tempFolder: string,
  format: string,
  changelogLocation: string | vscode.Uri
): Promise<void> {
  // create a real quick pick for afterwards
  const realQuickPick = vscode.window.createQuickPick();
  // create a real input for afterwards
  const realInput = vscode.window.createInputBox();

  const openDialog = Sinon.stub(vscode.window, "showOpenDialog");

  const changelogFromDialog = typeof changelogLocation === "string";
  if (changelogFromDialog) {
    openDialog.onFirstCall().resolves([vscode.Uri.file(changelogLocation)]);
  }
  openDialog.onCall(changelogFromDialog ? 1 : 0).resolves([vscode.Uri.file(tempFolder)]);

  const inputBox = Sinon.stub(vscode.window, "createInputBox");
  const copyInputBox = Object.create(realInput);
  copyInputBox.onDidAccept = (callback: () => void) => {
    copyInputBox.value = "mariadb";
    callback();
    return {
      dispose: () => {},
    } as vscode.Disposable;
  };
  const inputBoxWithAccept = copyInputBox as vscode.InputBox;

  inputBox.onFirstCall().returns(inputBoxWithAccept);

  const quickPick = Sinon.stub(vscode.window, "createQuickPick");

  const copyElementWithAccept = Object.create(realQuickPick);
  copyElementWithAccept.onDidAccept = (callback: () => void) => {
    callback();
    return {
      dispose: () => {},
    } as vscode.Disposable;
  };
  // and transforms this any element back to an vscode.QuickPick, so it can be returned by createQuickPick
  const quickPickWithAccept = copyElementWithAccept as vscode.QuickPick<vscode.QuickPickItem>;

  // and select the new format
  Sinon.stub(quickPickWithAccept, "selectedItems").get(() => {
    return [{ label: format, picked: true }] as vscode.QuickPickItem[];
  });

  quickPick.onFirstCall().returns(quickPickWithAccept);

  await call();

  Sinon.assert.callCount(openDialog, changelogFromDialog ? 2 : 1);
  Sinon.assert.calledOnce(quickPick);
  Sinon.assert.callCount(inputBox, format === "SQL" ? 1 : 0);
}
