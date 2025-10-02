import assert, { fail } from "node:assert";
import { PREDEFINED_DRIVERS, Driver, UrlParts } from "@aditosoftware/driver-dependencies";

/**
 * Tests the url handling of the drivers.
 * This includes building urls and extracting urls.
 */
suite("url handling", () => {
  /**
   * Tests the url handling with a dummy driver object.
   * This has not much logic in their methods.
   */
  suite("url handling of dummy driver", () => {
    const driver: Driver = new Driver(
      "not needed",
      "https://maven.central.org/url/to/my/driver/myDriver.jar",
      "jdbc:myDriver//",
      42,
      "/",
      (url: string) => {
        return { databaseName: "my_database", index: url.lastIndexOf("/") };
      },
      (driver: Driver, databaseName: string) => `${driver.separator}${databaseName}`,
      () => "?param"
    );

    /**
     * Tests that build url with a dummy object works.
     */
    suite("buildUrl", () => {
      /**
       * Tests that building without an old url and any url part works.
       */
      test("without old url", () => {
        assert.strictEqual(
          "jdbc:myDriver//127.0.0.1:1234/my_database",
          driver.buildUrl(undefined, {}, "127.0.0.1", 1234, "my_database")
        );
      });
      /**
       * Tests that building with an old url and without any url part works.
       */
      test("with old url", () => {
        assert.strictEqual(
          "jdbc:myDriver//127.0.0.1:1234/my_database?param",
          driver.buildUrl("jdbc:myDriver//127.0.0.1:1234/my_database?param", {}, "127.0.0.1", 1234, "my_database")
        );
      });

      /**
       * Tests that building without an old url and with a new server address works.
       */
      test("with new server address", () => {
        assert.strictEqual(
          "jdbc:myDriver//localhost:1234/my_database",
          driver.buildUrl(undefined, { serverAddress: "localhost" }, "127.0.0.1", 1234, "my_database")
        );
      });

      /**
       * Tests that building without an old url and with a new port works.
       */
      test("with new port", () => {
        assert.strictEqual(
          "jdbc:myDriver//127.0.0.1:8520/my_database",
          driver.buildUrl(undefined, { port: 8520 }, "127.0.0.1", 1234, "my_database")
        );
      });

      /**
       * Tests that building without an old url and with a new database name works.
       */
      test("with new database name", () => {
        assert.strictEqual(
          "jdbc:myDriver//127.0.0.1:1234/system_db",
          driver.buildUrl(undefined, { databaseName: "system_db" }, "127.0.0.1", 1234, "my_database")
        );
      });
    });

    /**
     * Tests that the extraction of url part works with a dummy object.
     */
    suite("extractUrlParts", () => {
      /**
       * Tests that the extraction should work normally when a valid url was given.
       */
      test("should extract normally", () => {
        const expected: UrlParts = {
          serverAddress: "127.0.0.1",
          port: 1234,
          databaseName: "my_database",
        };
        assert.deepStrictEqual(expected, driver.extractUrlParts("jdbc:myDriver//127.0.0.1:1234/my_database"));
      });

      /**
       * Tests that only the default port will be returned, when there where to many parts left.
       */
      test("should only extract default port", () => {
        const expected: UrlParts = {
          port: 42,
        };
        assert.deepStrictEqual(expected, driver.extractUrlParts("jdbc:myDriver//127.0.0.1:1234:not_valid/my_database"));
      });
    });
  });

  /**
   *Tests the url handling of all pre-configured drivers in the `PREDEFINED_DRIVERS` map.
   */
  suite("url handling of pre-configured drivers", () => {
    const testCases: TestCase[] = [
      {
        driver: "MariaDB",
        detail: "url with parameters",
        url: "jdbc:mariadb://127.0.0.1:1234/my_database?user=username&password=password&parameter1=value1&parameter2=value2",
        oldUrl:
          "jdbc:mariadb://localhost:7896/old_database?user=username&password=password&parameter1=value1&parameter2=value2",
      },
      {
        driver: "MariaDB",
        detail: "url without parameters",
        url: "jdbc:mariadb://127.0.0.1:1234/my_database",
        oldUrl: "jdbc:mariadb://localhost:7896/old_database",
      },
      {
        driver: "MySQL",
        detail: "url with parameters",
        url: "jdbc:mysql://127.0.0.1:1234/my_database?user=username&password=password&parameter1=value1&parameter2=value2",
        oldUrl:
          "jdbc:mysql://localhost:7896/old_database?user=username&password=password&parameter1=value1&parameter2=value2",
      },
      {
        driver: "MS SQL",
        detail: "url with parameters",
        url: "jdbc:sqlserver://127.0.0.1:1234;databaseName=my_database;user=username;password=password;parameter1=value1;parameter2=value2",
        oldUrl:
          "jdbc:sqlserver://localhost:7896;databaseName=old_database;user=username;password=password;parameter1=value1;parameter2=value2",
      },
      {
        driver: "MS SQL",
        detail: "url without parameters",
        url: "jdbc:sqlserver://127.0.0.1:1234;databaseName=my_database",
        oldUrl: "jdbc:sqlserver://localhost:7896;databaseName=old_database",
      },
      {
        driver: "Oracle",
        detail: "url with parameters",
        url: "jdbc:oracle:thin:@127.0.0.1:1234:my_database?user=username&password=password&parameter1=value1&parameter2=value2",
        oldUrl:
          "jdbc:oracle:thin:@localhost:7896:old_database?user=username&password=password&parameter1=value1&parameter2=value2",
      },
      {
        driver: "PostgreSQL",
        detail: "url with parameters",
        url: "jdbc:postgresql://127.0.0.1:1234/my_database?user=username&password=password&parameter1=value1&parameter2=value2",
        oldUrl:
          "jdbc:postgresql://localhost:7896/old_database?user=username&password=password&parameter1=value1&parameter2=value2",
      },
    ];

    /**
     * Checks if there are test cases for every driver.
     */
    test("should have test cases for every driver", () => {
      // gets all drivers from the test cases, distinct and sort them
      const testCaseDrivers = Array.from(new Set(testCases.map((pCase) => pCase.driver))).sort((a, b) =>
        a.localeCompare(b)
      );

      assert.deepStrictEqual(
        Array.from(PREDEFINED_DRIVERS.keys()).sort((a, b) => a.localeCompare(b)),
        testCaseDrivers
      );
    });

    for (const pCase of testCases) {
      /**
       * Makes tests for any test case of the drivers regarding extracting and building urls.
       */
      suite(`Database ${pCase.driver} (${pCase.detail})`, () => {
        /**
         * The driver for the tests. This will be extracted in `suiteSetup`.
         */
        let driver: Driver;

        /**
         * The url parts that should be used in any test.
         */
        const urlParts: UrlParts = {
          serverAddress: "127.0.0.1",
          port: 1234,
          databaseName: "my_database",
        };

        /**
         * Gets the pre-configured driver from the `PREDEFINED_DRIVERS` map. If any driver is not there, then this suite will fail.
         */
        suiteSetup("get driver from map", () => {
          assert.ok(PREDEFINED_DRIVERS.has(pCase.driver));
          const driverFromMap = PREDEFINED_DRIVERS.get(pCase.driver);
          if (driverFromMap) {
            driver = driverFromMap;
          } else {
            fail(`Driver ${pCase.driver} was not found in the map of all drivers`);
          }
        });

        /**
         * Tests the extraction of the url parts for this driver.
         */
        test("extractUrlParts", () => {
          assert.deepStrictEqual(urlParts, driver.extractUrlParts(pCase.url));
        });

        /**
         * Tests the building of the url.
         * This method will always have an old url and no need to use any fallback elements for the url.
         */
        test("buildUrl", () => {
          assert.strictEqual(
            pCase.url,
            driver.buildUrl(pCase.oldUrl, urlParts, "fallbackServerAddress", 8520, "fallback_database")
          );
        });
      });
    }

    /**
     * The test cases for the pre-configured drivers
     */
    interface TestCase {
      /**
       * The name of the driver. This is also the key of the `PREDEFINED_DRIVERS` map.
       */
      driver: string;

      /**
       * Any detail for this test case. This will be added to the name of the suite.
       */
      detail: string;

      /**
       * The url that should be used for extracting and also be the result of building.
       */
      url: string;

      /**
       * The old url that should be given for building the url.
       */
      oldUrl: string;
    }
  });
});
