import { BottomBarPanel, EditorView, InputBox, OutputView, TextEditor, VSBrowser } from "vscode-extension-tester";
import { DockerTestUtils } from "../suite/DockerTestUtils";
import mariadb from "mariadb";
import path from "path";
import { LiquibaseGUITestUtils } from "./LiquibaseGUITestUtils";

/**
 * Utils for executing commands during the test.
 */
export class CommandUtils {
  // TODO duplicate values from existing variables!!
  static readonly noContext = "Do not use any contexts";
  static readonly loadAllContext: string = "Load all contexts from the changelog file";
  static readonly recentContext: string = "Use any of the recently loaded contexts";
  static readonly pool = CommandUtils.createPool();
  static outputPanel: OutputView;
  static readonly contextOptions = [CommandUtils.noContext, CommandUtils.loadAllContext, CommandUtils.recentContext];
  static readonly contextFunctions = {
    "all available contexts": CommandUtils.getAllContext,
    "the first available context": CommandUtils.getFirstContext,
    "no context": CommandUtils.getNoneContext,
  };

  /**
   * Opens a temp workspace and closes all editors.
   */
  static async setupTests(): Promise<string> {
    await DockerTestUtils.startContainer();
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
    await VSBrowser.instance.openResources(path.join(process.cwd(), "out", "temp", "workspace"));
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
  await VSBrowser.instance.openResources(
    path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml")
  );

  await wait();

  await openAndSelectRMBItemFromAlreadyOpenedFile(action);
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
