import {
  addCommandAction,
  buildAdditionalCmdArguments,
  handleCommandArgs,
  HandleCommandArgsResults,
  handleResultsOfCommandExecuted,
  PickPanelConfig,
  transformCommandArgsAfterInput,
  TransferDataForCommand,
} from "../../registerLiquibaseCommand";
import assert from "assert";
import * as vscode from "vscode";
import { ConnectionType, PROPERTY_FILE } from "../../input/ConnectionType";
import * as changelogInput from "../../handleChangelogFileInput";
import Sinon from "sinon";
import path from "path";
import { TestUtils } from "./TestUtils";
import { Logger } from "@aditosoftware/vscode-logging";
import { DialogValues, InputBox } from "@aditosoftware/vscode-input";
import * as execution from "../../executeJar";
import { TransferActionForCommand } from "../../TransferActionForCommand";

/**
 * Tests the class `registerLiquibaseCommand`.
 */
suite("registerLiquibaseCommand", () => {
  /**
   * Inits the logger before all tests.
   */
  suiteSetup("init logger", () => {
    TestUtils.initLoggerForTests();
  });

  /**
   * Create a stub that will return `process.cwd` as a result of `getWorkFolder`
   */
  setup("create stubs", () => {
    Sinon.stub(changelogInput, "getWorkFolder").returns(process.cwd());
  });

  /**
   * Restore all stubs after the tests.
   */
  teardown("restore stubs", () => {
    Sinon.restore();
  });

  /**
   * Tests the method `addCommandAction`.
   */
  suite("addCommandAction", () => {
    /**
     * Tests that the call to the method without any configuration does work
     */
    test("should work without configuration", async () => {
      await assert.doesNotReject(addCommandAction("test-command", [], []));
    });

    /**
     * Tests that the call to the method without any configuration does work
     */
    test("should work normally", async () => {
      const inputBox = new ConnectionType({ name: PROPERTY_FILE });

      Sinon.stub(inputBox, "showDialog").resolves(TestUtils.basicPathToOut);

      Sinon.stub(execution, "executeJar").resolves(0);

      await assert.doesNotReject(
        addCommandAction(
          "test-command",
          [
            {
              input: inputBox,
            },
          ],
          []
        )
      );
    });

    /**
     * Tests that everything works when a input step was cancelled.
     */
    test("should work when command was cancelled", async () => {
      const inputBox = new InputBox({ name: "foo" });

      Sinon.stub(inputBox, "showDialog").resolves(undefined);

      await assert.doesNotReject(
        addCommandAction(
          "test-command",
          [
            {
              input: inputBox,
            },
          ],
          []
        )
      );
    });

    /**
     * Tests that the `beforeCommandAction` was called.
     */
    test("should execute before command action", async () => {
      let called = false;

      await addCommandAction("test-command", [], [], {
        beforeCommandAction: async () => {
          called = true;
        },
      });

      assert.ok(called, "before action was called");
    });
  });

  /**
   * Tests the method `handleResultsOfCommandExecuted`.
   */
  suite("handleResultsOfCommandExecuted", () => {
    /**
     * Tests that the command will be handled correctly with exit code 0.
     */
    test("should handle exit code 0", () => {
      const infoMessage = TestUtils.createInfoMessageStubWithSelection();

      handleResultsOfCommandExecuted(0, "test-command", new DialogValues(), [], {});

      Sinon.assert.calledOnce(infoMessage);
      Sinon.assert.calledWith(
        infoMessage,
        "Liquibase command 'test-command' was executed successfully.",
        Sinon.match.any,
        Sinon.match.any
      );
    });

    /**
     * Tests that the command will be handled correctly with exit code 1.
     */
    test("should handle exit code 1", () => {
      const warnMessage = Sinon.spy(Logger.getLogger(), "warn");
      const showOutputChannel = Sinon.spy(Logger.getLogger(), "showOutputChannel");

      handleResultsOfCommandExecuted(1, "test-command", new DialogValues(), []);

      Sinon.assert.calledOnce(warnMessage);
      Sinon.assert.calledWith(warnMessage, {
        message:
          "Liquibase command 'test-command' was not executed successfully. Please see logs for more information.",
        notifyUser: true,
      });
      Sinon.assert.calledOnce(showOutputChannel);
    });

    /**
     * Tests that any after command action were called.
     */
    test("should handle after command actions given", () => {
      let called = false;

      handleResultsOfCommandExecuted(0, "test-command", new DialogValues(), [], {
        afterCommandAction: () => {
          called = true;
        },
      });

      assert.ok(called, "the after command action was not called");
    });

    /**
     * Tests that any transfer action was called.
     */
    test("should handle transfer actions", () => {
      let called = false;

      /**
       * Any dummy transfer action during the test.
       */
      class DummyTransferActionForCommand extends TransferActionForCommand {
        /**
         * @override
         */
        executeAfterCommandAction(): void {
          called = true;
        }
      }

      handleResultsOfCommandExecuted(0, "test-command", new DialogValues(), [new DummyTransferActionForCommand()], {});

      assert.ok(called, "the after command action was not called");
    });
  });

  /**
   * Tests the method `handleCommandArgs`.
   */
  suite("handleCommandArgs", () => {
    /**
     * Tests that the method works as normal when no command args were given.
     */
    test("should work with no vscode command arg", () => {
      const result = handleCommandArgs([], []);

      assert.deepStrictEqual(result, {
        isRightClickMenuAction: false,
        preBuiltDialogValues: new DialogValues(),
        transferActions: [],
      } as HandleCommandArgsResults);
    });

    /**
     * Tests that the handling of an argument from an RMB menu (= a VSCode uri) does work.
     */
    test("should work with uri command arg", () => {
      const uri = vscode.Uri.file(process.cwd());

      const expectedDialogValues = new DialogValues();
      expectedDialogValues.uri = uri;

      const result = handleCommandArgs([uri], []);

      assert.deepStrictEqual(result, {
        isRightClickMenuAction: true,
        preBuiltDialogValues: expectedDialogValues,
        transferActions: [],
      } as HandleCommandArgsResults);
    });

    /**
     * Tests that the `TransferDataForCommand` will be transferred correctly, when a `PickPanelConfig` with the name exists.
     */
    test("should work with TransferDataForCommand command arg and existing pickPanelConfig", () => {
      const expectedDialogValues = new DialogValues();
      expectedDialogValues.addValue("foo", "bar");

      const result = handleCommandArgs(
        [new TransferDataForCommand("foo", "bar")],
        [
          {
            input: new InputBox({ name: "foo" }),
          },
        ]
      );

      assert.deepStrictEqual(result, {
        isRightClickMenuAction: false,
        preBuiltDialogValues: expectedDialogValues,
        transferActions: [],
      } as HandleCommandArgsResults);
    });

    /**
     * Tests that the `TransferDataForCommand` will be not transferred, when no `PickPanelConfig` with the name exists.
     */
    test("should work with TransferDataForCommand command arg and not existing pickPanelConfig", () => {
      const result = handleCommandArgs([new TransferDataForCommand("foo", "bar")], []);

      assert.deepStrictEqual(result, {
        isRightClickMenuAction: false,
        preBuiltDialogValues: new DialogValues(),
        transferActions: [],
      } as HandleCommandArgsResults);
    });

    /**
     * Tests that the TransferActionForCommand will be correctly added to the `transferActions`.
     */
    test("should work with TransferActionForCommand command arg", () => {
      /**
       * A dummy class needed for tests.
       */
      class DummyTransferActionForCommand extends TransferActionForCommand {
        /**
         * @override
         */
        executeAfterCommandAction(): void {
          throw new Error("Method not needed for tests.");
        }
      }

      const result = handleCommandArgs([new DummyTransferActionForCommand()], []);

      assert.deepStrictEqual(result, {
        isRightClickMenuAction: false,
        preBuiltDialogValues: new DialogValues(),
        transferActions: [new DummyTransferActionForCommand()],
      } as HandleCommandArgsResults);
    });

    /**
     * Tests that the input `undefined` will produce no error.
     */
    test("should work with undefined", () => {
      const result = handleCommandArgs([undefined], []);

      assert.deepStrictEqual(result, {
        isRightClickMenuAction: false,
        preBuiltDialogValues: new DialogValues(),
        transferActions: [],
      } as HandleCommandArgsResults);
    });

    /**
     * Tests that any other value (e.g. a string) will do nothing
     */
    test("should work with any other command arg", () => {
      const debugLog = Sinon.spy(Logger.getLogger(), "debug");

      const result = handleCommandArgs(["foo"], []);

      assert.deepStrictEqual(result, {
        isRightClickMenuAction: false,
        preBuiltDialogValues: new DialogValues(),
        transferActions: [],
      } as HandleCommandArgsResults);

      Sinon.assert.calledOnce(debugLog);
    });
  });

  /**
   * Tests the method `buildAdditionalArguments`.
   */
  suite("buildAdditionalArguments", () => {
    /**
     * Tests that the method will produce an empty array when no additional arguments were given.
     */
    test("should work with no additional arguments", () => {
      assert.deepStrictEqual(buildAdditionalCmdArguments(false), []);
    });

    /**
     * Tests that the arguments are created when `commandLineArg` is given.
     */
    test("should work with command line arguments given", () => {
      assert.deepStrictEqual(
        buildAdditionalCmdArguments(false, {
          commandLineArgs: ["foo", "bar"],
        }),
        ["foo", "bar"]
      );
    });

    /**
     * Tests that the search path will be added when it is required and no RMB call is there.
     */
    test("should work with search path given when no RMB menu", () => {
      assert.deepStrictEqual(buildAdditionalCmdArguments(false, { searchPathRequired: true }), [
        `-Dliquibase.searchPath=${process.cwd()}`,
      ]);
    });

    /**
     * Tests that the search path will be not added, if we are in a RMB call, even it is required
     */
    test("should work with search path given when RMB menu", () => {
      assert.deepStrictEqual(buildAdditionalCmdArguments(true, { searchPathRequired: true }), []);
    });
  });

  /**
   * Tests the method `transformCommandArgsAfterInput`
   */
  suite("transformCommandArgsAfterInput", () => {
    /**
     * Tests that the arguments will be added normally as expected.
     */
    test("should call normally", () => {
      const expectedArgs: string[] = ["--my-args=a,b", "--additional-arg=true", "--force=true"];

      const dialogValues = new DialogValues();
      dialogValues.addValue(PROPERTY_FILE, "data.liquibase.properties");
      dialogValues.addValue("foo", "not in pick panel config");
      dialogValues.addValue("bar", ["a", "b"]);

      const pickPanelConfigs: PickPanelConfig[] = [
        {
          input: new ConnectionType({ name: PROPERTY_FILE }),
        },
        {
          input: new InputBox({ name: "bar" }),
          cmdArgs: "--my-args",
          createCmdArgs: () => ["--additional-arg=true", "--force=true"],
        },
      ];

      assertTransformCommandArgsAfterInput(
        dialogValues,
        pickPanelConfigs,
        "data.liquibase.properties",
        undefined,
        expectedArgs
      );
    });

    /**
     * Tests that the method will transform the given changelog into an uri and adds the correct arguments.
     */
    test("should work with changelog given", () => {
      const changelogPath = path.join(process.cwd(), "changelog.xml");

      const dialogValues = new DialogValues();
      dialogValues.addValue(changelogInput.HandleChangelogFileInput.CHANGELOG_NAME, changelogPath);

      assertTransformCommandArgsAfterInput(dialogValues, [], undefined, vscode.Uri.file(changelogPath), [
        "--changelogFile=changelog.xml",
        `-Dliquibase.searchPath=${process.cwd()}`,
      ]);
    });
  });
});

/**
 * Asserts the calling of the method `transformCommandArgsAfterInput`.
 *
 * @param dialogValues - the dialog values that should be passed
 * @param pickPanelConfigs - the given `PickPanelConfigs`
 * @param expectedPropertyFilePath - the expected path to the property file
 * @param expectedUri - the expected uri set in the dialog values
 * @param expectedArgs - the expected created arguments
 */
function assertTransformCommandArgsAfterInput(
  dialogValues: DialogValues,
  pickPanelConfigs: PickPanelConfig[],
  expectedPropertyFilePath: string | undefined,
  expectedUri: vscode.Uri | undefined,
  expectedArgs: string[]
): void {
  const args: string[] = [];

  const result = transformCommandArgsAfterInput(dialogValues, pickPanelConfigs, args);

  assert.strictEqual(result, expectedPropertyFilePath, "result should match");
  assert.strictEqual(dialogValues.uri?.fsPath, expectedUri?.fsPath, "uri should match");
  assert.deepStrictEqual(args, expectedArgs, "args should match");
}
