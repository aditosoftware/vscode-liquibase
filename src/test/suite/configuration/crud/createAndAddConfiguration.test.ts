import path from "path";
import { TestUtils } from "../../TestUtils";
import assert from "assert";
import fs from "fs";
import { addToLiquibaseConfiguration } from "../../../../configuration/crud/createAndAddConfiguration";
import * as handleLiquibaseSettings from "../../../../handleLiquibaseSettings";
import Sinon from "sinon";
import * as vscode from "vscode";
import { Logger } from "@aditosoftware/vscode-logging";

/**
 * Tests the creating of configurations.
 */
suite("create and add configuration", () => {
  /**
   * Inits the logger for all tests.
   */
  suiteSetup("init logger", () => {
    TestUtils.initLoggerForTests();
  });

  /**
   * Tests the addition of elements to the configurations.
   */
  suite("add", () => {
    let baseResourcePath: string;
    let getLiquibaseConfigurationPathStub: Sinon.SinonStub;

    let infoLog: Sinon.SinonStub;
    let errorLog: Sinon.SinonStub;

    /**
     * The path for all config files
     */
    let configPath: string;

    /**
     * Set up the resource directory for the tests and the resource path.
     */
    setup("init resource directory and stubs", () => {
      baseResourcePath = TestUtils.createTempFolderForTests("configuration", "add");

      configPath = path.join(baseResourcePath, "settings.json");

      getLiquibaseConfigurationPathStub = Sinon.stub(handleLiquibaseSettings, "getLiquibaseConfigurationPath").resolves(
        baseResourcePath
      );

      infoLog = Sinon.stub(Logger.getLogger(), "info");
      errorLog = Sinon.stub(Logger.getLogger(), "error");
    });

    /**
     * Restore all stubs.
     */
    teardown("restore stubs", () => {
      Sinon.restore();
    });

    /**
     * Tests that trying to add something to a not existing path does not work.
     */
    test("should not add to not existing folder", (done) => {
      getLiquibaseConfigurationPathStub.resolves(undefined);

      addToLiquibaseConfiguration("lorem", "ipsum")
        .then(() => {
          assert.ok(!fs.existsSync(configPath), `config ${configPath} should still not exist`);

          assertLogging(infoLog, errorLog, {
            error: [
              "No configuration path found for the liquibase specific configuration. Please configure it in the settings",
              "Configuration for lorem could not be saved",
            ],
          });

          done();
        })
        .catch(done);
    });

    /**
     * Tests that trying to add a new element to a not existing configuration does work.
     */
    test("should add to not existing configuration", (done) => {
      if (fs.existsSync(configPath)) {
        fs.rmSync(configPath);
      }

      assert.ok(!fs.existsSync(configPath));

      addToLiquibaseConfiguration("lorem", "ipsum")
        .then(() => {
          assert.ok(fs.existsSync(configPath), `config ${configPath} should now exist`);

          const result = JSON.parse(fs.readFileSync(configPath, { encoding: "utf-8" }));

          assert.deepStrictEqual({ lorem: "ipsum" }, result);

          assertLogging(infoLog, errorLog, { info: ["Configuration for lorem was successfully saved."] });

          done();
        })
        .catch(done);
    });

    /**
     * Tests that the adding of a new element to a existing (but empty) configuration file works.
     */
    test("should add to existing configuration", (done) => {
      fs.writeFileSync(configPath, "{}");

      assert.ok(fs.existsSync(configPath));

      addToLiquibaseConfiguration("newElement", "/my/path/to/somewhere")
        .then(() => {
          const result = JSON.parse(fs.readFileSync(configPath, { encoding: "utf-8" }));

          assert.deepStrictEqual({ newElement: "/my/path/to/somewhere" }, result);

          assertLogging(infoLog, errorLog, { info: ["Configuration for newElement was successfully saved."] });

          done();
        })
        .catch(done);
    });

    /**
     * Tests that adding an element with an existing element and check for existing key works.
     */
    test("should add existing key (check for existing to false)", (done) => {
      fs.writeFileSync(configPath, JSON.stringify({ key: "value" }));

      const warnMessage = Sinon.replace(vscode.window, "showWarningMessage", Sinon.fake.resolves("No"));

      assert.ok(fs.existsSync(configPath));

      addToLiquibaseConfiguration("key", "newValue", true)
        .then(() => {
          const result = JSON.parse(fs.readFileSync(configPath, { encoding: "utf-8" }));

          assert.deepStrictEqual({ key: "value" }, result);

          assertLogging(infoLog, errorLog, {
            info: ["Configuration for key was successfully saved.", "Saving cancelled"],
          });

          Sinon.assert.calledOnce(warnMessage);

          done();
        })
        .catch(done);
    });

    /**
     * Tests that adding an element with an existing element and check for existing key works.
     */
    test("should add existing key (check for existing to true)", (done) => {
      fs.writeFileSync(configPath, JSON.stringify({ key: "value" }));

      const warnMessage = Sinon.replace(vscode.window, "showWarningMessage", Sinon.fake.resolves("Yes"));

      assert.ok(fs.existsSync(configPath));

      addToLiquibaseConfiguration("key", "newValue", true)
        .then(() => {
          const result = JSON.parse(fs.readFileSync(configPath, { encoding: "utf-8" }));

          assert.deepStrictEqual({ key: "newValue" }, result);

          assertLogging(infoLog, errorLog, { info: ["Configuration for key was successfully saved."] });

          Sinon.assert.calledOnce(warnMessage);

          done();
        })
        .catch(done);
    });

    /**
     * Tests that adding an element with an existing element and no check for existing key works.
     */
    test("should add existing key (do not check for existing)", (done) => {
      fs.writeFileSync(configPath, JSON.stringify({ key: "value" }));

      assert.ok(fs.existsSync(configPath));

      addToLiquibaseConfiguration("key", "newValue", false)
        .then(() => {
          const result = JSON.parse(fs.readFileSync(configPath, { encoding: "utf-8" }));

          assert.deepStrictEqual({ key: "newValue" }, result);

          assertLogging(infoLog, errorLog, { info: ["Configuration for key was successfully saved."] });

          done();
        })
        .catch(done);
    });
  });
});

/**
 * Asserts the logging.
 * //  TODO allgemeiner?
 * @param infoLog - the stub for info messages
 * @param errorLog - the stub for error messages
 * @param messages - the messages that should be checked if called
 */
function assertLogging(
  infoLog: Sinon.SinonStub,
  errorLog: Sinon.SinonStub,
  messages: {
    info?: string[];
    error?: string[];
  }
) {
  Sinon.assert.callCount(infoLog, messages.info?.length ?? 0);
  Sinon.assert.callCount(errorLog, messages.error?.length ?? 0);

  if (messages.info) {
    messages.info.forEach((infoMessage) =>
      Sinon.assert.calledWith(infoLog, { message: infoMessage, notifyUser: true })
    );
  }

  if (messages.error) {
    messages.error.forEach((errorMessage) =>
      Sinon.assert.calledWith(errorLog, { message: errorMessage, notifyUser: true })
    );
  }
}
