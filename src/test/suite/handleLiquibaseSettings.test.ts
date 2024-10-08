import assert from "assert";
import {
  getDefaultDatabaseForConfiguration,
  getLiquibaseConfigurationPath,
  getLiquibaseFolder,
  getOpenOutputChannelOnCommandStartSetting,
} from "../../handleLiquibaseSettings";
import * as vscode from "vscode";
import { NO_PRE_CONFIGURED_DRIVER } from "@aditosoftware/driver-dependencies";
import chai from "chai";
import chaiFs from "chai-fs";

chai.use(chaiFs);

/**
 * Tests the handling of liquibase settings.
 */
suite("handleLiquibaseSettings", () => {
  /**
   * Tests the method `getLiquibaseConfigurationPath`.
   */
  suite("getLiquibaseConfigurationPath", () => {
    /**
     * Tests that it will work with a given config path.
     */
    test("should work with config value", async () => {
      await vscode.workspace.getConfiguration().update("liquibase.configurationPath", "my/new/config/path");

      const actual = await getLiquibaseConfigurationPath();

      assert.ok(actual, "path should exist");
      chai.assert.pathExists(actual);

      assert.match(actual, /workspace[\\/]my[\\/]new[\\/]config[\\/]path$/);
    });

    /**
     * Tests that it will work with no config given
     */
    test("should work with no config", async () => {
      await vscode.workspace.getConfiguration().update("liquibase.configurationPath", "");

      const actual = await getLiquibaseConfigurationPath();

      assert.ok(actual);
      chai.assert.pathExists(actual);

      assert.match(actual, /workspace[\\/]data[\\/]liquibase$/);
    });
  });

  /**
   * Tests the method `getLiquibaseFolder`.
   */
  suite("getLiquibaseFolder", () => {
    /**
     * Tests that the folder from the settings will be given.
     */
    test("should work with liquibase folder", async () => {
      await vscode.workspace.getConfiguration().update("liquibase.liquibaseFolder", "myLiquibaseFolder");

      assert.match(getLiquibaseFolder(), /workspace[\\/]myLiquibaseFolder$/);
    });

    /**
     * Tests that the workspace folder will be given, when no folder was there.
     */
    test("should work with no liquibase folder", async () => {
      await vscode.workspace.getConfiguration().update("liquibase.liquibaseFolder", "");

      assert.match(getLiquibaseFolder(), /workspace$/);
    });
  });

  /**
   * Tests the method `getDefaultDatabaseForConfiguration`.
   */
  suite("getDefaultDatabaseForConfiguration", () => {
    /**
     * Tests that the default database configuration can be loaded correctly.
     */
    [
      { expected: "AnyValue", newValue: "AnyValue" },
      { expected: NO_PRE_CONFIGURED_DRIVER, newValue: "" },
      { expected: NO_PRE_CONFIGURED_DRIVER, newValue: undefined },
    ].forEach((pArgument) => {
      test(`should read settings correctly for ${pArgument.newValue}`, (done) => {
        // set the configuration for the tests
        vscode.workspace
          .getConfiguration()
          .update("liquibase.defaultDatabaseForConfiguration", pArgument.newValue)
          .then(
            () => {
              // and then call the method under test
              assert.deepStrictEqual(pArgument.expected, getDefaultDatabaseForConfiguration());

              done();
            },
            (reject) => {
              assert.fail(reject);
            }
          );
      });
    });
  });

  /**
   * Tests the method `getOpenOutputChannelOnCommandStartSetting`
   */
  suite("getOpenOutputChannelOnCommandStartSetting", () => {
    [
      { setSetting: undefined, expected: true },
      { setSetting: false, expected: false },
      { setSetting: true, expected: true },
    ].forEach((pArgument) => {
      /**
       * Tests that the correct result will be returned for the given setting
       */
      test(`should return correct result for given setting${pArgument.setSetting}`, async () => {
        await vscode.workspace
          .getConfiguration()
          .update("liquibase.openOutputChannelOnCommandStart", pArgument.setSetting);

        assert.strictEqual(getOpenOutputChannelOnCommandStartSetting(), pArgument.expected);
      });
    });
  });
});
