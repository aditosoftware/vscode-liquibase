import assert from "assert";
import { DatabaseConnection } from "../../../../configuration/data/DatabaseConnection";
import { UrlParts } from "@aditosoftware/driver-dependencies";

/**
 * Tests the class `DatabaseConnection`. Most of the methods are already tested by the tests for `LiquibaseConfigurationData`.
 */
suite("DatabaseConnection", () => {
  /**
   * Tests the extraction of the url parts.
   */
  suite("extractUrlPartsFromDatabaseConfiguration", () => {
    /**
     * Tests the extraction for a pre configured driver.
     */
    test("should extract from pre configured driver", () => {
      const databaseConnection = DatabaseConnection.createDefaultDatabaseConnection("MariaDB");
      databaseConnection.url = "jdbc:mariadb://localhost:3306/data";

      assert.deepStrictEqual(databaseConnection.extractUrlPartsFromDatabaseConfiguration(), {
        serverAddress: "localhost",
        port: 3306,
        databaseName: "data",
      } as UrlParts);
    });

    /**
     * Tests that there will be nothing extracted when a custom driver was given.
     */
    test("should extract nothing from custom driver", () => {
      const databaseConnection = DatabaseConnection.createDefaultDatabaseConnection("MyCustomDriver");

      assert.deepStrictEqual(databaseConnection.extractUrlPartsFromDatabaseConfiguration(), {} as UrlParts);
    });
  });

  /**
   * Tests the method `getValue`
   */
  suite("getValue", () => {
    let databaseConnection: DatabaseConnection;

    /**
     * Inits some example data before each test.
     */
    setup("init data", () => {
      databaseConnection = DatabaseConnection.createDefaultDatabaseConnection("MariaDB");
      databaseConnection.username = "admin";
    });

    /**
     * Tests that the username will be extracted correctly.
     */
    test("should extract username", () => {
      assert.deepStrictEqual(databaseConnection.getValue("username"), "admin");
    });

    /**
     * Tests that the value of an function will be not extracted correctly.
     */
    test("should extract nothing for non string key", () => {
      assert.deepStrictEqual(databaseConnection.getValue("extractUrlPartsFromDatabaseConfiguration"), undefined);
    });
  });
});
