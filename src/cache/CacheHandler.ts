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
 * Handler for every cache.
 */
export class CacheHandler {
  /**
   * Constructor. This should be created in you `activate` function, in order the have the `cacheLocation` to your globalStoragePath.
   * @param cacheLocation - The location where the cache iss located. This will be inside the resourcePath in a json file.
   */
  constructor(readonly cacheLocation: string) {
    this.cacheLocation = cacheLocation;
  }

  /**
   * Saves all given contexts in the cache. Any previous existing contexts will be removed from the cache.
   *
   * @param connectionLocation - the location (=liquibase.properties) of the connection. This is used as a key in the cache.
   * @param contexts - the contexts that should be saved in the cache
   */
  saveContexts(connectionLocation: string, contexts: string[]): void {
    // first, read any existing cache
    const cache: Cache = this.readCache();

    if (!cache[connectionLocation]) {
      // if no cache is there for the connection, then add an element
      cache[connectionLocation] = {
        contexts: [],
      };
    }

    // remove any old contexts
    cache[connectionLocation].contexts = [];
    // and save the new cache values
    cache[connectionLocation].contexts.push(...contexts);

    // write the cache back to to file system
    fs.writeFileSync(this.cacheLocation, JSON.stringify(cache, undefined, 2), { encoding: "utf-8" });
  }

  /**
   * Reads the cache from the cache location from the file system.
   *
   * @returns the cache or an empty object, if there is no cache
   */
  readCache(): Cache {
    if (!fs.existsSync(this.cacheLocation)) {
      // if no cache exists, just return an empty element
      return {};
    }

    // otherwise, just read and parse the cache
    const cacheContext = fs.readFileSync(this.cacheLocation, { encoding: "utf-8" });
    return JSON.parse(cacheContext) as Cache;
  }

  /**
   * Reads all contexts from the cache for one connection.
   *
   * If there is no cache, or no cache for this connection, then you will get an empty array.
   *
   * @param connectionLocation - the location of the connection (= liquibase.properties file). This is used as a key in cache
   * @returns an sorted array with all contexts of the connections
   */
  readContexts(connectionLocation: string): string[] {
    const cache = this.readCache();

    if (cache[connectionLocation]) {
      return cache[connectionLocation].contexts.sort((a, b) => a.localeCompare(b));
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
      fs.rmSync(this.cacheLocation);
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
    const cache = this.readCache();

    connections.forEach((pConnection) => delete cache[pConnection]);

    fs.writeFileSync(this.cacheLocation, JSON.stringify(cache, undefined, 2), { encoding: "utf-8" });
  }
}
