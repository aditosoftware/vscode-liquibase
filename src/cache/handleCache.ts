import * as fs from "fs";
import { cacheLocation } from "../extension";
import { Logger } from "../logging/Logger";

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
 * Saves all given contexts in the cache. Any previous existing contexts will be removed from the cache.
 *
 * @param connectionLocation - the location (=liquibase.properties) of the connection. This is used as a key in the cache.
 * @param contexts - the contexts that should be saved in the cache
 */
export function saveContexts(connectionLocation: string, contexts: string[]) {
  // first, read any existing cache
  const cache: Cache = readCache();

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
  fs.writeFileSync(cacheLocation, JSON.stringify(cache, undefined, 2), { encoding: "utf-8" });
}

/**
 * Reads the cache from the cache location from the file system.
 *
 * @returns the cache or an empty object, if there is no cache
 */
export function readCache(): Cache {
  if (!fs.existsSync(cacheLocation)) {
    // if no cache exists, just return an empty element
    return {};
  }

  // otherwise, just read and parse the cache
  const cacheContext = fs.readFileSync(cacheLocation, { encoding: "utf-8" });
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
export function readContexts(connectionLocation: string): string[] {
  const cache = readCache();

  if (cache[connectionLocation]) {
    return cache[connectionLocation].contexts.sort();
  } else {
    return [];
  }
}

/**
 * Removes the complete cache file.
 *
 * The user will be informed, if this file is successfully removed.
 */
export function removeCache(): void {
  if (fs.existsSync(cacheLocation)) {
    fs.rmSync(cacheLocation);
    Logger.getLogger().info(`Successfully removed all recently loaded elements.`, true);
  }
}

/**
 * Removes selected connections from the cache.
 *
 * The user will not be informed, if this was successful.
 *
 * @param connections - the connections that should be removed from the cache. All values need to be keys of the cache (= absolute paths)
 */
export function removeConnectionsFromCache(connections: string[]): void {
  const cache = readCache();

  connections.forEach((pConnection) => delete cache[pConnection]);

  fs.writeFileSync(cacheLocation, JSON.stringify(cache, undefined, 2), { encoding: "utf-8" });
}
