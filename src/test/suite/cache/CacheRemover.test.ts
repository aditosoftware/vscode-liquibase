import path from "path";

import * as fs from "fs";
import { CacheHandler, CacheRemover } from "../../../cache/";
import Sinon from "sinon";
import { Logger } from "@aditosoftware/vscode-logging";
import assert from "assert";
import { ConfirmationDialog, DialogValues, QuickPick } from "@aditosoftware/vscode-input";
import { PROPERTY_FILE } from "../../../input/ConnectionType";
import { TestUtils } from "../TestUtils";
import { RemoveCacheOptions } from "../../../constants";
import * as configReader from "../../../configuration/handle/readConfiguration";

/**
 * Tests the cache remover.
 */
suite("CacheRemover tests", () => {
  /**
   * Temporary folder for writing cache files.
   */
  const temporaryResourcePath = TestUtils.createTempFolderForTests("cache", "remove");

  let infoLog: Sinon.SinonStub;
  let debugLog: Sinon.SinonStub;

  /**
   * Initialize the logger for the tests.
   */
  suiteSetup("init logger", () => {
    TestUtils.initLoggerForTests();
  });

  /**
   * Init some stubs.
   */
  setup("init stubs", () => {
    infoLog = Sinon.stub(Logger.getLogger(), "info");
    debugLog = Sinon.stub(Logger.getLogger(), "debug");
  });

  teardown("restore stubs", () => {
    infoLog.restore();
    debugLog.restore();
  });

  /**
   * Tests that the CacheRemover should work, when no cache is there.
   */
  test("should work with not existing cache file", (done) => {
    const cacheLocation = path.join(temporaryResourcePath, "notExisting.json");

    assert.ok(!fs.existsSync(cacheLocation), `Path ${cacheLocation} should not exist`);

    const cacheHandler = new CacheHandler(cacheLocation);
    const cacheRemover = new CacheRemover(cacheHandler);

    cacheRemover
      .removeFromCache()
      .then(() => {
        Sinon.assert.calledOnce(infoLog);

        done();
      })
      .catch((error) => done(error));
  });

  /**
   * Tests that the CacheRemover should work, when only an empty cache is there.
   */
  test("should work with empty cache file", (done) => {
    const cacheLocation = path.join(temporaryResourcePath, "empty.json");

    fs.writeFileSync(cacheLocation, "{}");
    assert.ok(fs.existsSync(cacheLocation), `Path ${cacheLocation} should exist`);

    const cacheHandler = new CacheHandler(cacheLocation);
    const cacheRemover = new CacheRemover(cacheHandler);

    cacheRemover
      .removeFromCache()
      .then(() => {
        Sinon.assert.calledOnce(infoLog);

        done();
      })
      .catch((error) => done(error));
  });

  /**
   * Tests various scenarios with a filled cache.
   */
  suite("filled cache", () => {
    const cacheLocation = path.join(temporaryResourcePath, "filled.json");

    let cacheRemover: CacheRemover;

    let showDialogQuickPick: Sinon.SinonStub;
    let showDialogConfirmationDialog: Sinon.SinonStub;

    /**
     * Fills the cache and set ups the cache remover before each test.
     * Also create the necessary stubs.
     */
    setup("fill cache and create stubs", () => {
      fs.writeFileSync(
        cacheLocation,
        JSON.stringify({
          "path/to/connection/one.liquibase.properties": { contexts: ["a", "b"] },
          "path/to/connection/two.liquibase.properties": { contexts: ["c", "d"] },
          "path/to/connection/three.liquibase.properties": { contexts: ["e", "f"] },
          "path/to/connection/four.liquibase.properties": { contexts: ["g", "h"] },
        })
      );
      assert.ok(fs.existsSync(cacheLocation), `Path ${cacheLocation} should exist`);

      const cacheHandler = new CacheHandler(cacheLocation);
      cacheRemover = new CacheRemover(cacheHandler);

      // set some dummy configurations
      cacheRemover.configuration = {
        one: "path/to/connection/one.liquibase.properties",
        two: "path/to/connection/two.liquibase.properties",
        three: "path/to/connection/three.liquibase.properties",
        four: "path/to/connection/four.liquibase.properties",
      };

      Sinon.stub(configReader, "readConfiguration").resolves({
        one: "path/to/connection/one.liquibase.properties",
        two: "path/to/connection/two.liquibase.properties",
        three: "path/to/connection/three.liquibase.properties",
        four: "path/to/connection/four.liquibase.properties",
      });

      // init the stubs
      showDialogQuickPick = Sinon.stub(QuickPick.prototype, "showDialog").callThrough();

      showDialogConfirmationDialog = Sinon.stub(ConfirmationDialog.prototype, "showDialog").callThrough();
    });

    /**
     * Restore the stubs after each test.
     */
    teardown("restore stubs", () => {
      Sinon.restore();
    });

    /**
     * Tests that the generation of the remove options works correctly.
     * This method is explicitly tested, because there is no easy way to test it correctly in the program flow.
     */
    test("should generateRemoveOptions", () => {
      const result = cacheRemover["generateRemoveOptions"]();

      assert.deepStrictEqual(
        [
          {
            label: "Invalidate every recently loaded value",
            detail: "This will remove the whole file.",
          },
          {
            label: "Remove one or more connections",
            detail: "This will remove everything that is saved as recently loaded values for the selected connections.",
          },
        ],
        result
      );
    });
    /**
     * Tests that the generation of properties for the cache removing works correctly.
     * This method is explicitly tested, because there is no easy way to test it correctly in the program flow.
     */
    test("should generatePropertiesForCacheRemoval", async () => {
      const result = await cacheRemover["generatePropertiesForCacheRemoval"]({
        "path/to/connection/one.liquibase.properties": {
          contexts: ["a", "b"],
        },
        "path/to/connection/four.liquibase.properties": {
          contexts: ["x", "y", "z"],
        },
      });

      assert.deepStrictEqual(
        [
          {
            label: "four",
            detail: "path/to/connection/four.liquibase.properties",
          },
          { label: "one", detail: "path/to/connection/one.liquibase.properties" },
        ],
        result
      );
    });

    [
      {
        name: "no dialog values",
        expected: "",
        dialogValues: () => {
          const dialogValues = new DialogValues();

          return dialogValues;
        },
      },
      {
        name: "empty remove option",
        expected: "",
        dialogValues: () => {
          const dialogValues = new DialogValues();
          dialogValues.addValue(CacheRemover["removeOption"], []);

          return dialogValues;
        },
      },
      {
        name: "invalid remove option",
        expected: "",
        dialogValues: () => {
          const dialogValues = new DialogValues();
          dialogValues.addValue(CacheRemover["removeOption"], "invalid option");

          return dialogValues;
        },
      },
      {
        name: "whole cache remove option",
        expected: "This will remove the whole file.",
        dialogValues: () => {
          const dialogValues = new DialogValues();
          dialogValues.addValue(CacheRemover["removeOption"], RemoveCacheOptions.WHOLE_CACHE);

          return dialogValues;
        },
      },
      {
        name: "connection remove option",
        expected:
          "This will remove everything that is saved as recently loaded values for the selected connections.\n - one\n - four",
        dialogValues: () => {
          const dialogValues = new DialogValues();
          dialogValues.addValue(CacheRemover["removeOption"], RemoveCacheOptions.REMOVE_CONNECTION);
          dialogValues.addValue(PROPERTY_FILE, ["one", "four"]);

          return dialogValues;
        },
      },
    ].forEach((pArgument) => {
      /**
       * Tests that the generation of the detail message for the confirm dialog works correctly.
       * This method is explicitly tested, because there is no easy way to test it correctly in the program flow.
       */
      test(`should generateDetailMessageForConfirmation ${pArgument.name}`, () => {
        const result = cacheRemover["generateDetailMessageForConfirmation"](pArgument.dialogValues());

        assert.deepStrictEqual(pArgument.expected, result);
      });
    });

    /**
     * Tests that the cancelling of the dialog works.
     */
    test("should work with filled cache and cancelled dialog", (done) => {
      showDialogQuickPick.resolves(undefined);

      cacheRemover
        .removeFromCache()
        .then(() => {
          Sinon.assert.calledOnce(showDialogQuickPick);

          Sinon.assert.calledTwice(debugLog);

          assertCacheLocationUnchanged(cacheLocation);

          done();
        })
        .catch((error) => done(error));
    });

    /**
     * Tests that it will work with a filled cache and a not filled remove option.
     */
    test("should work with filled cache and not selected remove option", (done) => {
      showDialogQuickPick.resolves([]);
      showDialogConfirmationDialog.resolves(true);

      cacheRemover
        .removeFromCache()
        .then(() => {
          Sinon.assert.calledOnce(showDialogQuickPick);
          Sinon.assert.calledOnce(showDialogConfirmationDialog);

          assertCacheLocationUnchanged(cacheLocation);

          done();
        })
        .catch((error) => done(error));
    });

    /**
     * Tests that it will work with a filled cache and a not defined use case.
     */
    test("should work with filled cache and not defined use case", (done) => {
      showDialogQuickPick.resolves(["no_valid_use_case"]);
      showDialogConfirmationDialog.resolves(true);

      cacheRemover
        .removeFromCache()
        .then(() => {
          Sinon.assert.calledTwice(showDialogQuickPick);
          Sinon.assert.calledOnce(showDialogConfirmationDialog);

          Sinon.assert.calledWith(debugLog, { message: "Not defined use case no_valid_use_case" });

          assertCacheLocationUnchanged(cacheLocation);

          done();
        })
        .catch((error) => done(error));
    });

    /**
     * Tests that the removing of the whole cache works.
     */
    test("should work with remove option whole cache", (done) => {
      showDialogQuickPick.resolves([RemoveCacheOptions.WHOLE_CACHE]);
      showDialogConfirmationDialog.resolves(true);

      cacheRemover
        .removeFromCache()
        .then(() => {
          Sinon.assert.calledOnce(showDialogQuickPick);
          Sinon.assert.calledOnce(showDialogConfirmationDialog);

          assert.ok(!fs.existsSync(cacheLocation), `Cache file removed ${cacheLocation}`);

          done();
        })
        .catch((error) => done(error));
    });

    /**
     * Tests that the removing of just a few connections works.
     */
    test("should work with remove option connection", (done) => {
      showDialogQuickPick
        .onFirstCall()
        .resolves([RemoveCacheOptions.REMOVE_CONNECTION])
        .onSecondCall()
        .resolves(["one", "three"]);
      showDialogConfirmationDialog.resolves(true);

      cacheRemover
        .removeFromCache()
        .then(() => {
          Sinon.assert.calledTwice(showDialogQuickPick);
          Sinon.assert.calledOnce(showDialogConfirmationDialog);

          assert.ok(fs.existsSync(cacheLocation), `Cache file should be there ${cacheLocation}`);

          const result = JSON.parse(fs.readFileSync(cacheLocation, { encoding: "utf-8" }));
          const keys = Object.keys(result);

          assert.deepStrictEqual(
            ["path/to/connection/two.liquibase.properties", "path/to/connection/four.liquibase.properties"],
            keys
          );

          Sinon.assert.callCount(debugLog, 0);

          done();
        })
        .catch((error) => done(error));
    });
  });
});

/**
 * Asserts that the cache location was not changed
 *
 * @param cacheLocation - the cache location
 */
function assertCacheLocationUnchanged(cacheLocation: string): void {
  const keys = Object.keys(JSON.parse(fs.readFileSync(cacheLocation, { encoding: "utf-8" })));
  assert.strictEqual(4, keys.length, `file should not have changed: ${keys}`);
}
