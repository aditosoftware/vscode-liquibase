import assert from "assert";
import path from "path";
import fs from "fs";
import { Cache, CacheHandler } from "../../../cache/";
import Sinon from "sinon";
import { Logger } from "@aditosoftware/vscode-logging";
import { TestUtils } from "../TestUtils";

/**
 * Tests various methods from the CacheHandler
 */
suite("CacheHandler tests", () => {
  /**
   * Temporary folder for writing cache files.
   */
  const temporaryResourcePath = TestUtils.createTempFolderForTests("cache", "handle");

  /**
   * Initialize the logger for the tests.
   */
  suiteSetup("init logger", () => {
    TestUtils.initLoggerForTests();
  });

  /**
   * Tests the reading of the cache and contexts.
   */
  suite("readCache and readContext", () => {
    const baseResourcePath = path.join(TestUtils.basicPathToOut, "..", "src", "test", "resources", "cache");

    const firstConnectionLocation = "/path/to/project/data/liquibase/data.liquibase.properties";
    const secondConnectionLocation = "/path/to/project/data/liquibase/system.liquibase.properties";

    /**
     * Tests the reading of a not existent file.
     */
    suite("should read not existing file", () => {
      const notExistentPath = path.join(baseResourcePath, "notExistent.json");
      const cacheHandler = new CacheHandler(notExistentPath);

      /**
       * Validate before the suite that the file does not exist.
       */
      suiteSetup("validate file path", () => {
        assert.ok(!fs.existsSync(notExistentPath), `Path ${notExistentPath} should not exist`);
      });

      /**
       * Tests that reading a file from a not existent location works.
       */
      test("should read cache with not existing file location", () => {
        assert.deepStrictEqual({}, cacheHandler.readCache());
      });

      /**
       * Tests that reading contexts from a not existing file does work.
       */
      test(`should read contexts  with not existing file location`, () => {
        assert.deepStrictEqual([], cacheHandler.readContexts(firstConnectionLocation));
      });
    });

    /**
     * Tests the reading of an existing empty file.
     */
    suite("should read empty file", () => {
      const emptyFile = path.join(baseResourcePath, "empty.json");
      const cacheHandler = new CacheHandler(emptyFile);

      /**
       * Validate before the suite that the file does exist.
       */
      suiteSetup("validate file path", () => {
        assert.ok(fs.existsSync(emptyFile), `Path ${emptyFile} should exist`);
      });

      /**
       * Tests that reading the cache of an empty file works.
       */
      test("should read cache of empty file", () => {
        assert.deepStrictEqual({}, cacheHandler.readCache());
      });

      /**
       * Tests that reading the contexts an empty file works.
       */
      test("should read contexts of empty file", () => {
        assert.deepStrictEqual([], cacheHandler.readContexts(firstConnectionLocation));
      });
    });

    /**
     * Tests that reading an existing file with elements works.
     */
    suite("should read filled file", () => {
      const cacheFile = path.join(baseResourcePath, "cache.json");
      const cacheHandler = new CacheHandler(cacheFile);

      /**
       * Validate before the suite that the file does exist.
       */
      suiteSetup("validate file path", () => {
        assert.ok(fs.existsSync(cacheFile), `Path ${cacheFile} should exist`);
      });

      /**
       * Tests that reading a file with content works.
       * You can also see at this point, that the contexts are not ordered.
       */
      test("should read cache file", () => {
        const expected: Cache = {
          "/path/to/project/data/liquibase/data.liquibase.properties": {
            contexts: ["prod", "qs", "dev"],
          },
          "/path/to/project/data/liquibase/system.liquibase.properties": {
            contexts: ["c3", "c1", "c5", "c2", "c6", "c4"],
          },
        };

        assert.deepStrictEqual(expected, cacheHandler.readCache());
      });

      [
        {
          expected: ["dev", "prod", "qs"],
          file: firstConnectionLocation,
        },
        { expected: ["c1", "c2", "c3", "c4", "c5", "c6"], file: secondConnectionLocation },
        { expected: [], file: "noConnectionLocation" },
      ].forEach((pElement) => {
        /**
         * Test that reading the contexts works. It also checks that the contexts are ordered.
         */
        test(`should read contexts of ${pElement.file}`, () => {
          assert.deepStrictEqual(pElement.expected, cacheHandler.readContexts(pElement.file));
        });
      });
    });
  });

  /**
   * Tests the saving of contexts to the cache.
   */
  suite("saveContexts", () => {
    const defaultCache = {
      myCacheLocation: {
        contexts: ["a", "b"],
      },
    };

    /**
     * Tests that writing to a not existing file works.
     */
    test("should write to not existing cache file", () => {
      const cacheLocation = path.join(temporaryResourcePath, "notExisting.json");

      assert.ok(!fs.existsSync(cacheLocation), `Path ${cacheLocation} should not exist`);

      assertSaveOfCache(defaultCache, cacheLocation);
    });

    /**
     * Tests that writing to an empty file works.
     */
    test("should write to empty cache file", () => {
      const cacheLocation = path.join(temporaryResourcePath, "empty.json");

      // create the empty file
      fs.writeFileSync(cacheLocation, "{}");

      assert.ok(fs.existsSync(cacheLocation), `Path ${cacheLocation} should exist`);

      assertSaveOfCache(defaultCache, cacheLocation);
    });

    /**
     * Tests that writing to a file filled with other cache values works.
     */
    test("should write to cache file filled with other cache values", () => {
      const cacheLocation = path.join(temporaryResourcePath, "filledWithOtherCaches.json");

      // create the file with some values
      fs.writeFileSync(
        cacheLocation,
        JSON.stringify({
          myOtherCacheLocation: {
            contexts: ["x", "y", "z"],
          },
        })
      );

      assert.ok(fs.existsSync(cacheLocation), `Path ${cacheLocation} should exist`);

      assertSaveOfCache(
        {
          myOtherCacheLocation: {
            contexts: ["x", "y", "z"],
          },
          ...defaultCache,
        },
        cacheLocation
      );
    });

    /**
     * Tests that writing to a file filled with the same cache values works.
     * Validates that the old results are thrown away and the new values are used.
     */
    test("should write to cache file filled with same cache values", () => {
      const cacheLocation = path.join(temporaryResourcePath, "filledWithSameCache.json");

      // create the file with some values
      fs.writeFileSync(
        cacheLocation,
        JSON.stringify({
          myCacheLocation: {
            contexts: ["x", "y", "z"],
          },
        })
      );

      assert.ok(fs.existsSync(cacheLocation), `Path ${cacheLocation} should exist`);

      assertSaveOfCache(defaultCache, cacheLocation);
    });
  });

  /**
   * Tests that the removing of the whole cache file works.
   */
  suite("removeCache", () => {
    /**
     * A stub for `logger.info`.
     */
    let infoStub: Sinon.SinonStub;

    /**
     * Init all stubs.
     */
    setup("init stubs", () => {
      infoStub = Sinon.stub(Logger.getLogger(), "info");
    });

    /**
     * Restore all stubs.
     */
    teardown("restore stubs", () => {
      infoStub.restore();
    });

    /**
     * Tests that there will be no error, if a not existing cache file would be removed.
     */
    test("should work with not existent cache file", () => {
      const cacheLocation = path.join(temporaryResourcePath, "notExistentForRemoving.json");

      assert.ok(!fs.existsSync(cacheLocation), `Path ${cacheLocation} should not exist`);

      const cacheHandler = new CacheHandler(cacheLocation);

      assert.doesNotThrow(() => cacheHandler.removeCache());
    });

    /**
     * Tests that the removing of the files works and the uses is correctly notified.
     */
    test("should remove file", () => {
      const cacheLocation = path.join(temporaryResourcePath, "removeTest.json");

      // create the cache location
      fs.writeFileSync(cacheLocation, "{}");

      assert.ok(fs.existsSync(cacheLocation), `Path ${cacheLocation} should not exist`);

      const cacheHandler = new CacheHandler(cacheLocation);
      cacheHandler.removeCache();

      // test that the file was removed
      assert.ok(!fs.existsSync(cacheLocation), `Path ${cacheLocation} should no longer not exist`);

      // assert the message was logged
      Sinon.assert.calledOnceWithExactly(infoStub, {
        message: "Successfully removed all recently loaded elements.",
        notifyUser: true,
      });
    });
  });

  /**
   * Tests that the removing of some element works.
   */
  suite("removeConnectionsFromCache", () => {
    const cacheLocation = path.join(temporaryResourcePath, "connectionRemove.json");

    const c1 = { c1: { contexts: ["a", "b", "c"] } };
    const c2 = { c2: { contexts: ["a", "b", "c"] } };
    const c3 = { c3: { contexts: ["a", "b", "c"] } };
    const c4 = { c4: { contexts: ["a", "b", "c"] } };
    const c5 = { c5: { contexts: ["a", "b", "c"] } };
    const c6 = { c6: { contexts: ["a", "b", "c"] } };

    /**
     * Creates the cache before each test.
     */
    setup("create cache", () => {
      fs.writeFileSync(
        cacheLocation,
        JSON.stringify({
          ...c1,
          ...c2,
          ...c3,
          ...c4,
          ...c5,
          ...c6,
        })
      );
    });

    /**
     * Tests that an empty array will remove nothing.
     */
    test("should work with empty array", () => {
      assertRemoveConnectionOfCache(
        {
          ...c1,
          ...c2,
          ...c3,
          ...c4,
          ...c5,
          ...c6,
        },
        cacheLocation,
        []
      );
    });

    /**
     * Tests that an not existing connection will remove nothing and will still work
     */
    test("should work with not existing connection", () => {
      assertRemoveConnectionOfCache(
        {
          ...c1,
          ...c2,
          ...c3,
          ...c4,
          ...c5,
          ...c6,
        },
        cacheLocation,
        ["c7"]
      );
    });

    /**
     * Tests that a single connection (`c3`) will be removed correctly.
     */
    test("should work with single connection", () => {
      assertRemoveConnectionOfCache(
        {
          ...c1,
          ...c2,
          ...c4,
          ...c5,
          ...c6,
        },
        cacheLocation,
        ["c3"]
      );
    });

    /**
     * Tests that multiple connections will be removed correctly.
     */
    test("should work with multiple connections", () => {
      assertRemoveConnectionOfCache(
        {
          ...c1,
          ...c4,
          ...c6,
        },
        cacheLocation,
        ["c2", "c3", "c5"]
      );
    });
  });
});

/**
 * Asserts the `saveContext` method works as expected.
 * This method will create a `CacheHandler`, call `saveContext`
 * and reads the created file and compares it with the `expected` cache file.
 *
 * @param expected - the expected values from the cache as json object
 * @param cacheLocation - the location where the cache should be read
 */
function assertSaveOfCache(expected: object, cacheLocation: string): void {
  const cacheHandler = new CacheHandler(cacheLocation);
  cacheHandler.saveContexts("myCacheLocation", ["a", "b"]);

  assertCacheContent(expected, cacheLocation);
}

/**
 * Asserts the `removeConnectionsFromCache` method works as expected.
 * This method will create a `CacheHandler`, call `removeConnectionsFromCache`
 * and reads the created file and compares it with the `expected` cache file.
 *
 * @param expected - the expected values from the cache as json object
 * @param cacheLocation - the location where the cache should be read
 * @param connectionsToRemove - the connections that should be removed
 */
function assertRemoveConnectionOfCache(expected: object, cacheLocation: string, connectionsToRemove: string[]): void {
  const cacheHandler = new CacheHandler(cacheLocation);

  cacheHandler.removeConnectionsFromCache(connectionsToRemove);

  assertCacheContent(expected, cacheLocation);
}

/**
 * Asserts the content of the cache.
 *
 * @param expected - the expected values from the cache as json object
 * @param cacheLocation - the location where the cache should be read
 */
function assertCacheContent(expected: object, cacheLocation: string): void {
  const result = JSON.parse(fs.readFileSync(cacheLocation, { encoding: "utf-8" }));

  assert.deepStrictEqual(expected, result);
}
