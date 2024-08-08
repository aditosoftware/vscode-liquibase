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

/**
 * The options for handling the contexts.
 */
export enum ContextOptions {
  /**
   * Option of the `contextPreDialog` to not use any contexts.
   */
  NO_CONTEXT = "Do not use any contexts",

  /**
   * Option of the `contextPreDialog` to load the contexts from the root changelog file.
   */
  LOAD_ALL_CONTEXT = "Load all contexts from the changelog file",

  /**
   * Option of the `contextPreDialog` to load the contexts from the cache.
   */
  USE_RECENTLY_LOADED = "Use any of the recently loaded contexts",
}

/**
 * The name that should be used for any folder selection.
 */
export const folderSelectionName = "folderSelection";

/**
 * The label that should be used for the folder selection.
 */
export const selectOutputFolder = "Save";

/**
 * Name of the option to choose a custom changelog from the dialogs.
 */
export const CHOOSE_CHANGELOG_OPTION = "Choose Changelog...";
