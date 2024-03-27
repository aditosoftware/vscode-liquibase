import assert from "assert";
import { LiquibaseConfigurationData } from "../../../../configuration/data/LiquibaseConfigurationData";
import { TestUtils } from "../../TestUtils";
import { NO_PRE_CONFIGURED_DRIVER } from "../../../../configuration/drivers";

/**
 * Tests the class `LiquibaseConfigurationData`.
 */
suite("LiquibaseConfigurationData", () => {
  /**
   * Tests the method `handleValueFromLiquibaseConfiguration`.
   */
  suite("handleValueFromLiquibaseConfiguration", () => {
    /**
     * Tests various combinations for the key - values
     */
    [
      {
        key: "changelogFile",
        value: "myValue",
        getActualValue: (data: LiquibaseConfigurationData) => data.changelogFile,
      },
      {
        key: "classpath",
        value: "classpath1;classpath2;classpath3",
        expectedValue: "classpath1\nclasspath2\nclasspath3",
        getActualValue: (data: LiquibaseConfigurationData) => data.classpath,
      },
      {
        key: "username",
        value: "admin",
        getActualValue: (data: LiquibaseConfigurationData) => data.databaseConnection.username,
      },
      {
        key: "password",
        value: "mySecretPassword",
        getActualValue: (data: LiquibaseConfigurationData) => data.databaseConnection.password,
      },
      {
        key: "url",
        value: "jdbc:mariadb//localhost:3306/data",
        getActualValue: (data: LiquibaseConfigurationData) => data.databaseConnection.url,
      },

      // This key does not exists in reference, but de-referenced it will be set to the normal value
      {
        key: "referenceChangelogFile",
        value: "myValue",
        getActualValue: (data: LiquibaseConfigurationData) => data.changelogFile,
      },

      // This key does not exists in reference, but de-referenced it will be set to the normal value
      {
        key: "referenceClasspath",
        value: "classpath1;classpath2;classpath3",
        expectedValue: "classpath1\nclasspath2\nclasspath3",
        getActualValue: (data: LiquibaseConfigurationData) => data.classpath,
      },
      {
        key: "referenceUsername",
        value: "admin",
        getActualValue: (data: LiquibaseConfigurationData) => data.referenceDatabaseConnection?.username,
      },
      {
        key: "referencePassword",
        value: "mySecretPassword",
        getActualValue: (data: LiquibaseConfigurationData) => data.referenceDatabaseConnection?.password,
      },
      {
        key: "referenceUrl",
        value: "jdbc:mariadb//localhost:3306/data",
        getActualValue: (data: LiquibaseConfigurationData) => data.referenceDatabaseConnection?.url,
      },

      // This key will set as additional configuration.
      {
        key: "lorem",
        value: "ipsum",
        getActualValue: (data: LiquibaseConfigurationData) => data.additionalConfiguration["lorem"],
      },
    ].forEach((pArgument) => {
      test(`should handle value for key ${pArgument.key}`, () => {
        const liquibaseConfigurationData = TestUtils.createDummyLiquibaseConfigurationData();

        liquibaseConfigurationData.handleValueFromLiquibaseConfiguration(pArgument.key, pArgument.value);

        assert.deepStrictEqual(
          pArgument.getActualValue(liquibaseConfigurationData),
          pArgument.expectedValue ?? pArgument.value
        );
      });
    });

    /**
     * Tests that a pre configured driver will be handled correctly for a normal connection.
     */
    test("should handle for pre configured driver in normal connection", () => {
      const liquibaseConfigurationData = TestUtils.createDummyLiquibaseConfigurationData();

      liquibaseConfigurationData.handleValueFromLiquibaseConfiguration("driver", "org.mariadb.jdbc.Driver");

      assert.deepStrictEqual(liquibaseConfigurationData.databaseConnection.driver, "");
      assert.deepStrictEqual(liquibaseConfigurationData.databaseConnection.databaseType, "MariaDB");
    });

    /**
     * Tests that a pre configured driver will be handled correctly for a reference connection.
     */
    test("should handle for pre configured driver in reference connection", () => {
      const liquibaseConfigurationData = TestUtils.createDummyLiquibaseConfigurationData();

      liquibaseConfigurationData.handleValueFromLiquibaseConfiguration("referenceDriver", "org.mariadb.jdbc.Driver");

      assert.ok(liquibaseConfigurationData.referenceDatabaseConnection);
      assert.deepStrictEqual(liquibaseConfigurationData.referenceDatabaseConnection.driver, "");
      assert.deepStrictEqual(liquibaseConfigurationData.referenceDatabaseConnection.databaseType, "MariaDB");
    });

    /**
     * Tests that a custom driver will be handled correctly for a normal connection.
     */
    test("should handle for custom driver in normal connection", () => {
      const liquibaseConfigurationData = TestUtils.createDummyLiquibaseConfigurationData();

      const customDriver = "org.company.custom.Driver";
      liquibaseConfigurationData.handleValueFromLiquibaseConfiguration("driver", customDriver);

      assert.deepStrictEqual(liquibaseConfigurationData.databaseConnection.driver, customDriver);
      assert.deepStrictEqual(liquibaseConfigurationData.databaseConnection.databaseType, NO_PRE_CONFIGURED_DRIVER);
    });

    /**
     * Tests that a custom driver will be handled correctly for a reference connection.
     */
    test("should handle for custom driver in reference connection", () => {
      const liquibaseConfigurationData = TestUtils.createDummyLiquibaseConfigurationData();

      const customDriver = "org.company.custom.Driver";
      liquibaseConfigurationData.handleValueFromLiquibaseConfiguration("referenceDriver", customDriver);

      assert.ok(liquibaseConfigurationData.referenceDatabaseConnection);
      assert.deepStrictEqual(liquibaseConfigurationData.referenceDatabaseConnection.driver, customDriver);
      assert.deepStrictEqual(
        liquibaseConfigurationData.referenceDatabaseConnection.databaseType,
        NO_PRE_CONFIGURED_DRIVER
      );
    });
  });

  /**
   * Tests the generation of properties.
   */
  suite("generateProperties", () => {
    /**
     * Tests the disguise functionality of passwords.
     */
    suite("disguise password", () => {
      let liquibaseConfigurationData: LiquibaseConfigurationData;
      const password = "mySecretPassword";

      /**
       * The function to create the expected value.
       * @param passwordValue - the value that should be set as password
       * @returns the content for the properties file.
       */
      const expected = (passwordValue: string): string => `
# configuration for the database
password = ${passwordValue}
# configuration for the reference database
referencePassword = ${passwordValue}`;

      /**
       * Creates a simple liquibase configuration with only password and reference password set.
       */
      setup("init data", () => {
        liquibaseConfigurationData = TestUtils.createDummyLiquibaseConfigurationData();
        liquibaseConfigurationData.handleValueFromLiquibaseConfiguration("password", password);
        liquibaseConfigurationData.handleValueFromLiquibaseConfiguration("referencePassword", password);

        // remove the database type from this configuration
        liquibaseConfigurationData.databaseConnection.databaseType = "";
        if (liquibaseConfigurationData.referenceDatabaseConnection) {
          liquibaseConfigurationData.referenceDatabaseConnection.databaseType = "";
        }
      });

      /**
       * Tests that the disguising of passwords work.
       */
      test("should work with disguised password", () => {
        const actual = liquibaseConfigurationData.generateProperties(() => undefined, true);

        assert.deepStrictEqual(actual, expected("***"));
      });

      /**
       * Tests that an undisguised password will be also written, if required.
       */
      [false, undefined].forEach((pArgument) => {
        test(`should work with not disguised password (${pArgument})`, () => {
          const actual = liquibaseConfigurationData.generateProperties(() => undefined, pArgument);

          assert.deepStrictEqual(actual, expected(password));
        });
      });
    });

    /**
     * Test that a config data with driver and reference driver will be correctly transformed.
     */
    test("should create full configuration data", () => {
      const expected = `
changelogFile = myChangelogFile
# configuration for the database
driver = org.mariadb.jdbc.Driver
# configuration for the reference database
referenceDriver = org.postgresql.Driver
# Specifies the directories and JAR files to search for changelog files and custom extension classes.
# To separate multiple directories, use a semicolon (;) on Windows or a colon (:) on Linux or MacOS.
classpath = path1:path2:path3:mariadb-java-client-2.5.3.jar:postgresql-42.6.0.jar
# additional configuration values
lorem = ipsum
dolor = sit`;

      const liquibaseConfigurationData = TestUtils.createDummyLiquibaseConfigurationData();
      liquibaseConfigurationData.classpathSeparator = ":";

      liquibaseConfigurationData.handleValueFromLiquibaseConfiguration("changelogFile", "myChangelogFile");
      // This classpath has duplicate elements, elements with quotation marks and some empty lines. All of those this are special handling
      liquibaseConfigurationData.handleValueFromLiquibaseConfiguration("classpath", 'path1\n"path2"\npath3\n\npath1\n');
      // set any reference driver
      liquibaseConfigurationData.handleValueFromLiquibaseConfiguration("referenceDriver", "org.postgresql.Driver");
      // set some additional values
      liquibaseConfigurationData.handleValueFromLiquibaseConfiguration("lorem", "ipsum");
      liquibaseConfigurationData.handleValueFromLiquibaseConfiguration("dolor", "sit");

      const actual = liquibaseConfigurationData.generateProperties((driver) => driver.getFileName());

      assert.deepStrictEqual(actual, expected);
    });
  });

  suite("clone", () => {
    let data: LiquibaseConfigurationData;

    setup("init data", () => {
      data = TestUtils.createDummyLiquibaseConfigurationData();
      data.handleValueFromLiquibaseConfiguration("username", "jane");
      data.handleValueFromLiquibaseConfiguration("referenceUsername", "john");
      data.handleValueFromLiquibaseConfiguration("lorem", "ipsum");
    });

    /**
     * Tests that the cloning does work.
     */
    test("should clone with reference connection", () => {
      const clonedData = LiquibaseConfigurationData.clone(data);

      assert.deepStrictEqual(clonedData, data);

      data.databaseConnection.username = "admin";
      data.additionalConfiguration["lorem"] = "newValue";

      assert.strictEqual(
        clonedData.databaseConnection.username,
        "jane",
        "check that the data is cloned and username will not be changed"
      );

      assert.strictEqual(
        clonedData.additionalConfiguration["lorem"],
        "ipsum",
        "check that the data is cloned and the additional property will not be changed"
      );
    });

    /**
     * Tests that the cloning without a reference connection does work.
     */
    test("should clone without reference connection", () => {
      // remove the reference connection before cloning
      data.referenceDatabaseConnection = undefined;
      const clonedData = LiquibaseConfigurationData.clone(data);

      assert.deepStrictEqual(clonedData, data);
    });
  });
});
