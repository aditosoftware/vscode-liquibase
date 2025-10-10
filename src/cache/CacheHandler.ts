import * as fs from "node:fs";
import { Logger } from "@aditosoftware/vscode-logging";

/**
 * The number of changelogs that should maximally be there for one connection.
 */
const MAX_CHANGELOGS_IN_CACHE = 5;

/**
 * Any connection in the cache.
 */
export interface Connection {
  /**
   * The cached contexts of the cache.
   *
   * @deprecated this element will no longer be supported in writing. Instead, all data should be read and written from {@link Changelog.contexts}
   */
  contexts?: string[];

  /**
   * The recently used changelog elements.
   */
  changelogs: Changelog[];
}

/**
 * A recently used changelog element.
 */
interface Changelog {
  /**
   * The timestamp of the last usage.
   */
  lastUsed: number;

  /**
   * The path to the changelog.
   */
  path: string;

  /**
   * The selected contexts of each changelog.
   */
  contexts: ContextSelection;
}

/**
 * The context selection.
 */
export interface ContextSelection {
  /**
   * The contexts that were loaded.
   */
  loadedContexts?: string[];

  /**
   * The context that were selected.
   */
  selectedContexts?: string[];
}

/**
 * The cache itself.
 */
export interface Cache {
  /**
   * Any connection in the cache.
   */
  [key: string]: Connection;
}

/**
 * Handler for the cache. The cache location is stated in the constructor and all the values from the `Cache` interface are cached.
 */
export class CacheHandler {
  /**
   * The cache. This will be loaded in `readCache`, if it was never checked
   */
  private cache: Cache;

  /**
   * Indicator, if the cache was loaded.
   */
  private cacheLoaded: boolean = false;

  /**
   * Constructor. This should be created in your `activate` function, in order the have the `cacheLocation` pointing to your globalStoragePath.
   *
   * @param cacheLocation - The location where the cache is located. The location should point to a json file inside the globalStoragePath of the extension.
   */
  constructor(readonly cacheLocation: string) {
    this.cacheLocation = cacheLocation;
    this.cache = {};
  }

  /**
   * Saves all given contexts in the cache. Any previous existing contexts will be removed from the cache.
   *
   * @param connectionLocation - the location (=liquibase.properties) of the connection. This is used as a key in the cache.
   * @param changelogPath - the path to the changelog. This is needed, because contexts are saved for each changelog
   * @param contexts - the contexts that should be saved in the cache
   */
  saveContexts(connectionLocation: string, changelogPath: string, contexts: ContextSelection): void {
    const loadedChangelogs = this.getChangelog(connectionLocation, changelogPath);
    let existingChangelog = loadedChangelogs.existingChangelog;

    if (!existingChangelog) {
      // if no changelog exists, write a dummy element.
      existingChangelog = {
        path: changelogPath,
        lastUsed: Date.now(),
        contexts: {},
      };
      loadedChangelogs.changelogs.push(existingChangelog);
    }

    // if we do not have any context object, then make one
    if (!existingChangelog.contexts) {
      existingChangelog.contexts = {};
    }

    // save new loaded contexts
    if (contexts.loadedContexts) {
      existingChangelog.contexts.loadedContexts = contexts.loadedContexts;
    }

    // save new selected contexts
    if (contexts.selectedContexts) {
      existingChangelog.contexts.selectedContexts = contexts.selectedContexts;
    }

    this.writeCache();
  }

  /**
   * Adds a dummy element for the `connectionLocation` to the cache.
   *
   * @param connectionLocation - the location (=liquibase.properties) of the connection. This is used as a key in the cache.
   */
  private addDummyElementForConnectionToCache(connectionLocation: string): void {
    if (!this.cache[connectionLocation]) {
      // if no cache is there for the connection, then add an element
      this.cache[connectionLocation] = {
        changelogs: [],
      };
    }
  }

  /**
   * Saves a recently selected changelog file in the cache.
   *
   * @param connectionLocation - the location (=liquibase.properties) of the connection. This is used as a key in the cache.
   * @param changelogPath - the absolute path to the changelog file
   */
  saveChangelog(connectionLocation: string, changelogPath: string): void {
    const { existingChangelog, changelogs } = this.getChangelog(connectionLocation, changelogPath);

    if (existingChangelog) {
      // update lastUsed, if we already have an element
      existingChangelog.lastUsed = Date.now();
    } else {
      // otherwise, add a new element
      changelogs.push({
        lastUsed: Date.now(),
        path: changelogPath,
        contexts: {},
      });
    }

    // sort by last used descending
    changelogs.sort((a, b) => b.lastUsed - a.lastUsed);

    // Keep only the top X changelogs
    this.cache[connectionLocation].changelogs = changelogs.slice(0, MAX_CHANGELOGS_IN_CACHE);

    // write the cache back to to file system
    this.writeCache();
  }

  /**
   * Gets the given changelog from the cache.
   *
   * @param connectionLocation - the location to the liquibase.properties file
   * @param changelogPath - the path of the changelog that should be given to the method caller
   * @returns the changelog with the `changelogPath` if found and all other changelogs
   */
  private getChangelog(
    connectionLocation: string,
    changelogPath: string
  ): {
    existingChangelog: Changelog | undefined;
    changelogs: Changelog[];
  } {
    this.readCache();

    this.addDummyElementForConnectionToCache(connectionLocation);

    let changelogs = this.cache[connectionLocation].changelogs;

    if (!changelogs) {
      changelogs = [];
    }

    const existingChangelog = changelogs.find((log) => log.path === changelogPath);
    return { existingChangelog, changelogs };
  }

  /**
   * Reads the cache from the cache location in the file system.
   * If there was already a cache loaded, then the stored object will be returned.
   *
   * @returns the cache
   */
  readCache(): Cache {
    if (!this.cacheLoaded) {
      // if we have no cached elements, then try to read them
      if (fs.existsSync(this.cacheLocation)) {
        // if the cache exists, just read and parse the cache
        const cacheContext = fs.readFileSync(this.cacheLocation, { encoding: "utf-8" });
        this.cache = JSON.parse(cacheContext) as Cache;

        this.transformOldContextToNewContextSelection();
      } else {
        // if no cache exists, just use an empty element
        this.cache = {};
      }

      this.cacheLoaded = true;
    }

    return this.cache;
  }

  /**
   * Transforms the old `contexts` to the new `contextSelection`.
   */
  private transformOldContextToNewContextSelection(): void {
    for (const pCacheElement of Object.values(this.cache)) {
      if (!pCacheElement.changelogs) {
        pCacheElement.changelogs = [];
      }

      // The following block needs to contain deprecated code in order to migrate it.
      /* eslint-disable @typescript-eslint/no-deprecated */
      if (pCacheElement.contexts) {
        // move the contexts to every changelog
        for (const pChangelog of pCacheElement.changelogs) {
          pChangelog.contexts = {
            loadedContexts: pCacheElement.contexts,
          };
        }

        // and delete the old contexts
        delete pCacheElement.contexts;
        /* eslint-enable @typescript-eslint/no-deprecated */
      }
    }
  }

  /**
   * Reads all contexts from the cache for one connection and changelog.
   *
   * If there is no cache, or no cache for this connection, then you will get an empty element.
   *
   * @param connectionLocation - the location of the connection (= liquibase.properties file). This is used as a key in cache
   * @param changelogLocation - the location of the changelog
   * @returns the sorted loaded contexts and the selected contexts of the given connection and changelog
   */
  public readContexts(connectionLocation: string, changelogLocation: string): ContextSelection {
    const existingChangelog = this.getChangelog(connectionLocation, changelogLocation).existingChangelog;

    if (existingChangelog?.contexts) {
      // sort any loaded contexts
      existingChangelog.contexts.loadedContexts?.sort((a, b) => a.localeCompare(b));

      return existingChangelog.contexts;
    } else {
      return {};
    }
  }

  /**
   * Reads the changelogs from the cache.
   *
   * @param connectionLocation - the location of the connection (= liquibase.properties file). This is used as a key in cache
   * @returns the absolute path of the changelogs, already ordered by last used descending
   */
  readChangelogs(connectionLocation: string): string[] {
    const cache = this.readCache();

    if (cache[connectionLocation]?.changelogs) {
      return cache[connectionLocation].changelogs
        .toSorted((a, b) => b.lastUsed - a.lastUsed)
        .map((pChangelog) => pChangelog.path);
    } else {
      return [];
    }
  }

  /**
   * Removes the complete cache file.
   *
   * The user will be informed, if this file is successfully removed.
   */
  removeCache(): void {
    if (fs.existsSync(this.cacheLocation)) {
      // remove the cache from the file system
      fs.rmSync(this.cacheLocation);
      // empty the cache as well
      this.cache = {};
      Logger.getLogger().info({ message: `Successfully removed all recently loaded elements.`, notifyUser: true });
    }
  }

  /**
   * Removes selected connections from the cache.
   *
   * The user will not be informed, if this was successful.
   *
   * @param connections - the connections that should be removed from the cache. All values need to be keys of the cache (= absolute paths)
   */
  removeConnectionsFromCache(connections: string[]): void {
    this.readCache();

    for (const pConnection of connections) {
      delete this.cache[pConnection];
    }

    // write the cache back to to file system
    this.writeCache();
  }

  /**
   * Writes the cache to the cache location.
   */
  private writeCache(): void {
    fs.writeFileSync(this.cacheLocation, JSON.stringify(this.cache, undefined, 2), { encoding: "utf-8" });
  }
}
