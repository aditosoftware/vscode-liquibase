import assert from "assert";
import { prerequisites } from "../../prerequisites";
import { TestUtils } from "./TestUtils";
import * as vscode from "vscode";
import * as fs from "fs";

/**
 * Tests the file prerequisites.ts.
 */
suite("prerequisites", () => {
  const jars = [
    "commons-io-2.16.1.jar",
    "commons-lang3-3.14.0.jar",
    "gson-2.10.1.jar",
    "liquibase-core-4.28.0.jar",
    "mariadb-java-client-2.5.3.jar",
    "mssql-jdbc-12.2.0.jre11.jar",
    "mysql-connector-j-8.2.0.jar",
    "ojdbc11-23.2.0.0.jar",
    "opencsv-5.9.jar",
    "picocli-4.7.5.jar",
    "postgresql-42.6.0.jar",
    "snakeyaml-2.2.jar",
  ];

  let tempDir: string;

  /**
   * Inits the logger and the resources directory.
   */
  suiteSetup("init logger and temp dir", () => {
    TestUtils.initLoggerForTests();

    tempDir = TestUtils.createTempFolderForTests("resource");
  });

  /**
   * Tests that the prerequisites are handled correctly.
   */
  test("should correctly handle prerequisites", (done) => {
    const keyName = "liquibase-first-activation";

    // create dummy global state
    const globalState: vscode.Memento = {
      keys: () => {
        throw new Error("not needed for tests");
      },
      get: (key: string) => {
        assert.deepStrictEqual(keyName, key);

        // return false, to indicate we are in first activation
        return false;
      },
      update: async (key, value) => {
        assert.deepStrictEqual(keyName, key);
        assert.ok(value);
      },
    };

    //create dummy context
    const context: vscode.ExtensionContext = {
      globalState: globalState,
    } as vscode.ExtensionContext;

    prerequisites(context, tempDir)
      .then(() => {
        // because of no awaits, we wait 7 seconds in order to have everything downloaded
        new Promise((r) => setTimeout(r, 7_000))
          .then(() => {
            // check that the jars were downloaded correctly
            const files = fs.readdirSync(tempDir);
            assert.deepStrictEqual(jars, files);

            done();
          })
          .catch(done);
      })
      .catch(done);
  }).timeout(10_000);
});
