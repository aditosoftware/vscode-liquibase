import { BottomBarPanel, EditorView, InputBox, OutputView, TextEditor, VSBrowser } from "vscode-extension-tester";
import { DockerTestUtils } from "../suite/DockerTestUtils";
import mariadb from "mariadb";
import path from "path";
import { LiquibaseGUITestUtils } from "./LiquibaseGUITestUtils";

export class CommandUtils {
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
  static async setupTests(): Promise<void> {
    await DockerTestUtils.startContainer();
    await CommandUtils.openWorkspace();
    await new EditorView().closeAllEditors();

    CommandUtils.outputPanel = await new BottomBarPanel().openOutputView();

    // FIXME hier dann eine beispielhafte config hinzufügen
    await LiquibaseGUITestUtils.addConfiguration(
      "dummy",
      path.join(process.cwd(), "out", "temp", "workspace"),
      "dummy.liquibase.properties"
    );

    await CommandUtils.outputPanel.selectChannel("Liquibase");
    //await CommandUtils.outputPanel.clearText();
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

  static createPool(database?: string): mariadb.Pool {
    return mariadb.createPool({
      host: "localhost",
      user: DockerTestUtils.username,
      password: DockerTestUtils.password,
      connectionLimit: 100,
      port: 3310,
      database: database,
    });
  }

  /**
   * Cartesian Product thingy
   *
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
   *
   *
   */
  static async resetDB(pool: mariadb.Pool): Promise<void> {
    await DockerTestUtils.executeMariaDBSQL(pool, "DROP SCHEMA data");
    await DockerTestUtils.executeMariaDBSQL(pool, "CREATE SCHEMA data");
  }
}

/**
 * just wait, pls
 */
export async function wait(timeout: number = 2000): Promise<void> {
  await new Promise((r) => setTimeout(r, timeout));
}

export async function openAndSelectRMBItem(action: string): Promise<void> {
  await VSBrowser.instance.openResources(
    path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml")
  );

  await wait();

  const editor = new TextEditor();
  const menu = await editor.openContextMenu();
  const liquibaseMenu = await menu.select("Liquibase");
  await liquibaseMenu?.select(action);
}
