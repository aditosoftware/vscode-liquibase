import path from "path";
import { TestUtils } from "../../TestUtils";
import assert from "assert";
import fs from "fs";
import { addToLiquibaseConfiguration } from "../../../../configuration/crud/createAndAddConfiguration";

import * as handleLiquibaseSettings from "../../../../handleLiquibaseSettings";
import Sinon from "sinon";

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
    });

    /**
     * Restore all stubs.
     */
    teardown("restore stubs", () => {
      getLiquibaseConfigurationPathStub.restore();
    });

    /**
     * Tests that trying to add something to a not existing path does not work.
     */
    test("should not add to not existing folder", (done) => {
      const notExistingPath = path.join(baseResourcePath, "notExisting");

      // TODO funktioniert noch nicht

      getLiquibaseConfigurationPathStub.resolves(notExistingPath);

      assert.ok(!fs.existsSync(notExistingPath));

      addToLiquibaseConfiguration("lorem", "ipsum")
        .then(() => {
          assert.ok(!fs.existsSync(notExistingPath), `config ${notExistingPath} should still not exist`);

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

          done();
        })
        .catch(done);
    });

    /**
     * Tests that adding an element with an existing element and check for existing key works.
     */
    test("should add existing key (check for existing)", (done) => {
      fs.writeFileSync(configPath, JSON.stringify({ key: "value" }));

      assert.ok(fs.existsSync(configPath));

      addToLiquibaseConfiguration("key", "newValue", true)
        .then(() => {
          const result = JSON.parse(fs.readFileSync(configPath, { encoding: "utf-8" }));

          assert.deepStrictEqual({ key: "value" }, result);

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

          done();
        })
        .catch(done);
    });
  });
});
