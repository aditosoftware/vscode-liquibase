/**
 * The remove options for a configuration.
 */
export enum RemoveConfigurationOptions {
  /**
   * The option to remove the cache.
   */
  CACHE = "Remove recently loaded elements",

  /**
   * The option to remove the setting entry.
   */
  SETTING = "Remove configuration from settings",

  /**
   * The option to remove everything.
   */
  DELETE_ALL = "Delete configuration",
}

/**
 * The remove options for a cache.
 */
export enum RemoveCacheOptions {
  /**
   * The label for removing the whole cache.
   */
  WHOLE_CACHE = "Invalidate every recently loaded value",

  /**
   * The label for removing only the cache for any number of connections.
   */
  REMOVE_CONNECTION = "Remove one or more connections",
}
