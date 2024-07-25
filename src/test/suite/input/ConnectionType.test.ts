import Sinon from "sinon";
import { ConnectionType } from "../../../input/ConnectionType";
import * as readConfiguration from "../../../configuration/handle/readConfiguration";
import { DialogValues } from "@aditosoftware/vscode-input";
import assert from "assert";
import * as vscode from "vscode";

/**
 * Tests for the connection type.
 */
suite("ConnectionType test", () => {
  const connectionType = new ConnectionType({ name: "propertyFile" });

  const title = "My title";

  let readConfigurationStub: Sinon.SinonStub;

  /**
   * Creates the stubs.
   */
  setup("create stubs", () => {
    readConfigurationStub = Sinon.stub(readConfiguration, "readConfiguration");
  });

  /**
   * Restore all sinon stubs.
   */
  teardown("restore stubs", () => {
    readConfigurationStub.restore();
  });

  /**
   * Tests the dialog with no configuration.
   */
  suite("no configuration", () => {
    let vscodeShowErrorMessage: Sinon.SinonStub;
    let vscodeExecuteCommand: Sinon.SinonStub;

    /**
     * Creates the stubs.
     */
    setup("create stubs", () => {
      vscodeShowErrorMessage = Sinon.stub(vscode.window, "showErrorMessage");
      vscodeExecuteCommand = Sinon.stub(vscode.commands, "executeCommand");
    });

    /**
     * Restore all sinon stubs.
     */
    teardown("restore stubs", () => {
      vscodeShowErrorMessage.restore();
      vscodeExecuteCommand.restore();
    });

    /**
     * Validates, that an empty configuration will result in a correct error message.
     */
    test("should work with empty configuration", (done) => {
      vscodeShowErrorMessage.resolves({ title: "Create configuration" });

      readConfigurationStub.resolves(undefined);

      connectionType
        .showDialog(new DialogValues(), title)
        .then((result) => {
          assert.deepStrictEqual(undefined, result);

          // validate that error message was shown
          Sinon.assert.calledOnce(vscodeShowErrorMessage);
          Sinon.assert.calledWith(vscodeShowErrorMessage, "No configurations found. Please create a configuration.", {
            title: "Create configuration",
          });

          // validate the command was called
          Sinon.assert.calledOnce(vscodeExecuteCommand);
          Sinon.assert.calledWith(vscodeExecuteCommand, "liquibase.createLiquibaseConfiguration");

          done();
        })
        .catch((error) => done(error));
    });
  });

  /**
   * Tests the dialog with some configuration  available.
   */
  suite("some configuration", () => {
    const configuration: Record<string, string> = {
      system: "my system",
      data: "my data",
    };
    const expectedQuickPickItems: vscode.QuickPickItem[] = [
      { label: "data", detail: "my data" },
      { label: "system", detail: "my system" },
    ];

    let vscodeShowQuickPick: Sinon.SinonStub;

    /**
     * Creates the stubs.
     */
    setup("create stubs", () => {
      vscodeShowQuickPick = Sinon.stub(vscode.window, "showQuickPick");
    });

    /**
     * Restore all sinon stubs.
     */
    teardown("restore stubs", () => {
      vscodeShowQuickPick.restore();
    });

    [
      {
        connectionType: new ConnectionType({ name: "propertyFile" }),
        expectedPlaceHolder: "Select your configuration",
      },
      {
        connectionType: new ConnectionType({ name: "referencePropertyFile" }),
        expectedPlaceHolder: "Select your reference configuration",
      },
    ].forEach((pElement) => {
      /**
       * Tests that it works with any value selected.
       */
      test(`should work with value selected (${pElement.connectionType.inputOptions.name})`, (done) => {
        readConfigurationStub.resolves(configuration);

        vscodeShowQuickPick.resolves({
          label: "my selected label",
          description: "my selected description",
          detail: "my selected detail",
        });

        pElement.connectionType
          .showDialog(new DialogValues(), title)
          .then((result) => {
            assert.deepStrictEqual("my selected detail", result);

            Sinon.assert.calledWithExactly(vscodeShowQuickPick, expectedQuickPickItems, {
              title,
              placeHolder: pElement.expectedPlaceHolder,
              canPickMany: false,
            });

            done();
          })
          .catch((error) => done(error));
      });
    });

    /**
     * Tests that the method works when no value is selected.
     */
    test("should work when no value selected", (done) => {
      readConfigurationStub.resolves(configuration);

      vscodeShowQuickPick.resolves(undefined);

      connectionType
        .showDialog(new DialogValues(), title)
        .then((result) => {
          assert.deepStrictEqual(undefined, result);

          Sinon.assert.calledWithExactly(vscodeShowQuickPick, expectedQuickPickItems, {
            title,
            placeHolder: "Select your configuration",
            canPickMany: false,
          });

          done();
        })
        .catch((error) => done(error));
    });
  });
});
