import path from "node:path";
import { TestUtils } from "../../TestUtils";
import assert from "node:assert";
import fs from "node:fs";
import {
  addToLiquibaseConfiguration,
  createLiquibaseProperties,
} from "../../../../configuration/handle/createAndAddConfiguration";
import * as handleLiquibaseSettings from "../../../../handleLiquibaseSettings";
import Sinon from "sinon";
import * as vscode from "vscode";
import { Logger, LoggingMessage } from "@aditosoftware/vscode-logging";
import { LiquibaseConfigurationData } from "../../../../configuration/data/LiquibaseConfigurationData";
import { assertFileWasOpened } from "../../utilities/vscodeUtilities.test";
import { setResourcePath } from "../../../../extension";
import { LiquibaseConfigurationPanel } from "../../../../panels/LiquibaseConfigurationPanel";
import chai from "chai";
import chaiFs from "chai-fs";

chai.use(chaiFs);

/**
 * Tests the creating of configurations.
 */
suite("create and add configuration", () => {
  let infoLog: Sinon.SinonStub;
  let errorLog: Sinon.SinonStub;

  let baseResourcePath: string;
  let getLiquibaseConfigurationPathStub: Sinon.SinonStub;

  /**
   * The path for all config files
   */
  let configPath: string;

  /**
   * Inits the logger for all tests.
   */
  suiteSetup("init logger", () => {
    TestUtils.initLoggerForTests();
  });

  /**
   * Set up the resource directory for the tests and the resource path.
   */
  setup("init resource directory and stubs", () => {
    baseResourcePath = TestUtils.createTempFolderForTests("configuration", "createAdd");

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
   * Tests the addition of elements to the configurations.
   */
  suite("add", () => {
    /**
     * Tests that trying to add something to a not existing path does not work.
     */
    test("should not add to not existing folder", (done) => {
      getLiquibaseConfigurationPathStub.resolves(undefined);

      addToLiquibaseConfiguration("lorem", "ipsum")
        .then(() => {
          chai.assert.notPathExists(configPath);

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

      chai.assert.notPathExists(configPath);

      addToLiquibaseConfiguration("lorem", "ipsum")
        .then(() => {
          chai.assert.pathExists(configPath);

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

      chai.assert.pathExists(configPath);

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

      chai.assert.pathExists(configPath);

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

      chai.assert.pathExists(configPath);

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

      chai.assert.pathExists(configPath);

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

  /**
   * Tests the creation of liquibase properties.
   */
  suite("createLiquibaseProperties", () => {
    let liquibaseConfigurationData: LiquibaseConfigurationData;

    setup("create data", () => {
      liquibaseConfigurationData = TestUtils.createDummyLiquibaseConfigurationData();
      liquibaseConfigurationData.name = "data";
      liquibaseConfigurationData.databaseConnection.username = "admin";
      liquibaseConfigurationData.databaseConnection.password = "secretPw";

      setResourcePath(path.join(baseResourcePath, "dummy"));

      // do nothing when transfer messages was called
      Sinon.stub(LiquibaseConfigurationPanel, "transferMessage").callsFake(function () {});
    });

    /**
     * Tests that it will not do anything when no config path was given
     */
    test("should not work with no config path", (done) => {
      getLiquibaseConfigurationPathStub.resolves(undefined);

      createLiquibaseProperties(liquibaseConfigurationData)
        .then(() => {
          assertLogging(infoLog, errorLog, { error: ["No configuration path was given. No configuration was saved"] });

          done();
        })
        .catch(done);
    });

    /**
     * Tests that the creation of a new liquibase properties file does work.
     */
    test(`should create liquibase properties`, (done) => {
      assertCreationOfLiquibaseProperties(
        baseResourcePath,
        liquibaseConfigurationData,
        configPath,
        infoLog,
        errorLog,
        done
      );
    });

    /**
     * Tests that the creation of liquibase properties files with a existing config with an name already saved will work when the override is allowed.
     */
    test(`should create liquibase properties with existing config and Yes to override`, (done) => {
      fs.writeFileSync(configPath, JSON.stringify({ data: "/path/to/old/data" }));

      Sinon.replace(vscode.window, "showWarningMessage", Sinon.fake.resolves("Yes"));

      assertCreationOfLiquibaseProperties(
        baseResourcePath,
        liquibaseConfigurationData,
        configPath,
        infoLog,
        errorLog,
        done
      );
    });

    /**
     * Tests that the creation of liquibase properties files with a existing config with an name already saved will not replace the existing config, when no was selected.
     */
    test(`should create liquibase properties with existing config and No to override`, (done) => {
      const oldSettingsContent = { data: "/path/to/old/data" };
      fs.writeFileSync(configPath, JSON.stringify(oldSettingsContent));

      Sinon.replace(vscode.window, "showWarningMessage", Sinon.fake.resolves("No"));

      createLiquibaseProperties(liquibaseConfigurationData)
        .then(() => {
          const liquibaseProperties = path.join(baseResourcePath, "data.liquibase.properties");

          chai.assert.notPathExists(liquibaseProperties);

          const settingsContent = fs.readFileSync(configPath, "utf-8");

          assert.deepStrictEqual(JSON.parse(settingsContent), oldSettingsContent);

          done();
        })
        .catch(done);
    });

    /**
     * Tests than an error log will be written, when the file could not be written.
     */
    test("should exit correctly when file could not be written", (done) => {
      Sinon.stub(fs, "writeFileSync").throws("unit test");

      createLiquibaseProperties(liquibaseConfigurationData)
        .then(() => {
          Sinon.assert.calledWith(errorLog, {
            message: "Error writing file",
            notifyUser: true,
            error: Sinon.match.any,
          } as LoggingMessage);

          done();
        })
        .catch(done);
    });
  });
});

/**
 * Asserts the creation of the liquibase properties.
 *
 * @param baseResourcePath - the base path of the resources
 * @param liquibaseConfigurationData - the liquibase data used for the creation of the properties
 * @param configPath - the config path of the settings
 * @param infoLog - the stub of the info log
 * @param errorLog - the stub of the error log
 * @param done - mochas done function to indicate that the test is over
 */
function assertCreationOfLiquibaseProperties(
  baseResourcePath: string,
  liquibaseConfigurationData: LiquibaseConfigurationData,
  configPath: string,
  infoLog: Sinon.SinonStub,
  errorLog: Sinon.SinonStub,
  done: Mocha.Done
): void {
  createLiquibaseProperties(liquibaseConfigurationData)
    .then(() => {
      const expectedFileContent = `
# configuration for the database
username = admin
password = secretPw
driver = org.mariadb.jdbc.Driver`;

      //  find opened editors
      assertFileWasOpened("data.liquibase.properties", expectedFileContent);

      const liquibaseProperties = path.join(baseResourcePath, "data.liquibase.properties");

      chai.assert.pathExists(liquibaseProperties);

      const settingsContent = fs.readFileSync(configPath, "utf-8");

      const propertiesContent = fs.readFileSync(liquibaseProperties, "utf-8");

      assert.deepStrictEqual(JSON.parse(settingsContent), { data: liquibaseProperties }, "settings content");
      assert.deepStrictEqual(propertiesContent, expectedFileContent, "properties content");

      assertLogging(infoLog, errorLog, { info: ["Configuration for data was successfully saved."] });

      done();
    })
    .catch(done);
}

/**
 * Asserts the logging.
 *
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
): void {
  Sinon.assert.callCount(infoLog, messages.info?.length ?? 0);
  Sinon.assert.callCount(errorLog, messages.error?.length ?? 0);

  if (messages.info) {
    for (const infoMessage of messages.info) {
      Sinon.assert.calledWith(infoLog, { message: infoMessage, notifyUser: true } as LoggingMessage);
    }
  }

  if (messages.error) {
    for (const errorMessage of messages.error) {
      Sinon.assert.calledWith(errorLog, {
        message: errorMessage,
        notifyUser: true,
      } as LoggingMessage);
    }
  }
}
