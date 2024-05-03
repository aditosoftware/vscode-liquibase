import { BottomBarPanel, EditorView, InputBox, ModalDialog, OutputView, VSBrowser } from "vscode-extension-tester";
import assert from "assert";
import path from "path";
import fs from "fs";
import { MariaDbDockerTestUtils } from "../../suite/MariaDbDockerTestUtils";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { beforeEach } from "mocha";
import mariadb from 'mariadb';


/**
 * Tests some commands.
 */
suite("Command tests", () => {

  let outputPanel: OutputView;
  let pool: mariadb.Pool;

  /**
   * Opens a temp workspace and closes all editors.
   */
  suiteSetup(async function () {
    this.timeout(40_000);

    await MariaDbDockerTestUtils.stopAndRemoveContainer();

    await VSBrowser.instance.openResources(path.join(process.cwd(), "out", "temp", "workspace"));

    await new EditorView().closeAllEditors();

    await MariaDbDockerTestUtils.startContainer();
    pool = mariadb.createPool({ host: "localhost", user: this.username, password: this.password, connectionLimit: 5000, port: this.port });

    outputPanel = (await new BottomBarPanel().openOutputView());

    await LiquibaseGUITestUtils.addConfiguration("dummy", path.join(process.cwd(), "out", "temp", "workspace"), "dummy.liquibase.properties");

    await outputPanel.selectChannel('Liquibase');
  });

  beforeEach(() => {
    outputPanel.clearText();
  });

  const noContext: string = "Do not use any contexts";
  const loadAllContext: string = "Load all contexts from the changelog file";
  const recentContext: string = "Use any of the recently loaded contexts";
  const contextOptions = [noContext, loadAllContext, recentContext];
  const contextFunctions = {
    'all available contexts': getAllContext,
    'the first available context': getFirstContext,
    'no context': getNoneContext
  };


  suite("Status", () => {
    matrixExecution(contextOptions, contextFunctions, (option, exec, key) => {
      test("should execute 'status' with context type '" + option + "' command with " + key, async function () {

        this.timeout(1000_000);

        const input = await LiquibaseGUITestUtils.preCommandExecution("status");

        // wait a bit initially
        await wait();

        await input.setText("dummy");
        await input.confirm();
        await wait();

        await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
        await input.selectQuickPick(1);
        await wait();

        if (option === noContext) {

          await input.setText(option);
          await input.confirm();
        }
        else {
          await input.setText(option);
          await input.confirm();
          await wait();

          await exec();
        }
        assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'status' was executed successfully."));
      });
    });
  });

  suite("Drop-all", () => {
    /**
       * 
       */
    test("should execute 'drop-all' command", async function () {
      this.timeout(40_000);

      await wait();

      const input = await LiquibaseGUITestUtils.preCommandExecution("drop-all");

      await input.setText('dummy');
      await input.confirm();

      await wait();

      const test = new ModalDialog();
      test.pushButton('Drop-all');

      assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'drop-all' was executed successfully."));

      //TODO: add comparison to db to check if everything was removed
    });

    /**
     * 
     */
    test("should cancel execute 'drop-all' command", async function () {
      this.timeout(40_000);

      await wait();

      const input = await LiquibaseGUITestUtils.preCommandExecution("drop-all");

      await input.setText('dummy');
      await input.confirm();

      await wait();

      const test = new ModalDialog();
      test.pushButton('Cancel');

      assert.ok(!await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'drop-all' was executed successfully."));
    });
  });

  /**
   * 
   */
  suite("Validate", () => {

    /**
     * 
     */
    test("should execute 'validate' command", async function () {
      this.timeout(40_000);

      await wait();

      const input = await LiquibaseGUITestUtils.preCommandExecution("validate");

      await input.setText('dummy');
      await input.confirm();
      await wait();

      await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
      await input.selectQuickPick(1);
      await wait();

      assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'validate' was executed successfully."));
    });

  });

  suite("Tag", () => {

    /**
     * 
     */
    test("should execute 'tag' command", async function () {
      this.timeout(40_000);

      await wait();

      const input = await LiquibaseGUITestUtils.preCommandExecution("tag");

      await input.setText('dummy');
      await input.confirm();
      await wait();

      await input.setText("test");
      await input.confirm();
      await wait();

      assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'tag' was executed successfully."));
    });
  });

  suite("Tag Exist", () => {

    /**
     * 
     */
    test("should execute 'tag-exists' command", async function () {
      this.timeout(40_000);

      await wait();

      const input = await LiquibaseGUITestUtils.preCommandExecution("tag-exists");

      await input.setText('dummy');
      await input.confirm();
      await wait();

      await input.setText("test");
      await input.confirm();
      await wait();

      assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'tag-exists' was executed successfully."));
      assert.ok((await outputPanel.getText()).includes('does NOT exist'));
      //TODO: check logs for real result or change behaviour of tag-exists
    });

    /**
     * 
     */
    test("should execute 'tag-exists' command unsuccessfully", async function () {
      this.timeout(40_000);

      await wait();

      const input = await LiquibaseGUITestUtils.preCommandExecution("tag-exists");

      await input.setText('dummy');
      await input.confirm();
      await wait();

      await input.setText("test2");
      await input.confirm();
      await wait();

      assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'tag-exists' was executed successfully."));


      //TODO: check logs for real result or change behaviour of tag-exists
    });
  });

  suite("Update", () => {

    /**
     * 
     */
    matrixExecution(contextOptions, contextFunctions, (option, exec, key) => {
      test("should execute 'update' with context type '" + option + "' command with " + key, async function () {
        this.timeout(40_000);
        await resetDB();

        await wait();

        const input = await LiquibaseGUITestUtils.preCommandExecution("update");

        await input.setText('dummy');
        await input.confirm();
        await wait();

        await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
        await input.selectQuickPick(1);
        await wait();

        if (option === noContext) {

          await input.setText(option);
          await input.confirm();

          assert.ok((await MariaDbDockerTestUtils.executeSQL(pool, "SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'person'"))?.length, "0");
        }
        else {
          await input.setText(option);
          await input.confirm();
          await wait();

          await exec();

          if (key === 'all available contexts' || key === 'the first available context') {
            assert.ok((await MariaDbDockerTestUtils.executeSQL(pool, "SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'person'"))?.length, "1");
          }
          else {
            assert.ok((await MariaDbDockerTestUtils.executeSQL(pool, "SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'person'"))?.length, "0");
          }
        }

        assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'update' was executed successfully."));
      });
    });
  });

  /**
   * 
   */
  suite("History", () => {

    /**
     * 
     */
    test("should execute 'history' command as TABULAR", async function () {
      this.timeout(40_000);

      await wait();

      const input = await LiquibaseGUITestUtils.preCommandExecution("history");

      await input.setText('dummy');
      await input.confirm();
      await wait();

      await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase"));
      await input.confirm(); //this dumb shit only works if you DOUBLE CONFIRM IT -> https://github.com/redhat-developer/vscode-extension-tester/blob/b283b0f7a1ca451b9decf6b08d76fda24134f897/docs/Home.md?plain=1#L77
      await input.confirm();
      await wait();

      await input.setText("Test2.txt");
      await input.confirm();
      await wait();

      await input.setText('TABULAR');
      await input.confirm();
      await wait();

      assert.ok(fs.existsSync(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "Test2.txt")));
    });

    /**
     * 
     */
    test("should execute 'history' command as TEXT", async function () {
      this.timeout(40_000);

      await wait();

      const input = await LiquibaseGUITestUtils.preCommandExecution("history");

      await input.setText('dummy');
      await input.confirm();
      await wait();

      await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase"));
      await input.confirm(); //this dumb shit only works if you DOUBLE CONFIRM IT -> https://github.com/redhat-developer/vscode-extension-tester/blob/b283b0f7a1ca451b9decf6b08d76fda24134f897/docs/Home.md?plain=1#L77
      await input.confirm();
      await wait();

      await input.setText("Test.txt");
      await input.confirm();
      await wait();

      await input.setText('TEXT');
      await input.confirm();
      await wait();

      assert.ok(fs.existsSync(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "Test.txt")));
    });
  });

  suite("Unexpected Changesets", async function () {

    /**
    * 
    */
    matrixExecution(contextOptions, contextFunctions, (option, exec, key) => {
      test("should execute 'Unexpected Changesets' with context type '" + option + "' command with " + key, async function () {
        this.timeout(40_000);
        await resetDB();

        await wait();

        const input = await LiquibaseGUITestUtils.preCommandExecution("unexpected changesets");

        await input.setText('dummy');
        await input.confirm();
        await wait();

        await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
        await input.selectQuickPick(1);
        await wait();

        if (option === noContext) {
          await input.setText(option);
          await input.confirm();
        }
        else {
          await input.setText(option);
          await input.confirm();
          await wait();

          await exec();
        }

        assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'unexpected-changesets' was executed successfully."));
      });
    });
  });

  suite("Changelog Sync", async function () {

    /**
    * 
    */
    matrixExecution(contextOptions, contextFunctions, (option, exec, key) => {
      test("should execute 'Changelog Sync' with context type '" + option + "' command with " + key, async function () {
        this.timeout(40_000);
        await resetDB();

        await wait();

        const input = await LiquibaseGUITestUtils.preCommandExecution("Changelog Sync");

        await input.setText('dummy');
        await input.confirm();
        await wait();

        await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
        await input.selectQuickPick(1);
        await wait();

        if (option === noContext) {
          await input.setText(option);
          await input.confirm();
        }
        else {
          await input.setText(option);
          await input.confirm();
          await wait();

          await exec();
        }

        assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'changelog-sync' was executed successfully."));
      });
    });
  });

  suite("Clear Checksums", async function () {

    /**
    * 
    */
    test("should execute 'Clear Checksums' command", async function () {
      this.timeout(40_000);
      await resetDB();

      await wait();

      const input = await LiquibaseGUITestUtils.preCommandExecution("update");

      await input.setText('dummy');
      await input.confirm();
      await wait();

      await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
      await input.selectQuickPick(1);
      await wait();

      await input.setText("Load All ");
      await input.confirm();
      await wait();

      await input.toggleAllQuickPicks(true);
      await input.confirm();
      await wait();

      await LiquibaseGUITestUtils.preCommandExecution("Clear Checksums");

      await input.setText('dummy');
      await input.confirm();
      await wait();

      assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'clear-checksums' was executed successfully."));
    });
  });

  suite("Rollback to Tag", async function () {

    /**
    * 
    */
    test("should execute 'Rollback to Tag' command", async function () {
      this.timeout(80_000);
      await resetDB();

      await wait();

      //execute only one changeset to roll back to
      const input = await LiquibaseGUITestUtils.preCommandExecution("update");

      await input.setText('dummy');
      await input.confirm();
      await wait();

      await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
      await input.selectQuickPick(1);
      await wait();

      await input.setText("Load All ");
      await input.confirm();
      await wait();

      await input.setText("foo");
      await input.toggleAllQuickPicks(true);
      await input.confirm();
      await wait();

      //set tag
      await LiquibaseGUITestUtils.preCommandExecution("create tag");

      await input.setText('dummy');
      await input.confirm();
      await wait();

      await input.setText("test");
      await input.confirm();
      await wait();


      //Update all datasets
      await LiquibaseGUITestUtils.preCommandExecution("update");

      await input.setText('dummy');
      await input.confirm();
      await wait();

      await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
      await input.selectQuickPick(1);
      await wait();

      await input.setText("Use any ");
      await input.confirm();
      await wait();

      await input.toggleAllQuickPicks(true);
      await input.confirm();
      await wait();

      //rollback time
      await LiquibaseGUITestUtils.preCommandExecution("Rollback to Tag");

      await input.setText('dummy');
      await input.confirm();
      await wait();

      await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
      await input.selectQuickPick(1);
      await wait();

      await input.setText("Load All ");
      await input.confirm();
      await wait();

      await input.toggleAllQuickPicks(true);
      await input.confirm();
      await wait();

      await input.setText("test");
      await input.confirm();
      await wait();
      await wait();

      //check if the message is popping up
      assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'rollback' was executed successfully."));
      assert.ok((await MariaDbDockerTestUtils.executeSQL(pool, "SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'company'"))?.length);

      //TODO: add db query to check if the rollback was correct -> Spoiler, it is not, maybe splitting files will help
    });
  });



  /**
  * This suite of tests is designed to validate the functionality of the 'db-doc' command in a Liquibase extension for Visual Studio Code.
  */
  suite("db-doc", async function () {

    /**
     * This test verifies that the 'db-doc' command is executed successfully.
     * It sets up a temporary database, generates documentation using Liquibase, and checks for the existence of the generated documentation file.
     */
    test("should execute 'db-doc' command", async function () {
      // Extend the timeout to accommodate potentially long-running Liquibase operations.
      this.timeout(80_000);

      // Reset the temporary database to ensure a clean state.
      await resetDB();

      // Prepare input for the command execution.
      const input = await LiquibaseGUITestUtils.preCommandExecution("Generate database documentation (db-doc)");

      await input.setText('dummy');
      await input.confirm();
      await wait();

      // Set the path to the Liquibase changelog file.
      await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
      await input.selectQuickPick(1);
      await wait();

      // Set the output directory for the generated documentation.
      await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "db-doc"));

      // Confirm the output directory. (Note: Due to an issue, double confirmation is required)
      await input.confirm();
      await input.confirm(); // Double confirmation workaround

      await wait();
      await wait();

      // Assert that the 'db-doc' command was executed successfully.
      assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'db-doc' was executed successfully."));

      // Assert that a file of the generated documentation exists.
      assert.ok(fs.existsSync(path.join(process.cwd(), "out", "temp", "workspace", "db-doc", "index.html")));
    });
  });

  suite("generate changelog", async function () {

    /**
    * 
    */
    test("should execute 'generate changelog' command", async function () {
      this.timeout(80_000);
      await resetDB();

      await wait();

      await MariaDbDockerTestUtils.executeSQL(pool, "CREATE TABLE test_table (column1 char(36), column2 varchar(255))");

      await wait();

      const input = await LiquibaseGUITestUtils.preCommandExecution("generate changelog");

      await input.setText('dummy');
      await input.confirm();
      await wait();

      await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "myFolder"));
      await input.confirm();
      await input.confirm();
      await wait();

      await input.confirm();

      await wait();

      assert.ok(fs.existsSync(path.join(process.cwd(), "out", "temp", "workspace", "myFolder", "changelog.xml")));
    });
  });

  suite("diff", async function () {
    /**
     * 
     */
    test("should execute 'diff' command", async function () {
      this.timeout(80_000);
      await resetDB();

      await wait();

      await MariaDbDockerTestUtils.executeSQL(pool, "CREATE SCHEMA data2");

      await LiquibaseGUITestUtils.addConfiguration("dummy2", path.join(process.cwd(), "out", "temp", "workspace"), "dummy2.liquibase.properties");

      const input = await LiquibaseGUITestUtils.preCommandExecution("update");

      await input.setText('dummy');
      await input.confirm();
      await wait();

      await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
      await input.selectQuickPick(1);
      await wait();

      await input.setText("Use any ");
      await input.confirm();
      await wait();

      await input.toggleAllQuickPicks(true);
      await input.confirm();
      await wait();

      await LiquibaseGUITestUtils.preCommandExecution("diff");

      await wait();

      await input.setText('dummy');
      await input.confirm();
      await wait();

      await input.setText('dummy2');
      await input.confirm();
      await wait();

      await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "myFolder"));
      await input.confirm();
      await input.confirm();
      await wait();

      await input.confirm();
      await wait();

      await input.toggleAllQuickPicks(true);
      await input.confirm();
      await wait();
      await wait();

      assert.ok(fs.existsSync(path.join(process.cwd(), "out", "temp", "workspace", "myFolder", "diff.txt")));
    });
  });





  suite("Update-sql", async function () {

    /**
    * 
    
    test("should execute 'Update SQL' command", async function () {
      this.timeout(80_000);
      await resetDB();
  
      //execute only one changeset to roll back to
      const input = await LiquibaseGUITestUtils.preCommandExecution("update-sql");
  
      await input.setText('dummy');
      await input.confirm();
      await wait();
  
      await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
      await input.selectQuickPick(1);
      await wait();
  
      await input.setText("Load All ");
      await input.confirm();
      await wait();
  
      await input.toggleAllQuickPicks(true);
      await input.confirm();
      await wait();
  
      await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase"));
      await input.confirm(); //this dumb shit only works if you DOUBLE CONFIRM IT -> https://github.com/redhat-developer/vscode-extension-tester/blob/b283b0f7a1ca451b9decf6b08d76fda24134f897/docs/Home.md?plain=1#L77
      await input.confirm();
      await wait();
  
      await input.setText("update.sql");
      await input.confirm();
      await wait();
      await wait();
  
      assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'update-sql' was executed successfully."));
      assert.ok(fs.existsSync(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "update.sql")));
    });
    
  */
  });



  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  /**
   * Cartesian Product thingy
   * @param callback the test that will be executed
   */
  function matrixExecution(options: string[], execFunctions: object, callback: (option: string, exec: () => Promise<void>, key: string) => void): void {
    options.forEach(option => {
      Object.entries(execFunctions).forEach(([key, exec]) => {
        callback(option, exec, key);
      });
    });
  }

  /**
   * 
   */
  async function resetDB(): Promise<void> {
    await MariaDbDockerTestUtils.executeSQL(pool, "DROP SCHEMA data");
    await MariaDbDockerTestUtils.executeSQL(pool, "CREATE SCHEMA data");
  }
});




/**
 * 
 */
async function wait(): Promise<void> {
  await new Promise((r) => setTimeout(r, 2000));
}

/**
 * When called, will select everything in the InputBox and simply continue the process
 */
async function getAllContext(): Promise<void> {
  const input = await InputBox.create();
  await input.toggleAllQuickPicks(true);
  await input.confirm();
  await wait();
}

/**
 * When called, will select the first possible value in the InputBox and simply continue the process
 */
async function getFirstContext(): Promise<void> {
  const input = await InputBox.create();
  await input.setText("foo");
  await input.toggleAllQuickPicks(true);
  await input.confirm();
  await wait();
}

/**
 * When called, will not input anything in the InputBox and simply continue the process
 */
async function getNoneContext(): Promise<void> {
  const input = await InputBox.create();
  await input.confirm();
  await wait();
}

