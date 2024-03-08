import path from "path";
import { createTempFolderForTests, initLoggerForTests } from "../testUtils";
import * as fs from "fs";
import { CacheHandler, CacheRemover } from "../../../cache/";
import Sinon from "sinon";
import { Logger } from "@aditosoftware/vscode-logging";
import assert from "assert";
import { QuickPick, initializeLogger } from "@aditosoftware/vscode-input";

suite("CacheRemover tests", () => {
  /**
   * Temporary folder for writing cache files.
   */
  const temporaryResourcePath = createTempFolderForTests("cache", "remove");

  let infoLog: Sinon.SinonStub;
  let debugLog: Sinon.SinonStub;

  /**
   * Initialize the logger for the tests.
   */
  suiteSetup("init logger", () => {
    initLoggerForTests();
    initializeLogger(Logger.getLogger());
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

  // TODO
  // empty / not existing cache file
  // cache file with content
  // dialog ohne Ergebnis
  // dialog mit ergebnis

  /**
   * Tests that the CacheRemover should work, when no cache is there.
   */
  test("should work with not existing cache file", (done) => {
    const cacheLocation = path.join(temporaryResourcePath, "notExisting.json");

    assert.ok(!fs.existsSync(cacheLocation), `Path ${cacheLocation} should not exist`);

    const cacheHandler = new CacheHandler(cacheLocation);
    const cacheRemover = new CacheRemover(cacheHandler);

    cacheRemover.removeFromCache().then(() => {
      Sinon.assert.calledOnce(infoLog);

      done();
    });
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

    cacheRemover.removeFromCache().then(() => {
      Sinon.assert.calledOnce(infoLog);

      done();
    });
  });

  test("should work with filled cache and cancelled dialog", (done) => {
    const showDialogQuickPick = Sinon.stub(QuickPick.prototype, "showDialog");

    showDialogQuickPick.resolves(undefined);

    const cacheLocation = path.join(temporaryResourcePath, "filled.json");

    fs.writeFileSync(
      cacheLocation,
      JSON.stringify({
        c1: { contexts: ["a", "b"] },
        c2: { contexts: ["c", "d"] },
        c3: { contexts: ["e", "f"] },
        c4: { contexts: ["g", "h"] },
      })
    );
    assert.ok(fs.existsSync(cacheLocation), `Path ${cacheLocation} should exist`);

    const cacheHandler = new CacheHandler(cacheLocation);
    const cacheRemover = new CacheRemover(cacheHandler);

    cacheRemover.removeFromCache().then(() => {
      Sinon.assert.calledOnce(showDialogQuickPick);

      /**
       * TODO mehr machen!
       * TODO argumente prüfen
       * TODO alle drei erfolgreich durchlaufen lassen
       * TODO andere prüfungen!
       */

      // const args = showDialogQuickPick.args[0];

      // assert.deepStrictEqual([], args);

      // Sinon.assert.calledOnce(showDialogQuickPick); // Sinon.assert.calledOnceWithExactly(showDialogQuickPick, []);

      Sinon.assert.calledOnce(debugLog);

      done();
    });
  });
});
