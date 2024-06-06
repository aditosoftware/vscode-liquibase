import { DialogValues } from "@aditosoftware/vscode-input";
import assert from "assert";
import * as vscode from "vscode";
import { HandleChangelogFileInput } from "../../handleChangelogFileInput";
import { PROPERTY_FILE } from "../../input/ConnectionType";
import { TestUtils } from "./TestUtils";
import path from "path";
import { randomUUID } from "crypto";
import * as fs from "fs";
import { setCacheHandler } from "../../extension";
import { CacheHandler } from "../../cache";
import Sinon from "sinon";
import { Logger } from "@aditosoftware/vscode-logging";
import * as lbSettings from "../../handleLiquibaseSettings";

/**
 * Tests the file readChangelogFile.
 */
suite("handleChangelogInput", () => {
  const temporaryResourcePath = TestUtils.createTempFolderForTests("changelog");

  const cacheLocation = path.join(temporaryResourcePath, "cache.json");
  const cacheHandler = new CacheHandler(cacheLocation);

  let clock: Sinon.SinonFakeTimers;

  /**
   * Inits the logger for the tests.
   */
  suiteSetup("init logger and set cache handler", () => {
    TestUtils.initLoggerForTests();

    setCacheHandler(cacheHandler);
  });

  /**
   * Creates the stub for the liquibase folder.
   */
  setup("create getLiquibaseFolder stub", () => {
    Sinon.stub(lbSettings, "getLiquibaseFolder").returns(temporaryResourcePath);

    clock = Sinon.useFakeTimers();
  });

  /**
   * Restore the stubs.
   */
  teardown("restore stubs", () => {
    Sinon.restore();
  });

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

      assert.strictEqual(HandleChangelogFileInput["isExtraQueryForChangelogNeeded"](dialogValues), false);
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

        assert.ok(HandleChangelogFileInput["isExtraQueryForChangelogNeeded"](dialogValues));
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

        assert.strictEqual(
          HandleChangelogFileInput["getChangelogFileFromProperties"](dialogValues),
          pArgument.expected
        );
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

      assert.strictEqual(HandleChangelogFileInput["isChangelogFromOpenDialogNeeded"](dialogValues), false);
    });

    [
      {
        description: "the changelog should be selected",
        content: HandleChangelogFileInput.CHOOSE_CHANGELOG_OPTION,
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
        dialogValues.addValue(HandleChangelogFileInput.CHANGELOG_QUICK_PICK_NAME, pArgument.content);

        assert.strictEqual(
          HandleChangelogFileInput["isChangelogFromOpenDialogNeeded"](dialogValues),
          pArgument.expected
        );
      });
    });
  });

  /**
   * Tests the method `setExtraChangelogCorrectly`.
   */
  suite("setExtraChangelogCorrectly", () => {
    const namesOfInput = [
      HandleChangelogFileInput.CHANGELOG_OPEN_DIALOG_NAME,
      HandleChangelogFileInput.CHANGELOG_QUICK_PICK_NAME,
    ];

    let errorLog: Sinon.SinonStub;
    let saveChangelog: Sinon.SinonStub;
    /**
     * Init some stubs.
     */
    setup("init stubs", () => {
      errorLog = Sinon.stub(Logger.getLogger(), "error");

      saveChangelog = Sinon.stub(cacheHandler, "saveChangelog");
    });

    [
      {
        description: "when choose changelog option",
        option: HandleChangelogFileInput.CHOOSE_CHANGELOG_OPTION,
        logMessage: undefined,
      },
      {
        description: "when not existing path",
        option: "/this/path/does/not/exist",
        logMessage: "Error getting a changelog path from /this/path/does/not/exist",
      },
      {
        description: "when having empty path",
        option: "",
        logMessage: "Error getting a changelog path from ",
      },
    ]
      .flatMap((pElement) =>
        namesOfInput.map((pNameOfInput) => ({
          ...pElement,
          input: pNameOfInput,
        }))
      )
      .forEach((pArgument) => {
        /**
         * Tests various cases where the input parameter was not as expected.
         */
        test(`should do nothing ${pArgument.description} and input name ${pArgument.input}`, () => {
          const dialogValues = new DialogValues();
          dialogValues.addValue(pArgument.input, pArgument.option);

          assert.doesNotThrow(() =>
            HandleChangelogFileInput["setExtraChangelogCorrectly"](dialogValues, pArgument.input)
          );

          let callCount = 0;
          if (pArgument.logMessage) {
            callCount = 1;
            Sinon.assert.calledWithExactly(errorLog, {
              message: pArgument.logMessage,
              notifyUser: true,
            });
          }
          Sinon.assert.callCount(errorLog, callCount);
        });
      });

    [
      {
        description: "absolute path",
        option: path.join(temporaryResourcePath, "absolute.xml"),
        expectedPath: path.join(temporaryResourcePath, "absolute.xml"),
      },
      {
        description: "relative path",
        option: "relative.xml",
        expectedPath: path.join(temporaryResourcePath, "relative.xml"),
      },
    ]
      .flatMap((pElement) =>
        namesOfInput.map((pNameOfInput) => ({
          ...pElement,
          input: pNameOfInput,
        }))
      )
      .forEach((pArgument) => {
        /**
         * Test that the method call works with correct absolute and relative paths.
         */
        test(`should work with ${pArgument.description} and input name ${pArgument.input}`, () => {
          // create the file before the tests, because we always assume it is there
          fs.writeFileSync(pArgument.expectedPath, "", "utf-8");

          const dialogValues = new DialogValues();
          dialogValues.addValue(PROPERTY_FILE, temporaryResourcePath);
          dialogValues.addValue(pArgument.input, pArgument.option);

          assert.doesNotThrow(() =>
            HandleChangelogFileInput["setExtraChangelogCorrectly"](dialogValues, pArgument.input)
          );

          // uri should be set
          assert.deepStrictEqual(dialogValues.uri, vscode.Uri.file(pArgument.expectedPath));

          // and the changelog should be saved
          Sinon.assert.calledOnce(saveChangelog);
          Sinon.assert.calledWith(saveChangelog, temporaryResourcePath, pArgument.expectedPath);
        });
      });
  });

  /**
   * Tests the method `generateItemsForChangelogSelection`.
   */
  suite("generateItemsForChangelogSelection", () => {
    const chooseChangelogOptions: vscode.QuickPickItem[] = [
      { label: "", kind: vscode.QuickPickItemKind.Separator },
      { label: HandleChangelogFileInput.CHOOSE_CHANGELOG_OPTION, iconPath: new vscode.ThemeIcon("files") },
    ];

    /**
     * Tests that the choose option will be always visible, even if there are no other values.
     */
    test("should generate items with no existing changelog or recently loaded changelog", () => {
      const result = HandleChangelogFileInput["generateItemsForChangelogSelection"](new DialogValues());

      assert.deepStrictEqual(result, chooseChangelogOptions);
    });

    /**
     * Tests that the choose option will have the configured changelog, when it is there.
     */
    test("should generate items with configured changelog in properties file", () => {
      const propertyFile = generatePropertiesFile(temporaryResourcePath, "changelogFile = foo");

      cacheHandler.removeCache();

      const dialogValues = new DialogValues();
      dialogValues.addValue(PROPERTY_FILE, propertyFile);

      assert.deepStrictEqual(HandleChangelogFileInput["generateItemsForChangelogSelection"](dialogValues), [
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

      cacheHandler.saveChangelog(propertyFile, path.join(temporaryResourcePath, "baz"));
      clock.tick(1);
      cacheHandler.saveChangelog(propertyFile, path.join(temporaryResourcePath, "bar"));
      clock.tick(1);
      cacheHandler.saveChangelog(propertyFile, path.join(temporaryResourcePath, "foo"));

      const result = HandleChangelogFileInput["generateItemsForChangelogSelection"](dialogValues);

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
 *
 * @param temporaryResourcePath - the temp path were the file should be saved
 * @param content - the content of the file
 * @returns the full path of the file
 */
function generatePropertiesFile(temporaryResourcePath: string, content: string): string {
  const propertyFile = path.join(temporaryResourcePath, `${randomUUID()}.liquibase.properties`);

  fs.writeFileSync(propertyFile, content, "utf-8");
  return propertyFile;
}
