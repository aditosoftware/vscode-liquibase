import { readContexts } from "./cache/handleCache";
import { readChangelogAndClasspathFile } from "./configuration/data/readFromProperties";
import { loadContextsFromChangelogFile } from "./executeJar";
import { DialogValues, LoadingQuickPick, PROPERTY_FILE, QuickPick, QuickPickItems } from "./input";
import { PickPanelConfig } from "./registerLiquibaseCommand";
import * as vscode from "vscode";
import { getClasspathSeparator } from "./utilities/osUtilities";
import path from "path";

/**
 * The name of the pre selection dialog of the contexts.
 */
const contextPreDialog = "contextPre";

/**
 * Option of the `contextPreDialog` to not use any contexts.
 */
const noContext = "Do not use any contexts";

/**
 * Option of the `contextPreDialog` to load the contexts from the root changelog file.
 */
const loadContext = "Load all contexts from the changelog file";

/**
 * Option of the `contextPreDialog` to load the contexts from the cache.
 */
const useRecentlyLoaded = "Use any of the recently loaded contexts";

/**
 * Indicator in any context command argument to not use any context.
 * This element was created in such a way that it is very unlikely to represent a possible context.
 */
const NO_CONTEXT_USED = "###NO_CONTEXT_USED###";

/**
 * Generates the `PickPanelConfig` for the context inputs.
 *
 * @returns - the `PickPanelConfig` for the context selection. This will be always created.
 */
export function generateContextInputs(): PickPanelConfig[] {
  let cache: string[] = [];

  return [
    {
      input: new QuickPick(contextPreDialog, "Select context using for the command", (currentResults: DialogValues) => {
        // reset the cache
        cache = [];

        // load the cache values
        let cachedContexts: string | undefined;
        ({ cachedContexts, cache } = loadCacheForPropertyFile(currentResults));

        const items: vscode.QuickPickItem[] = [
          {
            label: noContext,
            detail: "This will only execute any changeset that does not have any context",
            iconPath: new vscode.ThemeIcon("search-remove"),
          },
          {
            label: loadContext,
            detail: "The loading might take a while.",
            iconPath: new vscode.ThemeIcon("sync"),
          },
        ];

        if (cachedContexts) {
          items.push({
            label: useRecentlyLoaded,
            detail: cachedContexts,
            iconPath: new vscode.ThemeIcon("list-selection"),
          });
        }

        return items;
      }),
      createCmdArgs: generateCmdArgsForPreContextSelection,
    },

    {
      input: new LoadingQuickPick(
        "context",
        "Choose any context",
        "Loading contexts",
        async (dialogValues: DialogValues) => await loadContexts(dialogValues, cache),
        async (dialogValues: DialogValues) => await loadContextsFromChangelog(dialogValues),
        "Reload contexts from changelog",
        true,
        showContextSelection
      ),
      createCmdArgs: createCmdArgsForContextSelection,
    },
  ];
}

/**
 * Generates the cmd args for the pre-context-dialog.
 * This will only need cmd args, if no context should be used.
 * In this case, a dummy argument will be added in order to prevent the execution of all contexts.
 * @returns the cmd args
 */
function generateCmdArgsForPreContextSelection(dialogValues: DialogValues): string[] | undefined {
  const selected = dialogValues.inputValues.get(contextPreDialog);
  if (selected && selected[0]) {
    if (selected[0] === noContext) {
      return [`--contexts=${NO_CONTEXT_USED}`];
    }
  }
}

/**
 * Generates the cmd args for the context-dialog.
 * This will always create some arguments.
 * When no context was selected, then a dummy argument will be added in order to prevent the execution of all contexts.
 * @returns the cmd args
 */
function createCmdArgsForContextSelection(dialogValues: DialogValues): string[] {
  const context = dialogValues.inputValues.get("context");

  // add a dummy value when no context should be used, otherwise transform them normally
  const contextCmdValue: string = context && context.length > 0 ? context.join(",") : NO_CONTEXT_USED;
  return [`--contexts=${contextCmdValue}`];
}

/**
 * Loads the cache values for the property file.
 * @param currentResults  - the current dialog values
 * @returns the cache values and an text for the details of the cache selection
 */
function loadCacheForPropertyFile(currentResults: DialogValues) {
  const propertyFile = currentResults.inputValues.get(PROPERTY_FILE);

  let cache: string[] = [];

  // read the contexts from the cache
  let cachedContexts: string | undefined;
  if (propertyFile && propertyFile[0]) {
    cache = readContexts(propertyFile[0]);
    cachedContexts = "No recently loaded contexts";
    if (cache && cache.length !== 0) {
      // cached values are there, then join them together
      cachedContexts = cache.join(", ");
    }
  }
  return { cachedContexts, cache };
}

/**
 * Indicates if the context selection dialog should be shown.
 * It should be not shown, if in the pre-context dialog was "use no contexts" selected.
 *
 * @param dialogValues - the current dialog values
 * @returns `true` if the context selection dialog should be shown
 */
function showContextSelection(dialogValues: DialogValues): boolean {
  const result = dialogValues.inputValues.get(contextPreDialog);

  if (result && result[0]) {
    return !(result[0] === noContext);
  }

  return false;
}

/**
 * Loads the context items depending on the user input.
 * This can load the contexts from the cache (which was already done) or from the root changelog file.
 * The context items will be also transformed the quick pick.
 *
 * @param dialogValues - the current dialog values
 * @param cache - the current values in the cache for the currently selected connection
 * @returns the context items for the quick pick
 */
async function loadContexts(dialogValues: DialogValues, cache: string[]): Promise<QuickPickItems> {
  const result = dialogValues.inputValues.get(contextPreDialog);

  if (result && result[0]) {
    if (result[0] === useRecentlyLoaded) {
      return {
        items: cache.map((pCache) => {
          return {
            label: pCache,
          };
        }),
        additionalTitle: "from recently loaded elements",
      };
    } else if (result[0] === loadContext) {
      return await loadContextsFromChangelog(dialogValues);
    }
  }

  return { items: [] };
}

/**
 * Loads the context items from the given root changelog file.
 * @param dialogValues - the current dialog values
 * @returns the loaded items
 */
export async function loadContextsFromChangelog(dialogValues: DialogValues) {
  const items = await readContextValues(dialogValues);
  return {
    items,
    additionalTitle: "loaded from changelogs",
  };
}

/**
 * Reads context values from a root changelog file and returns them as an array of QuickPickItem objects.
 *
 * @param currentResults - the current dialog values
 * @returns A Promise that resolves to an array of QuickPickItem objects representing the context values.
 */
async function readContextValues(currentResults: DialogValues): Promise<vscode.QuickPickItem[]> {
  const liquibasePropertiesPath = currentResults.inputValues.get(PROPERTY_FILE)?.[0];

  if (!liquibasePropertiesPath) {
    return [];
  }

  if (currentResults.uri) {
    // we are in a right click menu, read the contexts from this file
    return await loadContextsFromChangelogFile(currentResults.uri.fsPath, liquibasePropertiesPath);
  }

  // Read Liquibase changelog  and classpath lines from properties file content
  const classpathAndChangelogs = readChangelogAndClasspathFile(liquibasePropertiesPath, getClasspathSeparator());

  const contextValues: vscode.QuickPickItem[] = [];

  // Process changelogFileLine if found
  if (classpathAndChangelogs) {
    const changelogFileLine = classpathAndChangelogs.changelog;

    for (const classpath of classpathAndChangelogs.classpath) {
      // Read and parse the specified XML file
      const possibleFile = path.join(classpath, path.normalize(changelogFileLine.trim()));
      const contexts = await loadContextsFromChangelogFile(possibleFile, liquibasePropertiesPath);
      contextValues.push(...contexts);
    }
  }

  // Return an empty array if 'changelogFile:' line is not found
  return contextValues;
}