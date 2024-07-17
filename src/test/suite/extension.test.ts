import { DialogValues } from "@aditosoftware/vscode-input";
import { activate, createGeneralStatusBarItem, setRequireForceAndForceParameter, validateInput } from "../../extension";
import assert from "assert";
import { Command } from "vscode";
import * as vscode from "vscode";
import { TestUtils } from "./TestUtils";
import Sinon from "sinon";
import * as fs from "fs";
import chai, { expect } from "chai";
import chaiString from "chai-string";

chai.use(chaiString);

/**
 * Tests the `extension.ts` file.
 * If you want to test the command more integration test like, then use `extension.it.test.ts`.
 */
suite("extension tests", () => {
  /**
   * Restores all stubs after the commands.
   */
  teardown("restore stubs", () => {
    Sinon.restore();
  });

  /**
   * Tests the validation of the inputs.
   */
  suite("validateInput", () => {
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
   * Tests the setting of the requireForce and force parameter.
   */
  suite("setRequireForceAndForceParameter", () => {
    /**
     * Tests the setting of the requireForce and force parameter.
     */
    test("should set requireForce and force", () => {
      const dialog = new DialogValues();
      dialog.addValue("confirmation", true);

      const result = setRequireForceAndForceParameter(dialog);

      assert.deepStrictEqual(
        result,
        ["--requireForce", "--force"],
        `The result ${result} should contain the requireForce and force parameter.`
      );
    });

    /**
     * Tests if the requireForce and force parameter is not set if confirmation is 'false'.
     */
    test("should not set requireForce and force if confirmation is 'false'", () => {
      const dialog = new DialogValues();
      dialog.addValue("confirmation", false);

      const result = setRequireForceAndForceParameter(dialog);

      assert.deepStrictEqual(result, [], `The result ${result} should be an empty array.`);
    });

    /**
     * Tests if an empty dialog does not set requireForce and force.
     */
    test("should not set requireForce and force if no dialog value available", () => {
      const dialog = new DialogValues();

      const result = setRequireForceAndForceParameter(dialog);

      assert.deepStrictEqual(result, [], `The result ${result} should be an empty array.`);
    });
  });

  /**
   * Tests the creation of the status bar item.
   */
  suite("createGeneralStatusBarItem", () => {
    /**
     * Tests that the status bar item was created.
     */
    test("should create general status bar item", async () => {
      const item = createGeneralStatusBarItem();

      // check that the command has the logo
      expect(item.text).to.include("$(liquibase-logo)");

      assert.ok(item.command);
      expect(item.command).to.not.be.a("string");

      const command = item.command as Command;

      // check that the command is a valid command
      const allCommands = await vscode.commands.getCommands();
      expect(allCommands).to.include(command.command);
    });
  });

  /**
   * Tests the `activate` method.
   */
  suite("activate", () => {
    /**
     * Tests that the activation of the extension does work.
     */
    test("should activate", async () => {
      const tempDir = TestUtils.createTempFolderForTests("extension");

      const memento: vscode.Memento = {
        keys: () => {
          throw new Error("not needed for tests");
        },
        get: () => {
          return undefined;
        },
        update: async () => {},
      };

      // stub the register of the commands, because otherwise we would register commands that are already registered
      const registerCommand = Sinon.stub(vscode.commands, "registerCommand");
      registerCommand.callsFake((command) => {
        expect(command).to.startWith("liquibase.");
        return { dispose() {} };
      });

      const context: vscode.ExtensionContext = {
        globalStorageUri: vscode.Uri.file(tempDir),
        extensionPath: tempDir,
        extensionUri: vscode.Uri.file(tempDir),
        logUri: vscode.Uri.file(tempDir),
        subscriptions: [],
        globalState: memento,
      } as unknown as vscode.ExtensionContext;

      await activate(context);

      // check that there were any subscriptions registered
      expect(context.subscriptions).to.have.lengthOf.above(20);

      const files = fs.readdirSync(tempDir);

      // in our temp dir, we should have two log files
      expect(files).to.contain("Liquibase.log");
      expect(files).to.contain("error.log");

      // all other files should be jar files
      files
        .filter((pFileName) => !pFileName.endsWith(".log"))
        .forEach((pFileName) => {
          expect(pFileName).to.endWith(".jar");
        });
    });
  });
});
