import { DialogValues } from "@aditosoftware/vscode-input";
import assert from "node:assert";
import { folderSelectionName } from "../../constants";
import {
  changeAndEmptyOutputDirectory,
  fileName,
  generateCommandLineArgs,
  openFileAfterCommandExecution,
  openIndexHtmlAfterCommandExecution,
} from "../../liquibaseCommandsUtilities";
import { assertFileWasOpened } from "./utilities/vscodeUtilities.test";
import path from "node:path";
import * as vscode from "vscode";
import Sinon from "sinon";
import chai from "chai";
import chaiFs from "chai-fs";
import * as os from "node:os";
import { PROPERTY_FILE } from "../../input/ConnectionType";
import * as configurationReading from "../../configuration/handle/readConfiguration";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs";

chai.use(chaiFs);

/**
 * Tests the liquibaseCommandsUtilities.
 */
suite("liquibaseCommandsUtilities", () => {
  const workspaceFolder = path.join(__dirname, "..", "..", "temp", "workspace");
  const folderPath = path.join(workspaceFolder, "myFolder");
  const myFileName = "liquibaseCommandsUtilities.txt";

  const dialogValues = new DialogValues();

  suiteSetup("create dialog values", () => {
    dialogValues.addValue(folderSelectionName, folderPath);
    dialogValues.addValue(fileName, myFileName);
  });

  /**
   * Restore all stubs.
   */
  teardown("restore stubs", () => {
    Sinon.restore();
  });

  /**
   * Tests the method `generateCommandLineArgs`.
   */
  suite("generateCommandLineArgs", () => {
    /**
     * Tests that the args will be generated correctly.
     */
    test("should generate args correctly", () => {
      const actual = generateCommandLineArgs("myArg", dialogValues);

      assert.ok(actual);
      assert.deepStrictEqual([`--myArg=${path.join(folderPath, myFileName)}`], actual);
    });

    /**
     * Tests that nothing should be generated when empty dialog values were given.
     */
    test("should generate nothing when empty dialog values", () => {
      assert.ok(!generateCommandLineArgs("myArgs", new DialogValues()));
    });
  });

  /**
   * Tests the method `openFileAfterCommandExecution`.
   */
  suite("openFileAfterCommandExecution", () => {
    test("should check file was opened", (done) => {
      openFileAfterCommandExecution(dialogValues)
        .then(() => {
          assertFileWasOpened(myFileName, "Hello World.");

          done();
        })
        .catch(done);
    });
  });

  /**
   * Tests the method `openIndexHtmlAfterCommandExecution`.
   */
  suite("openIndexHtmlAfterCommandExecution", () => {
    let openExternal: Sinon.SinonStub;

    /**
     * Creates the stubs for the tests.
     */
    setup("create stubs", () => {
      openExternal = Sinon.stub(vscode.env, "openExternal");
    });

    test("should open and sort correctly", (done) => {
      const dbDoc = path.join(workspaceFolder, "db-doc");

      const dialogValues = new DialogValues();
      dialogValues.addValue(folderSelectionName, dbDoc);

      const tables = path.join(dbDoc, "tables");
      const wrongColumns = path.join(dbDoc, "columns");

      // check before the test, that the wrong structure exist
      chai.assert.pathExists(tables, "tables");
      chai.assert.pathExists(wrongColumns, "wrong columns");

      openIndexHtmlAfterCommandExecution(dialogValues)
        .then(() => {
          const newColumns = path.join(tables, "columns");

          chai.assert.pathExists(tables, "tables after move");
          chai.assert.pathExists(newColumns, "new columns");
          chai.assert.notPathExists(wrongColumns, "wrong columns should no longer exist");

          Sinon.assert.calledOnce(openExternal);
          Sinon.assert.calledWith(openExternal, vscode.Uri.file(path.join(dbDoc, "index.html")));

          done();
        })
        .catch(done);
    });

    /**
     * Tests that nothing will be opened if no dialog values were given.
     */
    test("should not open anything when no dialog values given", (done) => {
      openIndexHtmlAfterCommandExecution(new DialogValues())
        .then(() => {
          Sinon.assert.neverCalledWith(openExternal);

          done();
        })
        .catch(done);
    });
  });

  /**
   * Tests the method `changeAndEmptyOutputDirectory`.
   */
  suite("changeAndEmptyOutputDirectory", () => {
    /**
     * Tests that nothing will be done, when no folder was given in the dialog values
     */
    test("should do nothing when no folder given", async () => {
      await assertChangeAndEmptyOutputDirectory(new DialogValues(), new Map());
    });

    /**
     * Tests that nothing will change when the folder selection has no folder with a temp dir given.
     */
    test("should do nothing when no folder within the temp dir is given", async () => {
      const dialogValues = new DialogValues();
      dialogValues.addValue(folderSelectionName, "/path/to/my/folder");

      await assertChangeAndEmptyOutputDirectory(dialogValues, dialogValues.inputValues);
    });

    /**
     * Tests that a missing properties file configuration will use the default name `db-doc`.
     */
    test("should work without properties file", async () => {
      const folderSelection = path.join(os.tmpdir(), "foo");

      const dialogValues = new DialogValues();
      dialogValues.addValue(folderSelectionName, folderSelection);

      await assertChangeAndEmptyOutputDirectory(
        dialogValues,
        new Map([[folderSelectionName, [path.join(folderSelection, "db-doc")]]])
      );
    });

    /**
     * Tests that the folder selection change will work normally with a not existing folder.
     */
    test("should work with not before existing folder", async () => {
      const folderSelection = path.join(os.tmpdir(), "foo");

      const dialogValues = new DialogValues();
      dialogValues.addValue(PROPERTY_FILE, "bar");
      dialogValues.addValue(folderSelectionName, folderSelection);

      Sinon.stub(configurationReading, "getNameOfConfiguration").resolves("baz");

      await assertChangeAndEmptyOutputDirectory(
        dialogValues,
        new Map([
          [PROPERTY_FILE, ["bar"]],
          [folderSelectionName, [path.join(folderSelection, "baz")]],
        ])
      );
    });

    /**
     * Tests that the folder selection change will work with an existing folder.
     * This folder should be deleted.
     */
    test("should work with existing folder", async () => {
      const folderSelection = path.join(os.tmpdir(), randomUUID());

      const expectedPath = path.join(folderSelection, "baz");

      fs.mkdirSync(expectedPath, { recursive: true });
      fs.writeFileSync(path.join(expectedPath, "myFile.txt"), "");

      const dialogValues = new DialogValues();
      dialogValues.addValue(PROPERTY_FILE, "bar");
      dialogValues.addValue(folderSelectionName, folderSelection);

      Sinon.stub(configurationReading, "getNameOfConfiguration").resolves("baz");

      await assertChangeAndEmptyOutputDirectory(
        dialogValues,
        new Map([
          [PROPERTY_FILE, ["bar"]],
          [folderSelectionName, [expectedPath]],
        ])
      );

      chai.assert.notPathExists(expectedPath);
    });
  });
});

/**
 * Checks that the method `changeAndEmptyOutputDirectory` will transform the dialog values as expected.
 *
 * @param dialogValues - the dialog values that should be passed to the method
 * @param expected - the expected inputValues of the dialogValues
 */
async function assertChangeAndEmptyOutputDirectory(
  dialogValues: DialogValues,
  expected: Map<string, string[]>
): Promise<void> {
  await changeAndEmptyOutputDirectory(dialogValues);

  assert.deepStrictEqual(dialogValues.inputValues, expected);
}
