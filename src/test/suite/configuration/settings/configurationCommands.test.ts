import assert from "assert";
import { randomUUID } from "crypto";
import { TestUtils } from "../../TestUtils";
import path from "path";
import {
  addExistingLiquibaseConfiguration,
  editExistingLiquibaseConfiguration,
} from "../../../../settings/configurationCommands";
import * as vscode from "vscode";
import * as fs from "fs";
import { LiquibaseConfigurationPanel } from "../../../../panels/LiquibaseConfigurationPanel";
import * as readConfiguration from "../../../../configuration/handle/readConfiguration";
import Sinon from "sinon";
import { ConnectionType } from "../../../../input/ConnectionType";
import * as createAndAddConfiguration from "../../../../configuration/handle/createAndAddConfiguration";
import * as handleLiquibaseFolder from "../../../../handleLiquibaseSettings";

/**
 * Tests the file `configurationCommands.ts`.
 */
suite("configurationCommands", () => {
  let tempPath: string;
  let fileName: string;

  let extensionContext: vscode.ExtensionContext;

  /**
   * Creates a temp dir before all tests.
   */
  suiteSetup("create temp dir", () => {
    TestUtils.initLoggerForTests();

    tempPath = TestUtils.createTempFolderForTests("configurationCommands");

    extensionContext = {
      extensionUri: vscode.Uri.file(tempPath),
    } as vscode.ExtensionContext;
  });

  /**
   * Creates a temp file with a random name before each test.
   */
  setup("create temp file name", () => {
    fileName = path.join(tempPath, `${randomUUID()}.liquibase.properties`);
    fs.writeFileSync(fileName, "", "utf-8");
  });

  /**
   * Restore all stubs after all tests.
   */
  teardown("restore stubs", () => {
    Sinon.restore();
  });

  /**
   * Tests the editing of an existing configuration.
   */
  suite("editExistingLiquibaseConfiguration", () => {
    /**
     * Tests the editing of an normal file with the name `<<prefix>>.liquibase.properties`.
     */
    test("should edit with uri and normal file name", (done) => {
      const uri = vscode.Uri.file(fileName);
      assertEditExistingLiquibaseConfiguration(extensionContext, uri, done);
    });

    /**
     * Tests the editing of an file with the shorter name name `liquibase.properties`.
     */
    test("should edit with uri and short file name", (done) => {
      const shortName = path.join(tempPath, "liquibase.properties");
      const uri = vscode.Uri.file(shortName);
      assertEditExistingLiquibaseConfiguration(extensionContext, uri, done);
    });

    /**
     * Tests that editing without an uri, but with some configurations works.
     */
    test("should edit without uri", (done) => {
      Sinon.stub(readConfiguration, "readLiquibaseConfigurationNames").resolves(["foo", "bar"]);
      Sinon.stub(readConfiguration, "getPathOfConfiguration").resolves("anyElement");

      Sinon.replace(vscode.window, "showQuickPick", Sinon.fake.resolves("foo"));

      assertEditExistingLiquibaseConfiguration(extensionContext, undefined, done);
    });

    /**
     * Tests that editing without an uri and without any configuration works.
     */
    test("should edit without uri and no existing configs", (done) => {
      Sinon.stub(handleLiquibaseFolder, "getLiquibaseFolder").returns("myFolder");
      Sinon.stub(handleLiquibaseFolder, "getLiquibaseConfigurationPath").resolves("myFolder");
      Sinon.stub(ConnectionType, "suggestCreationOfConfiguration").resolves();

      assert.ok(!LiquibaseConfigurationPanel.currentPanel, "no current panel created");

      editExistingLiquibaseConfiguration(undefined, extensionContext)
        .then(() => {
          const currentPanel = LiquibaseConfigurationPanel.currentPanel;
          assert.ok(!currentPanel, "panel is not created");

          done();
        })
        .catch(done)
        .finally(() => {
          // dispose manually after the tests
          LiquibaseConfigurationPanel.currentPanel?.dispose();
        });
    });
  });

  /**
   * Tests the adding of an existing configuration
   */
  suite("addExistingLiquibaseConfiguration", () => {
    /**
     * Tests the adding of an existing liquibase configuration.
     */
    test("should add", (done) => {
      const addToLiquibaseConfigurationStub = Sinon.stub(
        createAndAddConfiguration,
        "addToLiquibaseConfiguration"
      ).resolves();

      const inputBox = Sinon.stub(vscode.window, "showInputBox").resolves("foo");
      const openDialog = Sinon.stub(vscode.window, "showOpenDialog").resolves([vscode.Uri.file("bar")]);

      addExistingLiquibaseConfiguration()
        .then(() => {
          Sinon.assert.calledOnce(addToLiquibaseConfigurationStub);
          Sinon.assert.calledWith(addToLiquibaseConfigurationStub, "foo", Sinon.match("bar"));

          Sinon.assert.calledOnce(inputBox);
          Sinon.assert.calledOnce(openDialog);
          Sinon.assert.calledWith(openDialog, {
            title: "Location of your existing liquibase.properties file (Step 2 of 2)",
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
              "Liquibase Properties": ["properties"],
            },
          } as vscode.OpenDialogOptions);

          done();
        })
        .catch(done);
    });
  });
});

/**
 * Tests the method `editExistingLiquibaseConfiguration` and validates that a webview was created.
 *
 * @param extensionContext - the extension context that should be passed to the method
 * @param uri - the uri that should be passed to the method. This can be also `undefined`, if no uri was passed.
 * @param done - mochas done to signal the end of the tests
 */
function assertEditExistingLiquibaseConfiguration(
  extensionContext: vscode.ExtensionContext,
  uri: vscode.Uri | undefined,
  done: Mocha.Done
): void {
  Sinon.stub(handleLiquibaseFolder, "getLiquibaseFolder").returns("myFolder");

  assert.ok(!LiquibaseConfigurationPanel.currentPanel, "no current panel created");

  editExistingLiquibaseConfiguration(uri, extensionContext)
    .then(() => {
      const currentPanel = LiquibaseConfigurationPanel.currentPanel;
      assert.ok(currentPanel, "panel was created");
      const webviewPanel = currentPanel["_panel"];
      assert.ok(webviewPanel.visible, "panel is visible");

      // test that a second call to show the panel still works
      if (uri) {
        LiquibaseConfigurationPanel.render(uri);

        assert.ok(LiquibaseConfigurationPanel.currentPanel?.["_panel"], "panel is still visible");
      }

      done();
    })
    .catch(done)
    .finally(() => {
      // dispose manually after the tests
      LiquibaseConfigurationPanel.currentPanel?.dispose();
    });
}
