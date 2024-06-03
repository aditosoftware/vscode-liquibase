import { DialogValues } from "@aditosoftware/vscode-input";
import assert from "assert";
import * as vscode from "vscode";
import { ReadChangelogFile } from "../../readChangelogFile";
import { PROPERTY_FILE } from "../../input/ConnectionType";
import { TestUtils } from "./TestUtils";
import path from "path";
import { randomUUID } from "crypto";
import * as fs from "fs";
import { setCacheHandler } from "../../extension";
import { CacheHandler } from "../../cache";

/**
 * Tests the file readChangelogFile.
 */
suite("readChangelogFile", () => {
  const temporaryResourcePath = TestUtils.createTempFolderForTests("changelog");

  /**
   * Tests the method `isExtraQueryForChangelogNeeded`.
   */
  suite("isExtraQueryForChangelogNeeded", () => {
    /**
     * Tests that no changelog is needed when uri is present
     */
    test("should not need changelog when uri is present", () => {
      const dialogValues = new DialogValues();
      dialogValues.uri = vscode.Uri.file("");

      assert.strictEqual(ReadChangelogFile["isExtraQueryForChangelogNeeded"](dialogValues), false);
    });

    [
      {
        description: "changelog in the properties file",
        content: "changelogFile = foo",
      },
      {
        description: "no changelog in the properties file",
        content: "",
      },
    ].forEach((pArgument) => {
      /**
       * Tests that true will be returned, when a properties file will be read
       */
      test(`should return true when ${pArgument.description}`, () => {
        const propertyFile = generatePropertiesFile(temporaryResourcePath, pArgument.content);

        const dialogValues = new DialogValues();
        dialogValues.addValue(PROPERTY_FILE, propertyFile);

        assert.ok(ReadChangelogFile["isExtraQueryForChangelogNeeded"](dialogValues));
      });
    });
  });

  /**
   * Tests the method `getChangelogFileFromProperties`.
   */
  suite("getChangelogFileFromProperties", () => {
    [
      {
        description: "changelog in the properties file",
        content: "changelogFile = foo",
        expected: "foo",
      },
      {
        description: "no changelog in the properties file",
        content: "",
        expected: undefined,
      },
    ].forEach((pArgument) => {
      test(`should return ${pArgument.expected} when ${pArgument.description}`, () => {
        const propertyFile = generatePropertiesFile(temporaryResourcePath, pArgument.content);

        const dialogValues = new DialogValues();
        dialogValues.addValue(PROPERTY_FILE, propertyFile);

        assert.strictEqual(ReadChangelogFile["getChangelogFileFromProperties"](dialogValues), pArgument.expected);
      });
    });
  });

  /**
   * Tests the method `isChangelogFromOpenDialogNeeded`.
   */
  suite("isChangelogFromOpenDialogNeeded", () => {
    /**
     * Tests that no changelog is needed when uri is present
     */
    test("should not need changelog when uri is present", () => {
      const dialogValues = new DialogValues();
      dialogValues.uri = vscode.Uri.file("");

      assert.strictEqual(ReadChangelogFile["isChangelogFromOpenDialogNeeded"](dialogValues), false);
    });

    [
      {
        description: "the changelog should be selected",
        content: ReadChangelogFile.CHOOSE_CHANGELOG_OPTION,
        expected: true,
      },
      {
        description: "no changelog should be selected",
        content: "foo",
        expected: false,
      },
    ].forEach((pArgument) => {
      /**
       * Tests that the desired result will be returned, when the changelog selection was or was not selected
       */
      test(`should return ${pArgument.expected} when ${pArgument.description}`, () => {
        const dialogValues = new DialogValues();
        dialogValues.addValue(ReadChangelogFile.CHANGELOG_QUICK_PICK_NAME, pArgument.content);

        assert.strictEqual(ReadChangelogFile["isChangelogFromOpenDialogNeeded"](dialogValues), pArgument.expected);
      });
    });
  });

  suite("setExtraChangelogCorrectly", () => {
    test("should XXX", () => {
      assert.fail(); // FIXME machen
    });
  });

  /**
   * Tests the method `generateItemsForChangelogSelection`.
   */
  suite("generateItemsForChangelogSelection", () => {
    const chooseChangelogOptions: vscode.QuickPickItem[] = [
      { label: "", kind: vscode.QuickPickItemKind.Separator },
      { label: ReadChangelogFile.CHOOSE_CHANGELOG_OPTION, iconPath: new vscode.ThemeIcon("files") },
    ];

    /**
     * Tests that the choose option will be always visible, even if there are no other values.
     */
    test("should generate items with no existing changelog or recently loaded changelog", () => {
      const result = ReadChangelogFile["generateItemsForChangelogSelection"](new DialogValues());

      assert.deepStrictEqual(result, chooseChangelogOptions);
    });

    /**
     * Tests that the choose option will have the configured changelog, when it is there.
     */
    test("should generate items with configured changelog in properties file", () => {
      const propertyFile = generatePropertiesFile(temporaryResourcePath, "changelogFile = foo");

      const dialogValues = new DialogValues();
      dialogValues.addValue(PROPERTY_FILE, propertyFile);

      assert.deepStrictEqual(ReadChangelogFile["generateItemsForChangelogSelection"](dialogValues), [
        { label: "configured changelog", kind: vscode.QuickPickItemKind.Separator },
        { label: "foo" },
        ...chooseChangelogOptions,
      ]);
    });

    /**
     * Tests that the choose option will have the configured changelog, when it is there.
     */
    test("should generate items with cached changelogs", () => {
      const propertyFile = generatePropertiesFile(temporaryResourcePath, "");

      const dialogValues = new DialogValues();
      dialogValues.addValue(PROPERTY_FILE, propertyFile);

      const cacheLocation = path.join(temporaryResourcePath, "cache.json");
      const cacheHandler = new CacheHandler(cacheLocation);
      cacheHandler.saveChangelog(propertyFile, "baz");
      cacheHandler.saveChangelog(propertyFile, "bar");
      cacheHandler.saveChangelog(propertyFile, "foo");
      setCacheHandler(cacheHandler);

      const result = ReadChangelogFile["generateItemsForChangelogSelection"](dialogValues);

      // FIXME hier passen die relativen Pfade noch nicht

      assert.deepStrictEqual(result, [
        ...chooseChangelogOptions,
        { label: "recently chosen changelogs", kind: vscode.QuickPickItemKind.Separator },
        { label: "foo" },
        { label: "bar" },
        { label: "baz" },
      ]);
    });
  });
});

/**
 * Generates a properties file with a random name.
 * @param temporaryResourcePath - the temp path were the file should be saved
 * @param content - the content of the file
 * @returns the full path of the file
 */
function generatePropertiesFile(temporaryResourcePath: string, content: string): string {
  const propertyFile = path.join(temporaryResourcePath, `${randomUUID()}.liquibase.properties`);

  fs.writeFileSync(propertyFile, content, "utf-8");
  return propertyFile;
}
