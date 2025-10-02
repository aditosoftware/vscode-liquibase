import assert from "node:assert";
import { TestUtils } from "./TestUtils";
import { randomUUID } from "node:crypto";
import path from "node:path";
import * as fs from "node:fs";
import { getReferenceKeysFromPropertyFile } from "../../propertiesToDiff";

/**
 * Tests the file propertiesToDiff.
 */
suite("propertiesToDiff", () => {
  let tempPath: string;
  let fileName: string;

  /**
   * Inits the logger and temp folder for the tests.
   */
  suiteSetup("init logger and temp folder", () => {
    TestUtils.initLoggerForTests();

    tempPath = TestUtils.createTempFolderForTests("propertiesReading");
  });

  /**
   * Creates for every test an individual file name in in the temp folder.
   */
  setup("create temp file name", () => {
    fileName = path.join(tempPath, `${randomUUID()}.liquibase.properties`);
  });

  /**
   * Tests the function `readPossibleReferenceValues`.
   */
  suite("getReferenceKeysFromPropertyFile", () => {
    /**
     * Tests that nothing will be returned, when no file was given
     */
    test("should get nothing when no file given", () => {
      assert.ok(!getReferenceKeysFromPropertyFile(undefined));
    });

    /**
     * Tests that nothing will be read when reading the reference values from an empty file.
     */
    test("should readPossibleReferenceValues with empty file", () => {
      fs.writeFileSync(fileName, "", "utf-8");

      assert.deepStrictEqual(getReferenceKeysFromPropertyFile(fileName), []);
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

      const actual = getReferenceKeysFromPropertyFile(fileName);
      assert.ok(actual);

      actual.sort((a, b) => a.localeCompare(b));
      assert.deepStrictEqual(
        actual,
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
});
