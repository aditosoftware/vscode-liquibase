import { DialogValues } from "@aditosoftware/vscode-input";
import assert from "assert";
import { folderSelectionName } from "../../constants";
import {
  fileName,
  generateCommandLineArgs,
  openFileAfterCommandExecution,
  openIndexHtmlAfterCommandExecution,
} from "../../liquibaseCommandsUtilities";
import { assertFileWasOpened } from "./utilities/vscodeUtilities.test";
import path from "path";
import * as fs from "fs";
import * as vscode from "vscode";
import Sinon from "sinon";

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

    /**
     * Restore all stubs.
     */
    teardown("restore stubs", () => {
      Sinon.restore();
    });

    test("should open and sort correctly", (done) => {
      const dbDoc = path.join(workspaceFolder, "db-doc");

      const dialogValues = new DialogValues();
      dialogValues.addValue(folderSelectionName, dbDoc);

      const tables = path.join(dbDoc, "tables");
      const wrongColumns = path.join(dbDoc, "columns");

      // check before the test, that the wrong structure exist
      assert.ok(fs.existsSync(tables), `tables should exist: ${tables}`);
      assert.ok(fs.existsSync(wrongColumns), `wrong columns should exist before the test ${wrongColumns}`);

      openIndexHtmlAfterCommandExecution(dialogValues)
        .then(() => {
          const newColumns = fs.existsSync(path.join(tables, "columns"));

          assert.ok(fs.existsSync(tables), `tables should still exist:  ${tables}`);
          assert.ok(newColumns, `columns should have moved: ${newColumns}`);
          assert.ok(!fs.existsSync(wrongColumns), `wrong columns should no longer exist:  ${wrongColumns}`);

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
});
