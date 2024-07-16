import assert from "assert";
import { loadContextsFromChangelog } from "../../handleContexts";
import { DialogValues, QuickPickItems } from "@aditosoftware/vscode-input";
import * as vscode from "vscode";
import { PROPERTY_FILE } from "../../input/ConnectionType";
import { TestUtils } from "./TestUtils";
import path from "path";
import * as fs from "fs";
import * as lbSettings from "../../handleLiquibaseSettings";
import Sinon from "sinon";

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
     * Restores all sinon stubs.
     */
    teardown(() => {
      Sinon.restore();
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
    additionalTitle: "loaded from changelogs",
    items: expectedItems,
  };

  loadContextsFromChangelog(dialogValues)
    .then((result) => {
      assert.deepStrictEqual(result, expected);

      done();
    })
    .catch(done);
}
