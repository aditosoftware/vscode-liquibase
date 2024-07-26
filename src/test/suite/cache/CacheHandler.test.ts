import assert from "assert";
import path from "path";
import fs from "fs";
import { Cache, CacheHandler } from "../../../cache/";
import Sinon from "sinon";
import { Logger } from "@aditosoftware/vscode-logging";
import { TestUtils } from "../TestUtils";
import { randomUUID } from "crypto";
import chai from "chai";
import chaiFs from "chai-fs";

chai.use(chaiFs);

/**
 * Tests various methods from the CacheHandler
 */
suite("CacheHandler tests", () => {
  /**
   * Temporary folder for writing cache files.
   */
  const temporaryResourcePath = TestUtils.createTempFolderForTests("cache", "handle");

  let clock: sinon.SinonFakeTimers;

  /**
   * Initialize the logger for the tests.
   *
   * Use a fake timer for the timestamps.
   */
  suiteSetup("init logger and fake timer", () => {
    TestUtils.initLoggerForTests();

    clock = Sinon.useFakeTimers({ now: 10 });
  });

  /**
   * Restore the fake timer.
   */
  suiteTeardown(() => {
    clock.restore();
  });

  /**
   * Tests the reading of the cache and contexts.
   */
  suite("readCache and readContext", () => {
    const firstConnectionLocation = "/path/to/project/data/liquibase/data.liquibase.properties";
    const secondConnectionLocation = "/path/to/project/data/liquibase/system.liquibase.properties";

    const emptyFile: string = path.join(temporaryResourcePath, "empty.json");
    const legacyCacheFile: string = path.join(temporaryResourcePath, "legacy.json");
    const cacheFile: string = path.join(temporaryResourcePath, "cache.json");

    /**
     * Prepares some cache files before all tests.
     */
    suiteSetup("prepare cache files", () => {
      TestUtils.initLoggerForTests();

      // prepare the caches for the tests
      // prepare an empty cache
      fs.writeFileSync(emptyFile, JSON.stringify({}), { encoding: "utf-8" });

      // This cache format is no longer supported
      fs.writeFileSync(
        legacyCacheFile,
        JSON.stringify({
          "/path/to/project/data/liquibase/data.liquibase.properties": {
            contexts: ["prod", "qs", "dev"],
            changelogs: [
              {
                path: "foo",
                lastUsed: 1,
              },
              {
                path: "bar",
                lastUsed: 2,
              },
            ],
          },
          "/path/to/project/data/liquibase/system.liquibase.properties": {
            contexts: ["c3", "c1", "c5", "c2", "c6", "c4"],
            changelogs: [
              {
                path: "baz",
                lastUsed: 3,
              },
            ],
          },
        }),
        { encoding: "utf-8" }
      );

      // writes a currently valid cache file.
      // NOTE: If this format is no longer valid, add new tests with this format as legacy format
      // and change this format to the new format afterwards.
      const cache: Cache = {
        "/path/to/project/data/liquibase/data.liquibase.properties": {
          changelogs: [
            {
              path: "foo",
              lastUsed: 1,
              contexts: {
                loadedContexts: ["prod", "qs", "dev"],
                selectedContexts: ["prod", "qs"],
              },
            },
            {
              path: "bar",
              lastUsed: 2,
              contexts: {
                loadedContexts: ["prod", "qs", "dev"],
                selectedContexts: [],
              },
            },
          ],
        },
        "/path/to/project/data/liquibase/system.liquibase.properties": {
          changelogs: [
            {
              path: "baz",
              lastUsed: 3,
              contexts: {
                loadedContexts: ["c3", "c1", "c5", "c2", "c6", "c4"],
              },
            },
          ],
        },
      };
      fs.writeFileSync(cacheFile, JSON.stringify(cache), { encoding: "utf-8" });
    });

    /**
     * Tests the reading of a not existent file.
     */
    suite("should read not existing file", () => {
      const notExistentPath = path.join(temporaryResourcePath, "notExistent.json");
      const cacheHandler = new CacheHandler(notExistentPath);

      /**
       * Validate before the suite that the file does not exist.
       */
      suiteSetup("validate file path", () => {
        chai.assert.notPathExists(notExistentPath);
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
        assert.deepStrictEqual({}, cacheHandler.readContexts(firstConnectionLocation, "myChangelog"));
      });
    });

    /**
     * Tests the reading of an existing empty file.
     */
    suite("should read empty file", () => {
      const cacheHandler = new CacheHandler(emptyFile);

      /**
       * Validate before the suite that the file does exist.
       */
      suiteSetup("validate file path", () => {
        chai.assert.pathExists(emptyFile);
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
        assert.deepStrictEqual({}, cacheHandler.readContexts(firstConnectionLocation, "myChangelog"));
      });
    });

    /**
     * Tests that reading a legacy cache file with elements works.
     */
    suite("should read cache legacy file", () => {
      const cacheHandler = new CacheHandler(legacyCacheFile);

      /**
       * Validate before the suite that the file does exist.
       */
      suiteSetup("validate file path", () => {
        chai.assert.pathExists(legacyCacheFile);
      });

      /**
       * Tests that reading a legacy cache file with content works.
       * You can also see at this point, that the contexts are not ordered.
       */
      test(`should read legacy cache file`, () => {
        const expected: Cache = {
          "/path/to/project/data/liquibase/data.liquibase.properties": {
            changelogs: [
              {
                path: "foo",
                lastUsed: 1,
                contexts: {
                  loadedContexts: ["prod", "qs", "dev"],
                },
              },
              {
                path: "bar",
                lastUsed: 2,
                contexts: {
                  loadedContexts: ["prod", "qs", "dev"],
                },
              },
            ],
          },
          "/path/to/project/data/liquibase/system.liquibase.properties": {
            changelogs: [
              {
                path: "baz",
                lastUsed: 3,
                contexts: {
                  loadedContexts: ["c3", "c1", "c5", "c2", "c6", "c4"],
                },
              },
            ],
          },
        };

        assert.deepStrictEqual(cacheHandler.readCache(), expected);
      });

      [
        {
          expected: { loadedContexts: ["dev", "prod", "qs"] },
          file: firstConnectionLocation,
          changelog: "foo",
        },
        {
          expected: { loadedContexts: ["dev", "prod", "qs"] },
          file: firstConnectionLocation,
          changelog: "bar",
        },
        {
          expected: { loadedContexts: ["c1", "c2", "c3", "c4", "c5", "c6"] },
          file: secondConnectionLocation,
          changelog: "baz",
        },
        { expected: {}, file: firstConnectionLocation, changelog: "noChangelog" },
        { expected: {}, file: "noConnectionLocation", changelog: "noChangelog" },
      ].forEach((pElement) => {
        /**
         * Test that reading the contexts works. It also checks that the contexts are ordered.
         */
        test(`should read contexts of legacy cache of ${pElement.file} and changelog ${pElement.changelog}`, () => {
          assert.deepStrictEqual(cacheHandler.readContexts(pElement.file, pElement.changelog), pElement.expected);
        });
      });
    });

    /**
     * Tests that reading an up-to-date cache file with elements works.
     */
    suite("should read  up-to-date cache file", () => {
      const cacheHandler = new CacheHandler(cacheFile);

      /**
       * Validate before the suite that the file does exist.
       */
      suiteSetup("validate file path", () => {
        chai.assert.pathExists(cacheFile);
      });

      /**
       * Tests that reading a cache file with content works.
       * You can also see at this point, that the contexts are not ordered.
       */
      test(`should read cache file`, () => {
        const expected: Cache = {
          "/path/to/project/data/liquibase/data.liquibase.properties": {
            changelogs: [
              {
                path: "foo",
                lastUsed: 1,
                contexts: {
                  loadedContexts: ["prod", "qs", "dev"],
                  selectedContexts: ["prod", "qs"],
                },
              },
              {
                path: "bar",
                lastUsed: 2,
                contexts: {
                  loadedContexts: ["prod", "qs", "dev"],
                  selectedContexts: [],
                },
              },
            ],
          },
          "/path/to/project/data/liquibase/system.liquibase.properties": {
            changelogs: [
              {
                path: "baz",
                lastUsed: 3,
                contexts: {
                  loadedContexts: ["c3", "c1", "c5", "c2", "c6", "c4"],
                },
              },
            ],
          },
        };

        assert.deepStrictEqual(cacheHandler.readCache(), expected);
      });

      [
        {
          expected: { loadedContexts: ["dev", "prod", "qs"], selectedContexts: ["prod", "qs"] },
          file: firstConnectionLocation,
          changelog: "foo",
        },
        {
          expected: { loadedContexts: ["dev", "prod", "qs"], selectedContexts: [] },
          file: firstConnectionLocation,
          changelog: "bar",
        },
        {
          expected: { loadedContexts: ["c1", "c2", "c3", "c4", "c5", "c6"] },
          file: secondConnectionLocation,
          changelog: "baz",
        },
        { expected: {}, file: firstConnectionLocation, changelog: "noChangelog" },
        { expected: {}, file: "noConnectionLocation", changelog: "noChangelog" },
      ].forEach((pElement) => {
        /**
         * Test that reading the contexts works. It also checks that the contexts are ordered.
         */
        test(`should read contexts of  ${pElement.file} and changelog ${pElement.changelog}`, () => {
          assert.deepStrictEqual(cacheHandler.readContexts(pElement.file, pElement.changelog), pElement.expected);
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
          changelogs: [
            { path: "a", lastUsed: 1, contexts: {} },
            { path: "s", lastUsed: 6, contexts: {} },
            { path: "d", lastUsed: 4, contexts: {} },
            { path: "f", lastUsed: 5, contexts: {} },
            { path: "g", lastUsed: 3, contexts: {} },
            { path: "h", lastUsed: 2, contexts: {} },
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
        changelogs: [
          {
            path: "foo",
            lastUsed: 10,
            contexts: {
              loadedContexts: ["a", "b"],
              selectedContexts: ["a"],
            },
          },
        ],
      },
    };

    /**
     * Tests that writing to a not existing file works.
     */
    test("should write to not existing cache file", () => {
      const cacheLocation = path.join(temporaryResourcePath, "notExisting.json");
      if (fs.existsSync(cacheLocation)) {
        fs.rmSync(cacheLocation);
      }

      chai.assert.notPathExists(cacheLocation);

      assertSaveOfContextToCache(defaultCache, cacheLocation);
    });

    /**
     * Tests that writing to an empty file works.
     */
    test("should write to empty cache file", () => {
      const cacheLocation = path.join(temporaryResourcePath, "empty.json");

      // create the empty file
      writeCacheToLocation({}, cacheLocation);

      chai.assert.pathExists(cacheLocation);

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
            changelogs: [
              {
                path: "foo",
                lastUsed: 1,
                contexts: { loadedContexts: ["x", "y", "z"] },
              },
            ],
          },
        },
        cacheLocation
      );

      chai.assert.pathExists(cacheLocation);

      assertSaveOfContextToCache(
        {
          myOtherCacheLocation: {
            changelogs: [
              {
                path: "foo",
                lastUsed: 1,
                contexts: { loadedContexts: ["x", "y", "z"] },
              },
            ],
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
            changelogs: [
              {
                path: "foo",
                lastUsed: 10,
                contexts: { loadedContexts: ["x", "y", "z"] },
              },
            ],
          },
        },
        cacheLocation
      );

      chai.assert.pathExists(cacheLocation);

      assertSaveOfContextToCache(defaultCache, cacheLocation);
    });
  });

  /**
   * Tests the method `saveChangelog`.
   */
  suite("saveChangelog", () => {
    /**
     * Tests that the changelogs can be written correctly to the cache.
     */
    test("should write changelog to cache", () => {
      const expectedCache: Cache = {
        myCacheLocation: {
          changelogs: [{ path: "lorem", lastUsed: 10, contexts: {} }],
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
          changelogs: [{ path: "lorem", lastUsed: 10, contexts: {} }],
        },
      };

      const cacheLocation = path.join(temporaryResourcePath, `${randomUUID()}.json`);

      writeCacheToLocation(
        {
          myCacheLocation: {
            changelogs: [{ path: "lorem", lastUsed: 4, contexts: {} }],
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
          changelogs: [
            { path: "lorem", lastUsed: 10, contexts: {} },
            { path: "foobar", lastUsed: 4, contexts: {} },
            { path: "baz", lastUsed: 3, contexts: {} },
            { path: "bar", lastUsed: 2, contexts: {} },
            { path: "foo", lastUsed: 1, contexts: {} },
          ],
        },
      };

      const cacheLocation = path.join(temporaryResourcePath, `${randomUUID()}.json`);

      writeCacheToLocation(
        {
          myCacheLocation: {
            changelogs: [
              { path: "foo", lastUsed: 1, contexts: {} },
              { path: "bar", lastUsed: 2, contexts: {} },
              { path: "baz", lastUsed: 3, contexts: {} },
              { path: "foobar", lastUsed: 4, contexts: {} },
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
          changelogs: [
            { path: "lorem", lastUsed: 10, contexts: {} },
            { path: "bar-baz", lastUsed: 5, contexts: {} },
            { path: "foobar", lastUsed: 4, contexts: {} },
            { path: "baz", lastUsed: 3, contexts: {} },
            { path: "bar", lastUsed: 2, contexts: {} },
          ],
        },
      };

      const cacheLocation = path.join(temporaryResourcePath, `${randomUUID()}.json`);

      writeCacheToLocation(
        {
          myCacheLocation: {
            changelogs: [
              { path: "bar", lastUsed: 2, contexts: {} },
              { path: "foobar", lastUsed: 4, contexts: {} },
              { path: "baz", lastUsed: 3, contexts: {} },
              { path: "foo", lastUsed: 1, contexts: {} },
              { path: "bar-baz", lastUsed: 5, contexts: {} },
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

      chai.assert.notPathExists(cacheLocation);

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

      chai.assert.pathExists(cacheLocation);

      const cacheHandler = new CacheHandler(cacheLocation);
      cacheHandler.removeCache();

      // test that the file was removed
      chai.assert.notPathExists(cacheLocation);

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

    const c1: Cache = {
      c1: {
        changelogs: [
          {
            path: "foo",
            lastUsed: 1,
            contexts: { loadedContexts: ["a", "b", "c"], selectedContexts: ["a", "c"] },
          },
        ],
      },
    };
    const c2: Cache = {
      c2: {
        changelogs: [
          {
            path: "foo",
            lastUsed: 1,
            contexts: { loadedContexts: ["a", "b", "c"], selectedContexts: ["a", "c"] },
          },
        ],
      },
    };
    const c3: Cache = {
      c3: {
        changelogs: [
          {
            path: "foo",
            lastUsed: 1,
            contexts: { loadedContexts: ["a", "b", "c"], selectedContexts: ["a", "c"] },
          },
        ],
      },
    };
    const c4: Cache = {
      c4: {
        changelogs: [
          {
            path: "foo",
            lastUsed: 1,
            contexts: { loadedContexts: ["a", "b", "c"], selectedContexts: ["a", "c"] },
          },
        ],
      },
    };
    const c5: Cache = {
      c5: {
        changelogs: [
          {
            path: "foo",
            lastUsed: 1,
            contexts: { loadedContexts: ["a", "b", "c"], selectedContexts: ["a", "c"] },
          },
        ],
      },
    };
    const c6: Cache = {
      c6: {
        changelogs: [
          {
            path: "foo",
            lastUsed: 1,
            contexts: { loadedContexts: ["a", "b", "c"], selectedContexts: ["a", "c"] },
          },
        ],
      },
    };

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
  cacheHandler.saveContexts("myCacheLocation", "foo", { loadedContexts: ["a", "b"], selectedContexts: ["a"] });

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
  const result: Cache = JSON.parse(fs.readFileSync(cacheLocation, { encoding: "utf-8" }));

  assert.deepStrictEqual(result, expected);
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
