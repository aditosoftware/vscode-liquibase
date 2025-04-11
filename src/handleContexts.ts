import { readChangelog } from "./configuration/data/readFromProperties";
import { loadContextsFromChangelogFile } from "./executeJar";
import { DialogValues, LoadingQuickPick, QuickPick, QuickPickItems } from "@aditosoftware/vscode-input";
import { PickPanelConfig } from "./registerLiquibaseCommand";
import * as vscode from "vscode";
import path from "path";
import { PROPERTY_FILE } from "./input/ConnectionType";
import { cacheHandler } from "./extension";
import { getLiquibaseFolder } from "./handleLiquibaseSettings";
import { ContextOptions } from "./constants";
import { HandleChangelogFileInput } from "./handleChangelogFileInput";
import { ContextSelection } from "./cache";

/**
 * The name of the pre selection dialog of the contexts.
 */
export const contextPreDialog = "contextPre";

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
  let contextCacheInfo: ContextCacheInformation | undefined;

  return [
    {
      input: new QuickPick({
        name: contextPreDialog,
        placeHolder: "Select your context loading method",
        generateItems: (currentResults: DialogValues) => {
          // load the cache values
          contextCacheInfo = loadCacheForPropertyFile(currentResults);

          return generateItemsForContextPreDialog(contextCacheInfo);
        },
      }),
      createCmdArgs: generateCmdArgsForPreContextSelection,
    },

    {
      input: new LoadingQuickPick({
        name: "context",
        placeHolder: "Choose any contexts",
        generateItems: async (dialogValues: DialogValues) =>
          await loadContexts(dialogValues, contextCacheInfo?.contexts ?? {}),
        reloadItems: async (dialogValues: DialogValues) => await loadContextsFromChangelog(dialogValues),
        reloadTooltip: "Reload contexts from changelog",
        allowMultiple: true,
        onBeforeInput: showContextSelection,
        onAfterInput: (dialogValues) => saveSelectedContexts(dialogValues, contextCacheInfo),
      }),
      createCmdArgs: createCmdArgsForContextSelection,
    },
  ];
}

/**
 * Generates the items for the context pre-selection dialog. This dialog will let the user select if they want to use contexts and
 * if they want to load the contexts or use the recently loaded contexts.
 *
 * The recently loaded context section will only be visible, when there are loaded elements.
 *
 * @param contextCacheInfo - the information loaded from the cache
 * @returns the items
 */
export function generateItemsForContextPreDialog(contextCacheInfo?: ContextCacheInformation): vscode.QuickPickItem[] {
  const items: vscode.QuickPickItem[] = [];

  if (contextCacheInfo?.contexts.loadedContexts && contextCacheInfo?.contexts.loadedContexts.length !== 0) {
    const cachedContexts = contextCacheInfo.contexts.loadedContexts.join(", ");
    items.push({
      label: ContextOptions.USE_RECENTLY_LOADED,
      detail: cachedContexts,
      iconPath: new vscode.ThemeIcon("list-selection"),
    });
  }

  items.push({
    label: ContextOptions.LOAD_ALL_CONTEXT,
    detail: "The loading might take a while.",
    iconPath: new vscode.ThemeIcon("sync"),
  });

  items.push({
    label: ContextOptions.NO_CONTEXT,
    detail: "This will only execute any changeset that does not have any context",
    iconPath: new vscode.ThemeIcon("search-remove"),
  });

  return items;
}

/**
 * Saves the selected contexts in the cache after the selection was confirmed by the user.
 *
 * @param dialogValues - the current dialog infos
 * @param contextCacheInfo - the information about the contexts in the cache
 */
export function saveSelectedContexts(dialogValues: DialogValues, contextCacheInfo?: ContextCacheInformation): void {
  const selectedContexts = dialogValues.inputValues.get("context");

  if (selectedContexts && contextCacheInfo) {
    contextCacheInfo.contexts.selectedContexts = selectedContexts;

    cacheHandler.saveContexts(
      contextCacheInfo.connectionLocation,
      contextCacheInfo.changelogLocation,
      contextCacheInfo.contexts
    );
  }
}

/**
 * Generates the cmd args for the pre-context-dialog.
 * This will only need cmd args, if no context should be used.
 * In this case, a dummy argument will be added in order to prevent the execution of all contexts.
 *
 * @param dialogValues - the current dialog values
 * @returns the cmd args
 */
function generateCmdArgsForPreContextSelection(dialogValues: DialogValues): string[] | undefined {
  const selected = dialogValues.inputValues.get(contextPreDialog);
  if (selected?.[0] === ContextOptions.NO_CONTEXT) {
    return [`--contexts=${NO_CONTEXT_USED}`];
  }
}

/**
 * Generates the cmd args for the context-dialog.
 * This will always create some arguments.
 * When no context was selected, then a dummy argument will be added in order to prevent the execution of all contexts.
 *
 * @param dialogValues - the current dialog values
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
 *
 * @param currentResults - the current dialog values
 * @returns the cache values and an text for the details of the cache selection
 */
export function loadCacheForPropertyFile(currentResults: DialogValues): ContextCacheInformation | undefined {
  const connectionLocation = currentResults.inputValues.get(PROPERTY_FILE)?.[0];

  const changelogLocation =
    currentResults.uri?.fsPath ?? currentResults.inputValues.get(HandleChangelogFileInput.CHANGELOG_NAME)?.[0];

  if (connectionLocation && changelogLocation) {
    // read the contexts from the cache
    const contexts = cacheHandler.readContexts(connectionLocation, changelogLocation);

    return {
      connectionLocation,
      changelogLocation,
      contexts,
    };
  }
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

  if (result?.[0]) {
    return result[0] !== ContextOptions.NO_CONTEXT;
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
export async function loadContexts(dialogValues: DialogValues, cache: ContextSelection): Promise<QuickPickItems> {
  const result = dialogValues.inputValues.get(contextPreDialog)?.[0];

  if (result) {
    if (result === ContextOptions.USE_RECENTLY_LOADED && cache.loadedContexts) {
      return {
        items: cache.loadedContexts.map((pCache) => {
          return {
            label: pCache,
            picked: cache.selectedContexts?.includes(pCache),
          };
        }),
        additionalPlaceholder: "from recently loaded elements",
      };
    } else if (result === ContextOptions.LOAD_ALL_CONTEXT) {
      return await loadContextsFromChangelog(dialogValues);
    }
  }

  return { items: [] };
}

/**
 * Loads the context items from the given root changelog file.
 *
 * @param dialogValues - the current dialog values
 * @returns the loaded items
 */
export async function loadContextsFromChangelog(dialogValues: DialogValues): Promise<QuickPickItems> {
  const items = await readContextValues(dialogValues);
  const quickPickItems: QuickPickItems = {
    items,
    additionalPlaceholder: "loaded from changelogs",
  };
  return quickPickItems;
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

  const changelog =
    currentResults.uri?.fsPath ?? currentResults.inputValues.get(HandleChangelogFileInput.CHANGELOG_NAME)?.[0];

  if (changelog) {
    // we are in a right click menu, read the contexts from this file
    return await loadContextsFromChangelogFile(changelog);
  }

  // Read Liquibase changelog  lines from properties file content
  const changelogs = readChangelog(liquibasePropertiesPath);

  const contextValues: vscode.QuickPickItem[] = [];

  // Process changelogFileLine if found
  if (changelogs) {
    // Read and parse the specified XML file
    const possibleFile = path.join(getLiquibaseFolder(), path.normalize(changelogs.trim()));
    const contexts = await loadContextsFromChangelogFile(possibleFile);
    contextValues.push(...contexts);
  }

  // Return an empty array if 'changelogFile:' line is not found
  return contextValues;
}

/**
 * The information regarding the context cache.
 */
export interface ContextCacheInformation {
  /**
   * The connection location. This serves as the key in the cache.
   */
  connectionLocation: string;

  /**
   * The location of the changelog. This is needed, because the contexts are saved under the changelog.
   */
  changelogLocation: string;

  /**
   * The contexts from the cache.
   */
  contexts: ContextSelection;
}
