import * as vscode from "vscode";
import path from "path";
import Sinon from "sinon";
import { TestUtils } from "./TestUtils";
import * as fs from "fs";
import { PropertiesEditor } from "properties-file/editor";
import { randomUUID } from "crypto";
import { DockerTestUtils } from "./DockerTestUtils";
import { CHOOSE_CHANGELOG_OPTION } from "../../constants";
import assert from "assert";
import { validateInput } from "../../extension";

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
    this.timeout(80_000);

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
        quickPick: [[CHOOSE_CHANGELOG_OPTION], [contextLoaded], ["bar", "baz", "foo"]],
      },
    },
    {
      command: "update",
      answers: {
        openDialog: [changelogFile],
        quickPick: [[CHOOSE_CHANGELOG_OPTION], [contextLoaded], ["bar", "baz", "foo"]],
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
        quickPick: [[CHOOSE_CHANGELOG_OPTION]],
      },
    },
    {
      command: "diff",
      answers: {
        selectReferenceConnection: true,
        quickPick: [[]],
        openDialog: [outputFolder],
        inputBox: ["diff.txt"],
      },
    },
    {
      command: "db-doc",
      answers: {
        openDialog: [changelogFile, outputFolder],
        quickPick: [[CHOOSE_CHANGELOG_OPTION]],
      },
    },
    {
      command: "generate-changelog",
      answers: {
        openDialog: [outputFolder],
        quickPick: [[]],
        inputBox: ["changelog.yaml", "MY_TABLE"],
      },
    },
    {
      command: "unexpected-changesets",
      answers: {
        openDialog: [changelogFile],
        quickPick: [[CHOOSE_CHANGELOG_OPTION], [contextLoaded], ["bar", "baz", "foo"]],
      },
    },
    {
      command: "changelog-sync",
      answers: {
        openDialog: [changelogFile],
        quickPick: [[CHOOSE_CHANGELOG_OPTION], [contextLoaded], ["bar", "baz", "foo"]],
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
        inputBox: ["history.txt"],
        quickPick: [["TABULAR"]],
      },
    },
    {
      command: "tag",
      answers: {
        inputBox: [tag],
      },
    },
    {
      command: "tag-exists",
      answers: {
        inputBox: [tag],
      },
    },
    {
      command: "rollback",
      answers: {
        openDialog: [changelogFile],
        quickPick: [[CHOOSE_CHANGELOG_OPTION], [contextLoaded], ["bar", "baz", "foo"]],
        inputBox: [tag],
      },
    },
    {
      command: "update-sql",
      answers: {
        openDialog: [changelogFile, outputFolder],
        quickPick: [[CHOOSE_CHANGELOG_OPTION], [contextLoaded], ["bar", "baz", "foo"]],
        inputBox: ["update-sql.sql"],
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

      // create a real input for afterwards
      const realInput = vscode.window.createInputBox();

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

      // stub the showing of an input box
      const inputBox = Sinon.stub(vscode.window, "createInputBox");
      commandArgument.answers.inputBox?.forEach((value, index) => {
        const copyInputBox = Object.create(realInput);
        copyInputBox.onDidAccept = (callback: () => void) => {
          copyInputBox.value = value;
          callback();
          return {
            dispose: () => {},
          } as vscode.Disposable;
        };
        const inputBoxWithAccept = copyInputBox as vscode.InputBox;

        inputBox.onCall(index).returns(inputBoxWithAccept);
      });

      // stub the showing of an open dialog
      const openDialog = Sinon.stub(vscode.window, "showOpenDialog");
      commandArgument.answers.openDialog?.forEach((value, index) => {
        openDialog.onCall(index).resolves([vscode.Uri.file(value)]);
      });

      // stub the showing of a loading and normal quick pick created by the vscode-input.
      const loadingQuickPick = Sinon.stub(vscode.window, "createQuickPick");

      commandArgument.answers.quickPick?.forEach((value, index) => {
        const copyElementWithAccept = Object.create(realQuickPick);
        copyElementWithAccept.onDidAccept = (callback: () => void) => {
          callback();
          return {
            dispose: () => {},
          } as vscode.Disposable;
        };
        // and transforms this any element back to an vscode.QuickPick, so it can be returned by createQuickPick
        const quickPickWithAccept = copyElementWithAccept as vscode.QuickPick<vscode.QuickPickItem>;

        if (value.length !== 0) {
          Sinon.stub(quickPickWithAccept, "selectedItems").get(() => {
            return value.map((pValue) => {
              return { label: pValue, picked: true } as vscode.QuickPickItem;
            });
          });
        }

        loadingQuickPick.onCall(index).returns(quickPickWithAccept);
      });

      // stub the showing of the info message
      const infoMessage = Sinon.stub(vscode.window, "showInformationMessage");
      // and answer every call with the first messageItem selected
      infoMessage.callsFake(async (_message, _options, ...items) => {
        return items[0];
      });

      // await command itself
      await vscode.commands.executeCommand(`liquibase.${commandArgument.command}`);

      // This is the message that indicates that the command was executed successfully.
      await waitForCommandExecution(commandArgument.command, infoMessage);

      // after all the waiting, assert the correct calling of the elements.
      Sinon.assert.called(infoMessage);
      Sinon.assert.calledWith(infoMessage);

      Sinon.assert.callCount(quickPick, quickPickCount);
      Sinon.assert.callCount(inputBox, commandArgument.answers.inputBox?.length ?? 0);
      Sinon.assert.callCount(loadingQuickPick, commandArgument.answers.quickPick?.length ?? 0);
      Sinon.assert.callCount(openDialog, commandArgument.answers.openDialog?.length ?? 0);
    }).timeout(10_000);
  });

  [
    { input: "", expected: "Objects to include must not be empty" },
    { input: " ", expected: "Objects to include must not be empty" },
    { input: "x", expected: null },
  ].forEach((pArgument) => {
    /**
     * Tests that the input is validated correctly.
     */
    test(`should validate input for value '${pArgument.input}'`, () => {
      assert.strictEqual(validateInput(pArgument.input), pArgument.expected);
    });
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
     * Indicates if a reference connection was loaded.
     * If this is set, then the property file is set as the reference connection as well.
     */
    selectReferenceConnection?: boolean;

    /**
     * Indicates the value that were selected by the quick pick.
     * If you want the default selection (that means the values that were already selected when generating the items),
     * then you should leave the array empty.
     */
    quickPick?: string[][];

    /**
     * Indicates the value that was inputted in an input box
     */
    inputBox?: string[];

    /**
     * Indicates the values that were selected by the open dialog.
     */
    openDialog?: string[];
  };
};

/**
 * Waits for the command execution.
 *
 * @param command - the command that is currently executed
 * @param infoMessage - the stub to the info message
 */
async function waitForCommandExecution(command: string, infoMessage: Sinon.SinonStub): Promise<void> {
  const successMessage = `Liquibase command '${command}' was executed successfully.`;

  // liquibase will be executed in child thread, therefore we need to wait for it to be done
  const maxTimeout = 5000;
  const waitTimeout = 500;
  for (let tryCount = 0; tryCount < maxTimeout / waitTimeout; tryCount++) {
    // wait a bit
    await new Promise((r) => setTimeout(r, waitTimeout));

    if (infoMessage.calledWith(successMessage)) {
      // check if the info message was written, then end waiting
      break;
    }
  }
}
