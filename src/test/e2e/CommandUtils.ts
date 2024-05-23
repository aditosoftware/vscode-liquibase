import {
  BottomBarPanel,
  EditorView,
  InputBox,
  ModalDialog,
  OutputView,
  SideBarView,
  TextEditor,
  TreeItem,
  VSBrowser,
} from "vscode-extension-tester";
import { DockerTestUtils } from "../suite/DockerTestUtils";
import mariadb from "mariadb";
import path from "path";
import { LiquibaseGUITestUtils } from "./LiquibaseGUITestUtils";
import { ContextOptions, RemoveCacheOptions } from "../../constants";
import assert from "assert";

/**
 * Information regarding the setup of the tests.
 */
type SetupTestType = {
  /**
   * If the container should be started.
   */
  startContainer?: boolean;
};

/**
 * Utils for executing commands during the test.
 */
export class CommandUtils {
  /**
   * The path to the workspace.
   */
  static readonly WORKSPACE_PATH = path.join(process.cwd(), "out", "temp", "workspace");

  /**
   * The path to the liquibase folder inside the workspace.
   */
  static readonly LIQUIBASE_FOLDER = path.join(this.WORKSPACE_PATH, ".liquibase");

  /**
   * The path to the changelog file inside the liquibase folder inside the workspace.
   */
  static readonly CHANGELOG_FILE = path.join(this.LIQUIBASE_FOLDER, "changelog.xml");

  // TODO TSDOC
  // TODO duplicate values from existing variables!!

  static readonly pool = CommandUtils.createPool();
  static outputPanel: OutputView;
  static readonly contextOptions = [
    ContextOptions.NO_CONTEXT,
    ContextOptions.LOAD_ALL_CONTEXT,
    ContextOptions.USE_RECENTLY_LOADED,
  ];
  static readonly contextFunctions = {
    "all available contexts": CommandUtils.getAllContext,
    "the first available context": CommandUtils.getFirstContext,
    "no context": CommandUtils.getNoneContext,
  };

  /**
   * Opens a temp workspace and closes all editors.
   */
  static async setupTests({ startContainer = true }: SetupTestType = {}): Promise<string> {
    if (startContainer) {
      await DockerTestUtils.startContainer();
    }

    await CommandUtils.openWorkspace();

    const configurationName = await LiquibaseGUITestUtils.createConfiguration();

    await new EditorView().closeAllEditors();

    CommandUtils.outputPanel = await new BottomBarPanel().openOutputView();
    await CommandUtils.outputPanel.selectChannel("Liquibase");

    return configurationName;
  }

  /**
   * Opens the workspace.
   */
  static async openWorkspace(): Promise<void> {
    await VSBrowser.instance.openResources(CommandUtils.WORKSPACE_PATH);
  }

  /**
   * When called, will select everything in the InputBox and simply continue the process
   */
  static async getAllContext(): Promise<void> {
    const input = await InputBox.create();
    await wait();
    await input.toggleAllQuickPicks(true);
    await input.confirm();
  }

  /**
   * When called, will select the first possible value in the InputBox and simply continue the process
   */
  static async getFirstContext(): Promise<void> {
    const input = await InputBox.create();
    await wait();
    await input.setText("foo");
    await input.toggleAllQuickPicks(true);
    await input.confirm();
  }

  /**
   * When called, will not input anything in the InputBox and simply continue the process
   */
  static async getNoneContext(): Promise<void> {
    const input = await InputBox.create();
    await wait();
    await input.toggleAllQuickPicks(false);
    await input.confirm();
  }

  /**
   * Creates a pool for the database.
   * @param database - the name of the database
   * @returns the created pool
   */
  static createPool(database?: string): mariadb.Pool {
    return mariadb.createPool({
      host: "localhost",
      user: DockerTestUtils.username,
      password: DockerTestUtils.password,
      connectionLimit: 10,
      port: 3310,
      database: database,
    });
  }

  /**
   * Cartesian Product thingy
   * TODO tsdoc
   */
  static matrixExecution(
    options: string[],
    execFunctions: object,
    callback: (option: string, exec: () => Promise<void>, key: string) => void
  ): void {
    options.forEach((option) => {
      Object.entries(execFunctions).forEach(([key, exec]) => {
        callback(option, exec, key);
      });
    });
  }

  /**
   * Selects the folder and confirms the dialog
   * @param input - the input where the folder should be put into
   * @param folderName - the name of the folder
   * @see https://github.com/redhat-developer/vscode-extension-tester/blob/b283b0f7a1ca451b9decf6b08d76fda24134f897/docs/Home.md?plain=1#L77
   */
  static async selectFolder(input: InputBox, folderName: string): Promise<void> {
    const lastFolderName = path.basename(folderName);

    // set the dialog input to the folder name plus a path separator
    await input.setText(folderName + path.sep);

    // check if the folder name is there in the quick pick
    const optionForFolderName = await input.findQuickPick(lastFolderName);
    if (typeof optionForFolderName !== "undefined") {
      // if it is there, select it
      await input.selectQuickPick(lastFolderName);
    }

    // then confirm normally the dialog
    await input.confirm();
  }

  /**
   * Resets the database by dropping and creating the schema.
   * @param pool - the pool for the mariaDB database
   */
  static async resetDB(pool: mariadb.Pool): Promise<void> {
    await DockerTestUtils.executeMariaDBSQL(pool, "DROP SCHEMA data");
    await DockerTestUtils.executeMariaDBSQL(pool, "CREATE SCHEMA data");
  }
}

/**
 * just wait, pls
 * @param timeout - the number of milliseconds that should be waited.
 */
export async function wait(timeout: number = 2000): Promise<void> {
  await new Promise((r) => setTimeout(r, timeout));
}

/**
 * Opens the Liquibase context menu and selects the given action.
 *
 * This method will open an changelog before executing the action.
 *
 * @param action - the action that should be called
 */
export async function openAndSelectRMBItemFromChangelog(action: string): Promise<void> {
  await VSBrowser.instance.openResources(CommandUtils.CHANGELOG_FILE);

  await wait();

  await openAndSelectRMBItemFromAlreadyOpenedFile(action);
}

/**
 * Opens the Liquibase context menu in the explorer side bar on the changelog file and selects the given action.
 * @param action - the name of the action
 */
export async function openAndSelectRMBItemFromChangelogFromExplorer(action: string): Promise<void> {
  return openAndSelectRMBItemFromExplorer(action, ".liquibase", "changelog.xml");
}

/**
 * Opens the explorer at a specific point and opens the context menu.
 * @param action - the name of the action that should be executed
 * @param topLevelItem - the name of the top level folder in the explorer
 * @param children - all the children folders and the file that should be selected in the specific order
 */
export async function openAndSelectRMBItemFromExplorer(
  action: string,
  topLevelItem: string,
  ...children: string[]
): Promise<void> {
  const explorer = await new SideBarView().getContent().getSection("workspace");

  // find the topLevelItem and expand it
  const topLevelNode = (await explorer.findItem(topLevelItem)) as TreeItem;
  assert.ok(topLevelNode);
  await topLevelNode.expand();

  // find all children recursively and expand them
  let lastChild: TreeItem | undefined;
  for (const child of children) {
    if (lastChild) {
      lastChild = (await lastChild.findChildItem(child)) as TreeItem;
    } else {
      lastChild = (await topLevelNode.findChildItem(child)) as TreeItem;
    }
    assert.ok(lastChild);
    await lastChild.expand();
  }

  assert.ok(lastChild);

  // Open context menu on file in explorer
  const menu = await lastChild.openContextMenu();
  // open the liquibase submenu
  const liquibaseContextMenu = await menu.select("Liquibase");
  assert.ok(liquibaseContextMenu);
  // and select the action
  await liquibaseContextMenu.select(action);
}

/**
 * Opens the Liquibase context menu and selects the given action.
 *
 * @param action - the action that should be called
 */
export async function openAndSelectRMBItemFromAlreadyOpenedFile(action: string): Promise<void> {
  const editor = new TextEditor();
  const menu = await editor.openContextMenu();
  const liquibaseMenu = await menu.select("Liquibase");
  await liquibaseMenu?.select(action);
}

/**
 * Removes the whole cache.
 */
export async function removeWholeCache(): Promise<void> {
  const input = await LiquibaseGUITestUtils.startCommandExecution(
    "Cache: Removes any values from the recently loaded elements"
  );

  await input.setText(RemoveCacheOptions.WHOLE_CACHE);
  await input.confirm();

  const modalDialog = new ModalDialog();
  await modalDialog.pushButton("Delete");
}

/**
 * Creates some data for the cache via the update command.
 *
 * TODO allgemeiner auslagern?
 *
 * @param configurationName - the name of the current configuration
 */
export async function createDataViaUpdate(configurationName: string): Promise<void> {
  const input = await LiquibaseGUITestUtils.startCommandExecution("update");

  await input.setText(configurationName);
  await input.confirm();

  await input.setText(CommandUtils.CHANGELOG_FILE);
  await input.selectQuickPick(1);

  await input.setText(ContextOptions.LOAD_ALL_CONTEXT);
  await input.confirm();

  await wait();

  await input.toggleAllQuickPicks(true);
  await input.confirm();

  assert.ok(
    await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'update' was executed successfully")
  );
}
