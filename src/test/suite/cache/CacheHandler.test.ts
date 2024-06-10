import assert from "assert";
import path from "path";
import fs from "fs";
import { Cache, CacheHandler } from "../../../cache/";
import Sinon from "sinon";
import { Logger } from "@aditosoftware/vscode-logging";
import { TestUtils } from "../TestUtils";
import { randomUUID } from "crypto";

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
            changelogs: [],
          },
          "/path/to/project/data/liquibase/system.liquibase.properties": {
            contexts: ["c3", "c1", "c5", "c2", "c6", "c4"],
            changelogs: [],
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
   * Tests the reading of the changelogs.
   */
  suite("readChangelogs", () => {
    /**
     * Tests that the reading of an empty cache works.
     */
    test("should read empty cache", () => {
      const cacheLocation = path.join(temporaryResourcePath, `${randomUUID()}.json`);
      writeCacheToLocation({}, cacheLocation);

      const cacheHandler = new CacheHandler(cacheLocation);

      assert.deepStrictEqual(cacheHandler.readChangelogs("myCacheLocation"), []);
    });

    /**
     * Test that a cache with no changelogs inside can be read correctly
     */
    test("should read cache without changelogs", () => {
      const cacheLocation = path.join(temporaryResourcePath, `${randomUUID()}.json`);

      // this cache has on purpose only contexts, therefore a cast to unknown is necessary
      writeCacheToLocation(
        {
          myCacheLocation: {
            contexts: [],
          },
        } as unknown as Cache,
        cacheLocation
      );

      const cacheHandler = new CacheHandler(cacheLocation);

      assert.deepStrictEqual(cacheHandler.readChangelogs("myCacheLocation"), []);
    });

    /**
     * Tests that the cache can be read and fill follow the last used order.
     */
    test("should read cache with changelogs", () => {
      const cache: Cache = {
        myCacheLocation: {
          contexts: [],
          changelogs: [
            { path: "a", lastUsed: 1 },
            { path: "s", lastUsed: 6 },
            { path: "d", lastUsed: 4 },
            { path: "f", lastUsed: 5 },
            { path: "g", lastUsed: 3 },
            { path: "h", lastUsed: 2 },
          ],
        },
      };
      const cacheLocation = path.join(temporaryResourcePath, `${randomUUID()}.json`);

      writeCacheToLocation(cache, cacheLocation);

      const cacheHandler = new CacheHandler(cacheLocation);

      assert.deepStrictEqual(cacheHandler.readChangelogs("myCacheLocation"), ["s", "f", "d", "g", "h", "a"]);
    });
  });

  /**
   * Tests the saving of contexts to the cache.
   */
  suite("saveContexts", () => {
    const defaultCache: Cache = {
      myCacheLocation: {
        contexts: ["a", "b"],
        changelogs: [],
      },
    };

    /**
     * Tests that writing to a not existing file works.
     */
    test("should write to not existing cache file", () => {
      const cacheLocation = path.join(temporaryResourcePath, "notExisting.json");

      assert.ok(!fs.existsSync(cacheLocation), `Path ${cacheLocation} should not exist`);

      assertSaveOfContextToCache(defaultCache, cacheLocation);
    });

    /**
     * Tests that writing to an empty file works.
     */
    test("should write to empty cache file", () => {
      const cacheLocation = path.join(temporaryResourcePath, "empty.json");

      // create the empty file
      writeCacheToLocation({}, cacheLocation);

      assert.ok(fs.existsSync(cacheLocation), `Path ${cacheLocation} should exist`);

      assertSaveOfContextToCache(defaultCache, cacheLocation);
    });

    /**
     * Tests that writing to a file filled with other cache values works.
     */
    test("should write to cache file filled with other cache values", () => {
      const cacheLocation = path.join(temporaryResourcePath, "filledWithOtherCaches.json");

      // create the file with some values
      writeCacheToLocation(
        {
          myOtherCacheLocation: {
            contexts: ["x", "y", "z"],
            changelogs: [],
          },
        },
        cacheLocation
      );

      assert.ok(fs.existsSync(cacheLocation), `Path ${cacheLocation} should exist`);

      assertSaveOfContextToCache(
        {
          myOtherCacheLocation: {
            contexts: ["x", "y", "z"],
            changelogs: [],
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
      writeCacheToLocation(
        {
          myCacheLocation: {
            contexts: ["x", "y", "z"],
            changelogs: [],
          },
        },
        cacheLocation
      );

      assert.ok(fs.existsSync(cacheLocation), `Path ${cacheLocation} should exist`);

      assertSaveOfContextToCache(defaultCache, cacheLocation);
    });
  });

  /**
   * Tests the method `saveChangelog`.
   */
  suite("saveChangelog", () => {
    let clock: sinon.SinonFakeTimers;

    /**
     * Use a fake timer for the timestamps.
     */
    suiteSetup(() => {
      clock = Sinon.useFakeTimers({ now: 10 });
    });

    /**
     * Restore the fake timer.
     */
    suiteTeardown(() => {
      clock.restore();
    });

    /**
     * Tests that the changelogs can be written correctly to the cache.
     */
    test("should write changelog to cache", () => {
      const expectedCache: Cache = {
        myCacheLocation: {
          contexts: [],
          changelogs: [{ path: "lorem", lastUsed: 10 }],
        },
      };

      const cacheLocation = path.join(temporaryResourcePath, `${randomUUID()}.json`);

      assertSaveOfChangelogToCache(expectedCache, cacheLocation);
    });

    /**
     * Tests that an element with already existing cache entry will have their time adjusted.
     */
    test("should update timestamp for existing cache entry", () => {
      const expectedCache: Cache = {
        myCacheLocation: {
          contexts: [],
          changelogs: [{ path: "lorem", lastUsed: 10 }],
        },
      };

      const cacheLocation = path.join(temporaryResourcePath, `${randomUUID()}.json`);

      writeCacheToLocation(
        {
          myCacheLocation: {
            contexts: [],
            changelogs: [{ path: "lorem", lastUsed: 4 }],
          },
        },
        cacheLocation
      );

      assertSaveOfChangelogToCache(expectedCache, cacheLocation);
    });

    /**
     * Tests that five elements can be normally added to the changelog elements.
     */
    test("should write fifth changelog element", () => {
      const expectedCache: Cache = {
        myCacheLocation: {
          contexts: [],
          changelogs: [
            { path: "lorem", lastUsed: 10 },
            { path: "foobar", lastUsed: 4 },
            { path: "baz", lastUsed: 3 },
            { path: "bar", lastUsed: 2 },
            { path: "foo", lastUsed: 1 },
          ],
        },
      };

      const cacheLocation = path.join(temporaryResourcePath, `${randomUUID()}.json`);

      writeCacheToLocation(
        {
          myCacheLocation: {
            contexts: [],
            changelogs: [
              { path: "foo", lastUsed: 1 },
              { path: "bar", lastUsed: 2 },
              { path: "baz", lastUsed: 3 },
              { path: "foobar", lastUsed: 4 },
            ],
          },
        },
        cacheLocation
      );

      assertSaveOfChangelogToCache(expectedCache, cacheLocation);
    });

    /**
     * Tests that a sixth changelog element will result in removing the element with the lowest last used.
     */
    test("should write sixth changelog element", () => {
      const expectedCache: Cache = {
        myCacheLocation: {
          contexts: [],
          changelogs: [
            { path: "lorem", lastUsed: 10 },
            { path: "bar-baz", lastUsed: 5 },
            { path: "foobar", lastUsed: 4 },
            { path: "baz", lastUsed: 3 },
            { path: "bar", lastUsed: 2 },
          ],
        },
      };

      const cacheLocation = path.join(temporaryResourcePath, `${randomUUID()}.json`);

      writeCacheToLocation(
        {
          myCacheLocation: {
            contexts: [],
            changelogs: [
              { path: "bar", lastUsed: 2 },
              { path: "foobar", lastUsed: 4 },
              { path: "baz", lastUsed: 3 },
              { path: "foo", lastUsed: 1 },
              { path: "bar-baz", lastUsed: 5 },
            ],
          },
        },
        cacheLocation
      );

      assertSaveOfChangelogToCache(expectedCache, cacheLocation);
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
      writeCacheToLocation({}, cacheLocation);

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

    const c1: Cache = { c1: { contexts: ["a", "b", "c"], changelogs: [] } };
    const c2: Cache = { c2: { contexts: ["a", "b", "c"], changelogs: [] } };
    const c3: Cache = { c3: { contexts: ["a", "b", "c"], changelogs: [] } };
    const c4: Cache = { c4: { contexts: ["a", "b", "c"], changelogs: [] } };
    const c5: Cache = { c5: { contexts: ["a", "b", "c"], changelogs: [] } };
    const c6: Cache = { c6: { contexts: ["a", "b", "c"], changelogs: [] } };

    /**
     * Creates the cache before each test.
     */
    setup("create cache", () => {
      writeCacheToLocation(
        {
          ...c1,
          ...c2,
          ...c3,
          ...c4,
          ...c5,
          ...c6,
        },
        cacheLocation
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
function assertSaveOfContextToCache(expected: Cache, cacheLocation: string): void {
  const cacheHandler = new CacheHandler(cacheLocation);
  cacheHandler.saveContexts("myCacheLocation", ["a", "b"]);

  assertCacheContent(expected, cacheLocation);
}

/**
 * Asserts the `saveChangelog` method works as expected.
 * This method will create a `CacheHandler`, call `saveChangelog`
 * and reads the created file and compares it with the `expected` cache file.
 *
 * @param expected - the expected values from the cache as json object
 * @param cacheLocation - the location where the cache should be read
 */
function assertSaveOfChangelogToCache(expected: Cache, cacheLocation: string): void {
  const cacheHandler = new CacheHandler(cacheLocation);
  cacheHandler.saveChangelog("myCacheLocation", "lorem");

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
function assertRemoveConnectionOfCache(expected: Cache, cacheLocation: string, connectionsToRemove: string[]): void {
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
function assertCacheContent(expected: Cache, cacheLocation: string): void {
  const result = JSON.parse(fs.readFileSync(cacheLocation, { encoding: "utf-8" }));

  assert.deepStrictEqual(expected, result);
}

/**
 * Writes the cache to the given location.
 *
 * @param cache - the cache that should be written
 * @param cacheLocation - the location were the cache should be written to
 */
function writeCacheToLocation(cache: Cache, cacheLocation: string): void {
  fs.writeFileSync(cacheLocation, JSON.stringify(cache), "utf-8");
}
