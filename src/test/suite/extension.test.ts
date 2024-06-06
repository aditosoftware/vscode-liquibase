import * as vscode from "vscode";
import path from "path";
import Sinon from "sinon";
import { TestUtils } from "./TestUtils";
import * as fs from "fs";
import { PropertiesEditor } from "properties-file/editor";
import { randomUUID } from "crypto";
import { DockerTestUtils } from "./DockerTestUtils";
import { HandleChangelogFileInput } from "../../readChangelogFile";

/**
 * Tests commands of the extension.
 */
suite("Extension Test Suite", () => {
  /**
   * The path were the workspace is for the test.
   */
  const workspacePath = path.join(__dirname, "..", "..", "temp", "workspace");

  /**
   * A folder in the workspace were all output should be written to.
   */
  const outputFolder: string = path.join(workspacePath, "output");

  /**
   * The existing changelog file in the workspace.
   */
  const changelogFile = path.join(workspacePath, ".liquibase", "changelog.xml");

  const tag = randomUUID();
  const contextLoaded = "Load all contexts from the changelog file";

  /**
   * Init the extension.
   * Also creates a properties file for the test.
   */
  suiteSetup("init extension and properties file", async function () {
    this.timeout(60_000);

    // start a maria db container and wait for its status
    await DockerTestUtils.startContainer();
    await DockerTestUtils.checkContainerStatus();

    fs.mkdirSync(outputFolder);

    const liquibaseFolder = path.join(workspacePath, "data", "liquibase");

    fs.mkdirSync(liquibaseFolder, { recursive: true });
    const propertiesFile = path.join(liquibaseFolder, "data.liquibase.properties");
    fs.writeFileSync(
      path.join(liquibaseFolder, "settings.json"),
      JSON.stringify({
        data: propertiesFile,
      })
    );

    const properties = new PropertiesEditor("# written by the tests");
    properties.insert("username", DockerTestUtils.username);
    properties.insert("password", DockerTestUtils.password);
    properties.insert("url", `jdbc:mariadb://localhost:3310/${DockerTestUtils.dbName}`);

    fs.writeFileSync(propertiesFile, properties.format());

    // init the extension with a basic command
    await TestUtils.initExtension();
  });

  /**
   * Remove the container after all tests.
   */
  suiteTeardown("remove docker container", async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });

  /**
   * Restore all stubs after the tests.
   */
  teardown("restore stubs", () => {
    Sinon.restore();
  });

  const commandArguments: CommandArgument[] = [
    {
      command: "status",
      answers: {
        openDialog: [changelogFile],
        quickPick: [HandleChangelogFileInput.CHOOSE_CHANGELOG_OPTION, contextLoaded],
        loadContexts: true,
      },
    },
    {
      command: "update",
      answers: {
        openDialog: [changelogFile],
        quickPick: [HandleChangelogFileInput.CHOOSE_CHANGELOG_OPTION, contextLoaded],
        loadContexts: true,
      },
    },
    {
      command: "drop-all",
      answers: {},
    },
    {
      command: "validate",
      answers: {
        openDialog: [changelogFile],
        quickPick: [HandleChangelogFileInput.CHOOSE_CHANGELOG_OPTION],
      },
    },
    {
      command: "diff",
      answers: {
        selectReferenceConnection: true,
        quickPick: ["tables"],
        openDialog: [outputFolder],
        inputBox: "diff.txt",
      },
    },
    {
      command: "db-doc",
      answers: {
        openDialog: [changelogFile, outputFolder],
        quickPick: [HandleChangelogFileInput.CHOOSE_CHANGELOG_OPTION],
      },
    },
    {
      command: "generate-changelog",
      answers: {
        openDialog: [outputFolder],
        inputBox: "changelog.yaml",
      },
    },
    {
      command: "unexpected-changesets",
      answers: {
        openDialog: [changelogFile],
        quickPick: [HandleChangelogFileInput.CHOOSE_CHANGELOG_OPTION, contextLoaded],
        loadContexts: true,
      },
    },
    {
      command: "changelog-sync",
      answers: {
        openDialog: [changelogFile],
        quickPick: [HandleChangelogFileInput.CHOOSE_CHANGELOG_OPTION, contextLoaded],
        loadContexts: true,
      },
    },
    {
      command: "clear-checksums",
      answers: {},
    },
    {
      command: "history",
      answers: {
        openDialog: [outputFolder],
        inputBox: "history.txt",
        quickPick: ["TABULAR"],
      },
    },
    {
      command: "tag",
      answers: {
        inputBox: tag,
      },
    },
    {
      command: "tag-exists",
      answers: {
        inputBox: tag,
      },
    },
    {
      command: "rollback",
      answers: {
        openDialog: [changelogFile],
        quickPick: [HandleChangelogFileInput.CHOOSE_CHANGELOG_OPTION, contextLoaded],
        loadContexts: true,
        inputBox: tag,
      },
    },
    {
      command: "update-sql",
      answers: {
        openDialog: [changelogFile, outputFolder],
        quickPick: [HandleChangelogFileInput.CHOOSE_CHANGELOG_OPTION, contextLoaded],
        inputBox: "update-sql.sql",
        loadContexts: true,
      },
    },
  ];

  /**
   * Execute some commands.
   */
  commandArguments.forEach((commandArgument: CommandArgument) => {
    test(`should execute command ${commandArgument.command}`, async () => {
      // create a real quick pick for afterwards
      const realQuickPick = vscode.window.createQuickPick();

      // stub the showing of the quick picks
      const quickPick = Sinon.stub(vscode.window, "showQuickPick");
      let quickPickCount = 1;

      // first quick pick is always property file, therefore just return first item
      quickPick.onFirstCall().callsFake(async (items) => {
        return (await items)[0];
      });

      // if there is a selection of the reference, connection, this will be the second call
      if (commandArgument.answers.selectReferenceConnection) {
        quickPickCount++;
        quickPick.onSecondCall().callsFake(async (items) => {
          return (await items)[0];
        });
      }

      // then add a possible additional answers
      if (commandArgument.answers.quickPick) {
        quickPickCount += commandArgument.answers.quickPick.length;
        commandArgument.answers.quickPick.forEach((value, index) => {
          const callCount = (commandArgument.answers.selectReferenceConnection ? 2 : 1) + index;
          quickPick.onCall(callCount).resolves({ label: value });
        });
      }

      // stub the showing of an input box
      const inputBox = Sinon.stub(vscode.window, "showInputBox");
      if (commandArgument.answers.inputBox) {
        inputBox.onFirstCall().resolves(commandArgument.answers.inputBox);
      }

      // stub the showing of an open dialog
      const openDialog = Sinon.stub(vscode.window, "showOpenDialog");
      if (commandArgument.answers.openDialog) {
        for (let callCount = 0; callCount < commandArgument.answers.openDialog.length; callCount++) {
          openDialog.onCall(callCount).resolves([vscode.Uri.file(commandArgument.answers.openDialog[callCount])]);
        }
      }

      // stub the showing of a loading quick pick. This is a bit more complex and only needed for loading the contexts
      const loadingQuickPick = Sinon.stub(vscode.window, "createQuickPick");
      if (commandArgument.answers.loadContexts) {
        const copyElementWithAccept = Object.create(realQuickPick);
        copyElementWithAccept.onDidAccept = (callback: () => void) => callback();
        // and transforms this any element back to an vscode.QuickPick, so it can be returned by createQuickPick
        const quickPickWithAccept = copyElementWithAccept as vscode.QuickPick<vscode.QuickPickItem>;
        Sinon.stub(quickPickWithAccept, "selectedItems").get(() => {
          return [{ label: "bar" }, { label: "baz" }, { label: "foo" }];
        });
        loadingQuickPick.returns(quickPickWithAccept);
      }

      // stub the showing of the info message
      const infoMessage = Sinon.stub(vscode.window, "showInformationMessage");
      // and answer every call with the first messageItem selected
      infoMessage.callsFake(async (_message, _options, ...items) => {
        return items[0];
      });

      // await command itself
      await vscode.commands.executeCommand(`liquibase.${commandArgument.command}`);

      // This is the message that indicates that the command was executed successfully.
      const successMessage = `Liquibase command '${commandArgument.command}' was executed successfully.`;

      // liquibase will be executed in child thread, therefore we need to wait for it to be done
      const maxTimeout = 5_000;
      const waitTimeout = 500;
      for (let tryCount = 0; tryCount < maxTimeout / waitTimeout; tryCount++) {
        // wait a bit
        await new Promise((r) => setTimeout(r, waitTimeout));

        if (infoMessage.calledWith(successMessage)) {
          // check if the info message was written, then end waiting
          break;
        }
      }

      // after all the waiting, assert the correct calling of the elements.
      Sinon.assert.called(infoMessage);
      Sinon.assert.calledWith(infoMessage);

      Sinon.assert.callCount(quickPick, quickPickCount);
      Sinon.assert.callCount(inputBox, commandArgument.answers.inputBox ? 1 : 0);
      Sinon.assert.callCount(loadingQuickPick, commandArgument.answers.loadContexts ? 1 : 0);
      Sinon.assert.callCount(openDialog, commandArgument.answers.openDialog?.length ?? 0);
    }).timeout(10_000);
  });
});

/**
 * The arguments for one command test.
 */
type CommandArgument = {
  /**
   * The name of the command that should be executed. The liquibase prefix is not needed.
   */
  command: string;

  /**
   * The different answers that should be asserted during the command.
   *
   * **Note:** There will be always an assert for selecting the property file.
   */
  answers: {
    /**
     * Indicates if the contexts were loaded.
     * If this is set, then automatically the contexts `bar`, `baz` and `foo` are selected in the corresponding dialog.
     */
    loadContexts?: boolean;

    /**
     * Indicates if a reference connection was loaded.
     * If this is set, then the property file is set as the reference connection as well.
     */
    selectReferenceConnection?: boolean;

    /**
     * Indicates the value that were selected by the quick pick.
     */
    quickPick?: string[];

    /**
     * Indicates the value that was inputted in an input box
     */
    inputBox?: string;

    /**
     * Indicates the values that were selected by the open dialog.
     */
    openDialog?: string[];
  };
};
