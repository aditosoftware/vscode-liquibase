import Sinon from "sinon";
import * as vscode from "vscode";
import {
  cache,
  deleteAll,
  generateDetailMessageForDeleteConfiguration,
  removeConfiguration,
  removeType,
  setting,
} from "../../../../settings/removeConfiguration";
import { TestUtils } from "../../TestUtils";
import { Logger, LoggingMessage } from "@aditosoftware/vscode-logging";
import { DialogValues, initializeLogger } from "@aditosoftware/vscode-input";
import path from "path";
import * as fs from "fs";
import * as handleLiquibaseSettings from "../../../../handleLiquibaseSettings";
import { setCacheHandler } from "../../../../extension";
import { CacheHandler } from "../../../../cache";
import assert from "assert";

/**
 * Tests the removing of the configuration.
 */
suite("removeConfiguration", () => {
  /**
   * All stubs for the tests.
   */
  let stubs: Stubs;

  /**
   * All path to dynamic created files for the tests.
   */
  let files: Files;

  /**
   * Inits a logger for the tests.
   */
  suiteSetup("create logger", () => {
    TestUtils.initLoggerForTests();
    initializeLogger(Logger.getLogger());
  });

  /**
   * Create some stubs before the test.
   * Also create some temporary files.
   */
  setup("create stubs and temporary files", () => {
    const loggerErrorStub = Sinon.stub(Logger.getLogger(), "error");
    const loggerInfoStub = Sinon.stub(Logger.getLogger(), "info");

    const quickPick = Sinon.stub(vscode.window, "showQuickPick");
    const confirmationDialog = Sinon.stub(vscode.window, "showInformationMessage");

    const getLiquibaseConfigurationPath = Sinon.stub(handleLiquibaseSettings, "getLiquibaseConfigurationPath");

    stubs = { loggerErrorStub, loggerInfoStub, quickPick, confirmationDialog, getLiquibaseConfigurationPath };

    const tempDir = TestUtils.createTempFolderForTests("removeConfiguration");

    const propertyFile = path.join(tempDir, "data.liquibase.properties");
    fs.writeFileSync(propertyFile, "# dummy content");

    const settingsFile = path.join(tempDir, "settings.json");
    fs.writeFileSync(settingsFile, JSON.stringify({ foo: propertyFile, bar: "baz" }));

    const cacheFile = path.join(tempDir, "cache.json");
    fs.writeFileSync(
      cacheFile,
      JSON.stringify({
        [propertyFile]: {
          contexts: ["a", "b"],
        },
        bar: {
          contexts: ["b", "a", "r"],
        },
      })
    );

    files = { tempDir, propertyFile, settingsFile, cacheFile };

    setCacheHandler(new CacheHandler(cacheFile));
  });

  /**
   * Restores all stubs
   */
  teardown("restore stubs", () => {
    Sinon.restore();
  });

  /**
   * Tests that an error during the selection will be correctly logged.
   */
  test("should work with error during selection", (done) => {
    // throw any error
    stubs.getLiquibaseConfigurationPath.throws("unit");

    removeConfiguration()
      .then(() => {
        Sinon.assert.calledOnce(stubs.loggerErrorStub);
        Sinon.assert.calledWith(stubs.loggerErrorStub, {
          message: "error handling multi step input",
          error: Sinon.match.any,
        } as LoggingMessage);

        done();
      })
      .catch(done);
  });

  /**
   * Tests that the deletion with the remove option `cache` works.
   */
  test("should delete cache", (done) => {
    const deletionMode = cache;

    assertDeletion(
      deletionMode,
      { existPropertyFile: true, settingsFileContent: { foo: files.propertyFile, bar: "baz" } },
      files,
      stubs,
      done
    );
  });

  /**
   * Tests that the deletion with the remove option `setting` works.
   */
  test("should delete setting", (done) => {
    const deletionMode = setting;

    assertDeletion(deletionMode, { existPropertyFile: true, settingsFileContent: { bar: "baz" } }, files, stubs, done);
  });

  /**
   * Tests that the deletion with the remove option `delete all` works.
   */
  test("should delete all", (done) => {
    const deletionMode = deleteAll;

    assertDeletion(deletionMode, { existPropertyFile: false, settingsFileContent: { bar: "baz" } }, files, stubs, done);
  });

  /**
   * Tests the generation of the detail message for delete config.
   */
  suite("generateDetailMessageForDeleteConfiguration", () => {
    /**
     * Tests various options how the message will be created.
     */
    [
      {
        expectedDetail: "",
        removeOption: undefined,
      },
      {
        expectedDetail: "",
        removeOption: "unknown option",
      },
      {
        expectedDetail: `- ${cache}`,
        removeOption: cache,
      },
      {
        expectedDetail: `- ${cache}
- ${setting}`,
        removeOption: setting,
      },
      {
        expectedDetail: `- ${cache}
- ${setting}
- ${deleteAll}`,
        removeOption: deleteAll,
      },
    ].forEach((pArgument) => {
      test(`should generate detail message for ${pArgument.removeOption}`, () => {
        const dialogValues = new DialogValues();
        if (pArgument.removeOption) {
          dialogValues.addValue(removeType, pArgument.removeOption);
        }

        assert.deepStrictEqual(
          `This will remove the configuration from the following:\n${pArgument.expectedDetail}`,
          generateDetailMessageForDeleteConfiguration(dialogValues)
        );
      });
    });
  });
});

/**
 * Asserts the deletion of the elements according to deletion mode.
 *
 * @param deletionMode - the deletion mode that should be selected
 * @param expected - the expected elements
 * @param files - the location to the temporary created files
 * @param stubs - the stubs  for the tests
 * @param done - mochas done to indicate the end of the test
 */
function assertDeletion(
  deletionMode: string,
  expected: {
    existPropertyFile: boolean;
    settingsFileContent: Record<string, string>;
  },
  files: Files,
  stubs: Stubs,
  done: Mocha.Done
): void {
  stubs.getLiquibaseConfigurationPath.resolves(files.tempDir);

  stubs.quickPick
    .onFirstCall()
    .resolves({
      label: "foo",
      detail: files.propertyFile,
    } as vscode.QuickPickItem)
    .onSecondCall()
    .resolves([
      {
        label: deletionMode,
      } as vscode.QuickPickItem,
    ]);
  stubs.confirmationDialog.resolves({ title: "Delete" });

  removeConfiguration()
    .then(() => {
      Sinon.assert.calledTwice(stubs.getLiquibaseConfigurationPath);
      Sinon.assert.calledOnce(stubs.loggerInfoStub);
      Sinon.assert.calledWith(stubs.loggerInfoStub, {
        message: `Configuration was successfully removed with the option "${deletionMode}".`,
        notifyUser: true,
      } as LoggingMessage);

      Sinon.assert.neverCalledWith(stubs.loggerErrorStub);

      assert.deepStrictEqual(
        {
          bar: {
            contexts: ["b", "a", "r"],
          },
        },
        JSON.parse(fs.readFileSync(files.cacheFile, "utf-8")),
        "cache file content"
      );

      assert.deepStrictEqual(
        expected.settingsFileContent,
        JSON.parse(fs.readFileSync(files.settingsFile, "utf-8")),
        "setting file content"
      );

      assert.deepStrictEqual(expected.existPropertyFile, fs.existsSync(files.propertyFile), "property file existing");

      done();
    })
    .catch(done);
}

/**
 * The various files needed for the tests.
 */
type Files = {
  /**
   * The temporary directory.
   */
  tempDir: string;

  /**
   * The liquibase properties file inside `tempDir`.
   */
  propertyFile: string;

  /**
   * The settings file inside `tempDir`.
   */
  settingsFile: string;

  /**
   * The cache file inside `tempDir`.
   */
  cacheFile: string;
};

/**
 * The various stubs needed for tests.
 */
type Stubs = {
  /**
   * The stub for `vscode.window.showQuickPick`.
   */
  quickPick: Sinon.SinonStub;

  /**
   * The stub for `vscode.window.showInformationMessage`.
   */
  confirmationDialog: Sinon.SinonStub;

  /**
   * The stub for `handleLiquibaseSettings.getLiquibaseConfigurationPath`.
   */
  getLiquibaseConfigurationPath: Sinon.SinonStub;

  /**
   * The stub for `Logger.getLogger().error`.
   */
  loggerErrorStub: Sinon.SinonStub;

  /**
   * The stub for `Logger.getLogger().info`.
   */
  loggerInfoStub: Sinon.SinonStub;
};
