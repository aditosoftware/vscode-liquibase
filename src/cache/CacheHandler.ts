import * as fs from "fs";
import { Logger } from "@aditosoftware/vscode-logging";

/**
 * Any connection in the cache.
 */
export interface Connection {
  /**
   * The cached contexts of the cache.
   */
  contexts: string[];
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
   * @param contexts - the contexts that should be saved in the cache
   */
  saveContexts(connectionLocation: string, contexts: string[]): void {
    // first, read any existing cache
    this.readCache();

    if (!this.cache[connectionLocation]) {
      // if no cache is there for the connection, then add an element
      this.cache[connectionLocation] = {
        contexts: [],
      };
    }

    // remove any old contexts
    this.cache[connectionLocation].contexts = [];
    // and save the new cache values
    this.cache[connectionLocation].contexts.push(...contexts);

    // write the cache back to the file system
    fs.writeFileSync(this.cacheLocation, JSON.stringify(this.cache, undefined, 2), { encoding: "utf-8" });
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
      if (!fs.existsSync(this.cacheLocation)) {
        // if no cache exists, just use an empty element
        this.cache = {};
      } else {
        // otherwise, just read and parse the cache
        const cacheContext = fs.readFileSync(this.cacheLocation, { encoding: "utf-8" });
        this.cache = JSON.parse(cacheContext) as Cache;
      }

      this.cacheLoaded = true;
    }

    return this.cache;
  }

  /**
   * Reads all contexts from the cache for one connection.
   *
   * If there is no cache, or no cache for this connection, then you will get an empty array.
   *
   * @param connectionLocation - the location of the connection (= liquibase.properties file). This is used as a key in cache
   * @returns an sorted array with all contexts of the given connection
   */
  readContexts(connectionLocation: string): string[] {
    this.readCache();

    if (this.cache[connectionLocation]) {
      return this.cache[connectionLocation].contexts.sort((a, b) => a.localeCompare(b));
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

    connections.forEach((pConnection) => delete this.cache[pConnection]);

    fs.writeFileSync(this.cacheLocation, JSON.stringify(this.cache, undefined, 2), { encoding: "utf-8" });
  }
}
