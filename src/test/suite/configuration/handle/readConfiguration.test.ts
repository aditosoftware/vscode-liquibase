import Sinon from "sinon";
import {
  getNameOfConfiguration,
  getPathOfConfiguration,
  readConfiguration,
  readLiquibaseConfigurationNames,
  updateConfiguration,
} from "../../../../configuration/handle/readConfiguration";
import * as handleLiquibaseSettings from "../../../../handleLiquibaseSettings";
import path from "path";
import assert, { fail } from "assert";
import fs from "fs";
import { TestUtils } from "../../TestUtils";

/**
 * Tests the reading of the configuration
 */
suite("read configuration", () => {
  let baseResourcePath: string;

  let getLiquibaseConfigurationPathStub: Sinon.SinonStub;

  /**
   * Creates the stub before each test.
   */
  setup("create stubs", () => {
    TestUtils.initLoggerForTests();

    baseResourcePath = TestUtils.createTempFolderForTests("configuration", "read");

    fs.writeFileSync(
      path.join(baseResourcePath, "settings.json"),
      JSON.stringify({
        one: "path/to/connection/one.liquibase.properties",
        two: "path/to/connection/two.liquibase.properties",
        three: "path/to/connection/three.liquibase.properties",
        four: "path/to/connection/four.liquibase.properties",
      })
    );

    getLiquibaseConfigurationPathStub = Sinon.stub(handleLiquibaseSettings, "getLiquibaseConfigurationPath").resolves(
      baseResourcePath
    );
  });

  /**
   * Restore the stubs after each test.
   */
  teardown("restore stubs", () => {
    getLiquibaseConfigurationPathStub.restore();
  });

  /**
   * Tests the reading.
   */
  suite("read", () => {
    /**
     * Tests that the reading of an configuration file with not an existing path works.
     */
    test("should work with not existing file", (done) => {
      getLiquibaseConfigurationPathStub.resolves("/path/to/not/existing/folder");

      readConfiguration()
        .then((result) => {
          assert.deepStrictEqual({}, result);

          done();
        })
        .catch((error) => done(error));
    });

    /**
     * Tests that the reading of the configuration works.
     */
    test("should read configuration", (done) => {
      readConfiguration()
        .then((result) => {
          assert.deepStrictEqual(
            {
              four: "path/to/connection/four.liquibase.properties",
              one: "path/to/connection/one.liquibase.properties",
              three: "path/to/connection/three.liquibase.properties",
              two: "path/to/connection/two.liquibase.properties",
            },
            result
          );

          done();
        })
        .catch(done);
    });

    /**
     * Tests that the reading of all configuration names works.
     */
    test("should read configuration names", (done) => {
      readLiquibaseConfigurationNames()
        .then((result) => {
          assert.deepStrictEqual(["four", "one", "three", "two"], result);

          done();
        })
        .catch(done);
    });

    const existingConfigurations = [
      { configurationPath: "path/to/connection/four.liquibase.properties", configurationName: "four" },
      { configurationPath: "path/to/connection/three.liquibase.properties", configurationName: "three" },
      { configurationPath: "path/to/connection/two.liquibase.properties", configurationName: "two" },
      { configurationPath: "path/to/connection/one.liquibase.properties", configurationName: "one" },
    ];

    [{ configurationPath: undefined, configurationName: "five" }, ...existingConfigurations].forEach((pArgument) => {
      /**
       * Tests that the reading of the configuration path works
       */
      test(`should read path of configuration (${pArgument.configurationName})`, (done) => {
        getPathOfConfiguration(pArgument.configurationName)
          .then((result) => {
            assert.strictEqual(pArgument.configurationPath, result);
            done();
          })
          .catch(done);
      });
    });

    [
      ...existingConfigurations,
      { configurationPath: "path/to/connection/five.liquibase.properties", configurationName: undefined },
    ].forEach((pArgument) => {
      /**
       * Tests that the reading of the configuration names works
       */
      test(`should read path of configuration ${pArgument.configurationPath}`, async () => {
        const result = await getNameOfConfiguration(pArgument.configurationPath);

        assert.deepStrictEqual(result, pArgument.configurationName);
      });
    });
  });

  /**
   * Tests the updating.
   */
  suite("update", () => {
    /**
     * Tests that the update does nothing when a not existing config file was used
     */
    test("should not work with not existing configuration", (done) => {
      getLiquibaseConfigurationPathStub.resolves(undefined);

      updateConfiguration((jsonData) => {
        fail(`should not be updated ${jsonData} `);
      })
        .then((result) => {
          assert.ok(!result);

          done();
        })
        .catch(done);
    });

    /**
     * Tests that the update does work when an existing config file was used.
     */
    test("should work with existing configuration", (done) => {
      updateConfiguration((jsonData) => {
        jsonData["newConfig"] = "path/to/connection/newConfig.liquibase.properties";
      })
        .then((result) => {
          assert.ok(result);

          const actualSettings = JSON.parse(
            fs.readFileSync(path.join(baseResourcePath, "settings.json"), { encoding: "utf-8" })
          );

          assert.deepStrictEqual(
            {
              four: "path/to/connection/four.liquibase.properties",
              one: "path/to/connection/one.liquibase.properties",
              three: "path/to/connection/three.liquibase.properties",
              two: "path/to/connection/two.liquibase.properties",
              newConfig: "path/to/connection/newConfig.liquibase.properties",
            },
            actualSettings
          );

          done();
        })
        .catch(done);
    });
  });
});
