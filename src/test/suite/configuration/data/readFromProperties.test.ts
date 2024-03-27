import assert from "assert";
import { TestUtils } from "../../TestUtils";
import path from "path";
import { randomUUID } from "crypto";
import * as fs from "fs";
import {
  readChangelog,
  readChangelogAndClasspathFile,
  readFullValues,
  readPossibleReferenceValues,
  readUrl,
} from "../../../../configuration/data/readFromProperties";
import {
  ConfigurationStatus,
  LiquibaseConfigurationData,
} from "../../../../configuration/data/LiquibaseConfigurationData";
import { LiquibaseSettings } from "../../../../configuration/data/TransferSettings";
import { DatabaseConnection } from "../../../../configuration/data/DatabaseConnection";

suite("readFromProperties", () => {
  let tempPath: string;
  let fileName: string;

  suiteSetup("create temp dir", () => {
    tempPath = TestUtils.createTempFolderForTests("propertiesReading");
  });

  setup("create temp file name", () => {
    fileName = path.join(tempPath, `${randomUUID()}.liquibase.properties`);
  });

  /**
   * Tests the function `readChangelogAndClasspathFile`.
   */
  suite("readChangelogAndClasspathFile", () => {
    /**
     * Tests that the reading of changelog and classpath works.
     */
    test("should readChangelogAndClasspathFile from filled file", () => {
      fs.writeFileSync(fileName, "changelogFile: myChangelogFile.xml\nclasspath= path1;path2", "utf-8");

      assert.deepStrictEqual(readChangelogAndClasspathFile(fileName, ";"), {
        classpath: ["path1", "path2"],
        changelog: "myChangelogFile.xml",
      });
    });
    /**
     * Tests that the reading of changelog and classpath from an empty file works.
     */
    test("should readChangelogAndClasspathFile from empty file", () => {
      fs.writeFileSync(fileName, "", "utf-8");

      assert.deepStrictEqual(readChangelogAndClasspathFile(fileName, ";"), {
        classpath: undefined,
        changelog: undefined,
      });
    });
  });

  /**
   * Tests the function `readChangelog`.
   */
  suite("readChangelog", () => {
    /**
     * Tests that the reading of a changelog works.
     */
    test("should readChangelog from filled file", () => {
      fs.writeFileSync(fileName, "changelogFile: myChangelogFile.xml", "utf-8");

      assert.deepStrictEqual(readChangelog(fileName), "myChangelogFile.xml");
    });

    /**
     * Tests that the reading of a changelog from an empty file works.
     */
    test("should readChangelog from empty file", () => {
      fs.writeFileSync(fileName, "", "utf-8");

      assert.deepStrictEqual(readChangelog(fileName), undefined);
    });
  });

  /**
   * Tests the function `readUrl`.
   */
  suite("readUrl", () => {
    /**
     * Tests that the reading of an url works.
     */
    test("should readUrl from filled file", () => {
      fs.writeFileSync(fileName, "url: myUrl", "utf-8");

      assert.deepStrictEqual(readUrl(fileName), "myUrl");
    });

    /**
     * Tests that the reading of an url from an empty file works.
     */
    test("should readUrl from empty file", () => {
      fs.writeFileSync(fileName, "", "utf-8");

      assert.deepStrictEqual(readUrl(fileName), undefined);
    });
  });

  /**
   * Tests the function `readPossibleReferenceValues`.
   */
  suite("readPossibleReferenceValues", () => {
    /**
     * Tests that nothing will be read when reading the reference values from an empty file.
     */
    test("should readPossibleReferenceValues with empty file", () => {
      fs.writeFileSync(fileName, "", "utf-8");

      assert.deepStrictEqual(readPossibleReferenceValues(fileName), []);
    });

    test("should readPossibleReferenceValues", () => {
      fs.writeFileSync(
        fileName,
        `
defaultCatalogName = lorem
defaultSchemaName = ipsum
driver = dolor
driverPropertiesFile = sit
liquibaseCatalogName = amat
liquibaseSchemaName = consetetur
password = sadipscing
schemas = elitr
username = sed
url = diam
invalidKey = notCorrect
`,
        "utf-8"
      );

      assert.deepStrictEqual(
        readPossibleReferenceValues(fileName).sort((a, b) => a.localeCompare(b)),
        [
          "--reference-default-catalog-name=lorem",
          "--reference-default-schema-name=ipsum",
          "--reference-driver=dolor",
          "--reference-driver-properties-file=sit",
          "--reference-liquibase-catalog-name=amat",
          "--reference-liquibase-schema-name=consetetur",
          "--reference-password=sadipscing",
          "--reference-schemas=elitr",
          "--reference-username=sed",
          "--reference-url=diam",
        ].sort((a, b) => a.localeCompare(b))
      );
    });
  });

  /**
   * Tests the function `readFullValues`.
   */
  suite("readFullValues", () => {
    let expected: LiquibaseConfigurationData;

    const name = "MyName";
    const liquibaseSettings: LiquibaseSettings = {
      defaultDatabaseForConfiguration: "MariaDB",
      liquibaseDirectoryInProject: "",
    };

    /**
     * Creates the basic expected data for the tests.
     */
    setup("create expected", () => {
      expected = LiquibaseConfigurationData.createDefaultData(liquibaseSettings, ConfigurationStatus.EDIT, ";");
      expected.name = name;
    });

    /**
     * Tests the reading from a not existing file.
     */
    test("should read nothing from not existing file", () => {
      assert.ok(!fs.existsSync(fileName), "file should not exist");

      assert.deepStrictEqual(readFullValues(name, fileName, liquibaseSettings, ";"), expected);
    });

    /**
     * Tests the reading of some full values.
     */
    test("should readFullValues", () => {
      fs.writeFileSync(
        fileName,
        `
changelogFile = changelog.xml
# configuration for the database
username = jane
password = janesPassword
url = jdbc:mariadb://localhost:3306/data
driver = org.mariadb.jdbc.Driver
# configuration for the reference database
referenceUsername = john
referencePassword = johnsPassword
referenceUrl = jdbc:postgresql://localhost:5432/data
referenceDriver = org.postgresql.Driver
# Specifies the directories and JAR files to search for changelog files and custom extension classes.
# To separate multiple directories, use a semicolon (;) on Windows or a colon (:) on Linux or MacOS.
classpath = path1;path2
# additional configuration values
lorem = ipsum
`,
        "utf-8"
      );

      expected.changelogFile = "changelog.xml";
      expected.classpath = "path1\npath2";
      expected.additionalConfiguration["lorem"] = "ipsum";

      expected.databaseConnection.username = "jane";
      expected.databaseConnection.password = "janesPassword";
      expected.databaseConnection.url = "jdbc:mariadb://localhost:3306/data";
      expected.databaseConnection.databaseType = "MariaDB";

      expected.referenceDatabaseConnection = DatabaseConnection.createDefaultDatabaseConnection("");
      expected.referenceDatabaseConnection.username = "john";
      expected.referenceDatabaseConnection.password = "johnsPassword";
      expected.referenceDatabaseConnection.url = "jdbc:postgresql://localhost:5432/data";
      expected.referenceDatabaseConnection.databaseType = "PostgreSQL";

      assert.deepStrictEqual(readFullValues(name, fileName, liquibaseSettings, ";"), expected);
    });
  });
});
