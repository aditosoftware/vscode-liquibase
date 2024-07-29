import assert from "assert";
import {
  ContextCacheInformation,
  contextPreDialog,
  generateItemsForContextPreDialog,
  loadCacheForPropertyFile,
  loadContexts,
  loadContextsFromChangelog,
  saveSelectedContexts,
} from "../../handleContexts";
import { DialogValues, QuickPickItems } from "@aditosoftware/vscode-input";
import * as vscode from "vscode";
import { PROPERTY_FILE } from "../../input/ConnectionType";
import { TestUtils } from "./TestUtils";
import path from "path";
import * as fs from "fs";
import * as lbSettings from "../../handleLiquibaseSettings";
import Sinon from "sinon";
import { setCacheHandler } from "../../extension";
import { CacheHandler, ContextSelection } from "../../cache";
import { randomUUID } from "crypto";
import { ContextOptions } from "../../constants";
import { HandleChangelogFileInput } from "../../handleChangelogFileInput";
import { expect } from "chai";

/**
 * Tests the file handleContexts
 */
suite("handleContexts", () => {
  let tempDir: string;

  /**
   * Creates the temp dir and the necessary resources before all tests.
   */
  suiteSetup("create temp dir and resources", async function () {
    this.timeout(10_000);

    TestUtils.init();

    tempDir = TestUtils.createTempFolderForTests("contexts");
  });

  /**
   * Restores all sinon stubs.
   */
  teardown(() => {
    Sinon.restore();
  });

  /**
   * Tests the method `loadContextsFromChangelog`.
   */
  suite("loadContextsFromChangelog", () => {
    let dialogValues: DialogValues;

    /**
     * Creates the dialog values and writes an xml changelog.
     */
    setup("create dialog values", () => {
      const propertyFile = path.join(tempDir, "data.liquibase.properties");
      fs.writeFileSync(propertyFile, "changelogFile: changelog.xml", { encoding: "utf-8" });

      fs.writeFileSync(
        path.join(tempDir, "changelog.xml"),
        `<?xml version="1.0" encoding="UTF-8"?>

<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:pro="http://www.liquibase.org/xml/ns/pro"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd
                        http://www.liquibase.org/xml/ns/pro http://www.liquibase.org/xml/ns/pro/liquibase-pro-latest.xsd
                        ">

    <changeSet id="1" author="your.name" labels="foo-label" context="foo">
        <comment>example-comment</comment>
        <createTable tableName="person">
            <column name="id" type="int" autoIncrement="true">
                <constraints primaryKey="true" nullable="false" />
            </column>
            <column name="name" type="varchar(50)">
                <constraints nullable="false" />
            </column>
        </createTable>
    </changeSet>

    <changeSet id="2" author="your.name" labels="bar-label" context="bar">
        <comment>example-comment</comment>
        <createTable tableName="company">
            <column name="id" type="int" autoIncrement="true">
                <constraints primaryKey="true" nullable="false" />
            </column>
            <column name="name" type="varchar(50)">
                <constraints nullable="false" />
            </column>
        </createTable>
    </changeSet>

    <changeSet id="3" author="other.dev" labels="baz-label" context="baz">
        <comment>example-comment</comment>
        <addColumn tableName="person">
            <column name="country" type="varchar(2)" />
        </addColumn>
    </changeSet>
</databaseChangeLog>
`
      );

      Sinon.stub(lbSettings, "getLiquibaseFolder").returns(tempDir);

      dialogValues = new DialogValues();
      dialogValues.addValue(PROPERTY_FILE, propertyFile);
    });

    /**
     * Tests that it will work, when no dialog values are present.
     */
    test("should load nothing with no dialog values", (done) => {
      assertLoadContexts(new DialogValues(), [], done);
    });

    /**
     * Tests the loading of the contexts from the dialog values.
     */
    test("should load from dialog values", function (done) {
      this.timeout(4000);

      assertLoadContexts(dialogValues, [{ label: "bar" }, { label: "baz" }, { label: "foo" }], done);
    });

    /**
     * Tests that a changelog from the context menu can be read correctly.
     * This will read from an sql file.
     */
    test("should load from context menu", (done) => {
      const sqlChangelog = path.join(tempDir, "changelog.sql");

      fs.writeFileSync(
        sqlChangelog,
        `--liquibase formatted sql

--changeset your.name:1 labels:foo-label context:foo
--comment: example comment
create table person (
    id int primary key auto_increment not null,
    name varchar(50) not null
)
--rollback DROP TABLE person;

--changeset your.name:2 labels:bar-label context:bar
--comment: example comment
create table company (
    id int primary key auto_increment not null,
    name varchar(50) not null
)
--rollback DROP TABLE company;

--changeset other.dev:3 labels:baz-label context:baz
--comment: example comment
alter table person add column country varchar(2)
--rollback ALTER TABLE person DROP COLUMN country;`,
        { encoding: "utf-8" }
      );

      dialogValues.uri = vscode.Uri.file(sqlChangelog);
      assertLoadContexts(dialogValues, [{ label: "bar" }, { label: "baz" }, { label: "foo" }], done);
    });

    /**
     * Validates that a changelog without contexts can be handled normally.
     * This will read from a JSON file.
     */
    test("should load from context menu without contexts", (done) => {
      const jsonChangelog = path.join(tempDir, "changelog.json");

      fs.writeFileSync(
        jsonChangelog,
        JSON.stringify({
          databaseChangeLog: [
            {
              changeSet: {
                id: "1",
                author: "your.name",
                changes: [
                  {
                    createTable: {
                      tableName: "person",
                      columns: [
                        {
                          column: {
                            name: "id",
                            type: "int",
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        }),
        { encoding: "utf-8" }
      );

      dialogValues.uri = vscode.Uri.file(jsonChangelog);
      assertLoadContexts(dialogValues, [], done);
    });
  });

  /**
   * Tests the saving of the selected contexts
   */
  suite("saveSelectedContexts", () => {
    let saveMethod: Sinon.SinonSpy;

    setup(() => {
      const cacheLocation = path.join(tempDir, `${randomUUID()}.json`);
      const cacheHandler = new CacheHandler(cacheLocation);
      setCacheHandler(cacheHandler);

      saveMethod = Sinon.spy(cacheHandler, "saveContexts");
    });

    /**
     * Tests that nothing is saved, when there are no values from the dialog.
     */
    test("should not save when no values from dialog", () => {
      saveSelectedContexts(new DialogValues(), { connectionLocation: "", changelogLocation: "", contexts: {} });

      Sinon.assert.notCalled(saveMethod);
    });

    /**
     * Tests that nothing is saved, when no contextCacheInfo is there.
     */
    test("should not save when no contextCacheInfo is there", () => {
      const dialogValues = new DialogValues();
      dialogValues.addValue("context", "foo");

      saveSelectedContexts(dialogValues);

      Sinon.assert.notCalled(saveMethod);
    });

    /**
     * Tests that the saving works when all necessary information are given.
     */
    test("should save when necessary information is there", () => {
      const dialogValues = new DialogValues();
      dialogValues.addValue("context", ["c1", "c2"]);

      saveSelectedContexts(dialogValues, {
        connectionLocation: "foo",
        changelogLocation: "bar",
        contexts: { loadedContexts: ["c1", "c2", "c3"], selectedContexts: ["old", "values"] },
      });

      Sinon.assert.calledOnce(saveMethod);
      Sinon.assert.calledWith(saveMethod, "foo", "bar", {
        loadedContexts: ["c1", "c2", "c3"],
        selectedContexts: ["c1", "c2"],
      });
    });
  });

  /**
   * Tests the `loadContexts` method.
   */
  suite("loadContexts", () => {
    /**
     * Tests that the contexts are loaded from the changelog.
     */
    test("should load contexts from cache", async () => {
      const expected: QuickPickItems = {
        items: [
          { label: "bar", picked: false },
          { label: "baz", picked: true },
          { label: "foo", picked: true },
        ],
        additionalPlaceholder: "from recently loaded elements",
      };

      const dialogValues = new DialogValues();
      dialogValues.addValue(contextPreDialog, ContextOptions.USE_RECENTLY_LOADED);

      const cache: ContextSelection = {
        loadedContexts: ["bar", "baz", "foo"],
        selectedContexts: ["foo", "baz"],
      };

      const result = await loadContexts(dialogValues, cache);

      assert.deepStrictEqual(result, expected);
    });

    /**
     * Tests the the loading works, when it should be loaded from the changelog.
     */
    test("should load contexts from changelog", async () => {
      const expected: QuickPickItems = {
        items: [],
        additionalPlaceholder: "loaded from changelogs",
      };

      const dialogValues = new DialogValues();
      dialogValues.addValue(contextPreDialog, ContextOptions.LOAD_ALL_CONTEXT);

      const result = await loadContexts(dialogValues, {});

      assert.deepStrictEqual(result, expected);
    });

    /**
     * Tests that nothing will be loaded, when `ContextOptions.NO_CONTEXT` was given.
     */
    test("should not load contexts when no context should be used", async () => {
      const dialogValues = new DialogValues();
      dialogValues.addValue(contextPreDialog, ContextOptions.NO_CONTEXT);

      const result = await loadContexts(dialogValues, {});

      assert.deepStrictEqual(result, { items: [] });
    });

    /**
     * Tests that nothing will be loaded, when no result of the context pre dialog is there.
     */
    test("should not load contexts when no context pre dialog result is there", async () => {
      const result = await loadContexts(new DialogValues(), {});

      assert.deepStrictEqual(result, { items: [] });
    });
  });

  /**
   * Tests the method `generateItemsForContextPreDialog`.
   */
  suite("generateItemsForContextPreDialog", () => {
    const recentContexts: vscode.QuickPickItem = {
      label: ContextOptions.USE_RECENTLY_LOADED,
      detail: "baz, bar, foo",
      iconPath: new vscode.ThemeIcon("list-selection"),
    };
    const loadContexts: vscode.QuickPickItem = {
      label: ContextOptions.LOAD_ALL_CONTEXT,
      detail: "The loading might take a while.",
      iconPath: new vscode.ThemeIcon("sync"),
    };
    const noContexts: vscode.QuickPickItem = {
      label: ContextOptions.NO_CONTEXT,
      detail: "This will only execute any changeset that does not have any context",
      iconPath: new vscode.ThemeIcon("search-remove"),
    };

    /**
     * Tests that no recent elements will be shown, if there are no cache information.
     */
    test("should not include the recent element when no cache information is there", () => {
      assert.deepStrictEqual(generateItemsForContextPreDialog(), [loadContexts, noContexts]);
    });

    /**
     * Tests that no recent elements will be shown, if there are no `loadedContexts`.
     */
    test("should not include the recent element when no loaded contexts are there", () => {
      assert.deepStrictEqual(
        generateItemsForContextPreDialog({
          connectionLocation: "",
          changelogLocation: "",
          contexts: { selectedContexts: ["foo", "bar"] },
        }),
        [loadContexts, noContexts]
      );
    });
    /**
     * Tests that no recent elements will be shown, if there are empty `loadedContexts`.
     */
    test("should not include the recent element when empty loaded contexts are there", () => {
      assert.deepStrictEqual(
        generateItemsForContextPreDialog({
          connectionLocation: "",
          changelogLocation: "",
          contexts: { loadedContexts: [], selectedContexts: ["foo", "bar"] },
        }),
        [loadContexts, noContexts]
      );
    });

    /**
     * Tests that all items will be generated, when `loadedContexts` are there.
     */
    test("should generate all items", () => {
      assert.deepStrictEqual(
        generateItemsForContextPreDialog({
          connectionLocation: "",
          changelogLocation: "",
          contexts: { loadedContexts: ["baz", "bar", "foo"], selectedContexts: ["foo", "bar"] },
        }),
        [recentContexts, loadContexts, noContexts]
      );
    });
  });

  /**
   * Tests the method `loadCacheForPropertyFile`.
   */
  suite("loadCacheForPropertyFile", () => {
    /**
     * Tests that the cache will be loaded, when the changelog location was given as uri.
     */
    test("should load from uri", () => {
      const dialogValues = new DialogValues();
      dialogValues.addValue(PROPERTY_FILE, "foo");
      dialogValues.uri = vscode.Uri.file(".");

      const expected: ContextCacheInformation = {
        connectionLocation: "foo",
        changelogLocation: dialogValues.uri.fsPath,
        contexts: {},
      };

      const result = loadCacheForPropertyFile(dialogValues);
      assert.ok(result);
      assert.deepStrictEqual(result, expected);
    });

    /**
     * Tests that the values can be loaded, when connection and changelogs are given as inputs.
     */
    test("should load from input", () => {
      const expected: ContextCacheInformation = {
        connectionLocation: "foo",
        changelogLocation: "bar",
        contexts: {},
      };

      const dialogValues = new DialogValues();
      dialogValues.addValue(PROPERTY_FILE, "foo");
      dialogValues.addValue(HandleChangelogFileInput.CHANGELOG_NAME, "bar");

      const result = loadCacheForPropertyFile(dialogValues);
      assert.ok(result);
      assert.deepStrictEqual(result, expected);
    });

    /**
     * Tests that nothing will be loaded, when all values are missing
     */
    test("should not load when all values missing", () => {
      expect(loadCacheForPropertyFile(new DialogValues())).to.be.undefined;
    });

    /**
     * Tests that nothing will be loaded, when the changelog location is missing
     */
    test("should not load when changelog location is missing", () => {
      const dialogValues = new DialogValues();
      dialogValues.addValue(PROPERTY_FILE, "foo");

      expect(loadCacheForPropertyFile(dialogValues)).to.be.undefined;
    });
  });
});

/**
 * Asserts the loading of the contexts.
 *
 * @param dialogValues - the dialog values that should be passed to this method
 * @param expectedItems - the expected items that should be returned by the method
 * @param done - mochas done to indicate the end of the test
 */
function assertLoadContexts(dialogValues: DialogValues, expectedItems: vscode.QuickPickItem[], done: Mocha.Done): void {
  const expected: QuickPickItems = {
    additionalPlaceholder: "loaded from changelogs",
    items: expectedItems,
  };

  loadContextsFromChangelog(dialogValues)
    .then((result) => {
      assert.deepStrictEqual(result, expected);

      done();
    })
    .catch(done);
}
