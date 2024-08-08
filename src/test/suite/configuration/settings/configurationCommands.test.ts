import assert from "assert";
import { randomUUID } from "crypto";
import { TestUtils } from "../../TestUtils";
import path from "path";
import * as vscode from "vscode";
import * as configurationCommand from "../../../../settings/configurationCommands";
import fs from "fs";
import { LiquibaseConfigurationPanel } from "../../../../panels/LiquibaseConfigurationPanel";
import * as readConfiguration from "../../../../configuration/handle/readConfiguration";
import Sinon from "sinon";
import { ConnectionType } from "../../../../input/ConnectionType";
import * as createAndAddConfiguration from "../../../../configuration/handle/createAndAddConfiguration";
import * as handleLiquibaseFolder from "../../../../handleLiquibaseSettings";
import { CustomDriverData } from "../../../../utilities/customDriver";
import { setResourcePath } from "../../../../extension";
import { InputBox, OpenDialog } from "@aditosoftware/vscode-input";
import chai from "chai";
import chaiFs from "chai-fs";

chai.use(chaiFs);

/**
 * Tests the file `configurationCommands.ts`.
 */
suite("configurationCommands", () => {
  let tempPath: string;
  let fileName: string;

  let extensionContext: vscode.ExtensionContext;

  /**
   * Creates a temp dir before all tests.
   */
  suiteSetup("create temp dir", () => {
    TestUtils.initLoggerForTests();

    tempPath = TestUtils.createTempFolderForTests("configurationCommands");

    setResourcePath(tempPath);

    extensionContext = {
      extensionUri: vscode.Uri.file(tempPath),
    } as vscode.ExtensionContext;
  });

  /**
   * Creates a temp file with a random name before each test.
   */
  setup("create temp file name", () => {
    fileName = path.join(tempPath, `${randomUUID()}.liquibase.properties`);
    fs.writeFileSync(fileName, "", "utf-8");
  });

  /**
   * Restore all stubs after all tests.
   */
  teardown("restore stubs", () => {
    Sinon.restore();
  });

  /**
   * Tests the editing of an existing configuration.
   */
  suite("editExistingLiquibaseConfiguration", () => {
    /**
     * Tests the editing of an normal file with the name `<<prefix>>.liquibase.properties`.
     */
    test("should edit with uri and normal file name", (done) => {
      const uri = vscode.Uri.file(fileName);
      assertEditExistingLiquibaseConfiguration(extensionContext, uri, done);
    });

    /**
     * Tests the editing of an file with the shorter name name `liquibase.properties`.
     */
    test("should edit with uri and short file name", (done) => {
      const shortName = path.join(tempPath, "liquibase.properties");
      const uri = vscode.Uri.file(shortName);
      assertEditExistingLiquibaseConfiguration(extensionContext, uri, done);
    });

    /**
     * Tests that editing without an uri, but with some configurations works.
     */
    test("should edit without uri", (done) => {
      Sinon.stub(readConfiguration, "readLiquibaseConfigurationNames").resolves(["foo", "bar"]);
      Sinon.stub(readConfiguration, "getPathOfConfiguration").resolves("anyElement");

      Sinon.replace(vscode.window, "showQuickPick", Sinon.fake.resolves("foo"));

      assertEditExistingLiquibaseConfiguration(extensionContext, undefined, done);
    });

    /**
     * Tests that editing without an uri and without any configuration works.
     */
    test("should edit without uri and no existing configs", (done) => {
      Sinon.stub(handleLiquibaseFolder, "getLiquibaseFolder").returns("myFolder");
      Sinon.stub(handleLiquibaseFolder, "getLiquibaseConfigurationPath").resolves("myFolder");
      Sinon.stub(ConnectionType, "suggestCreationOfConfiguration").resolves();

      assert.ok(!LiquibaseConfigurationPanel.currentPanel, "no current panel created");

      configurationCommand
        .editExistingLiquibaseConfiguration(undefined, extensionContext)
        .then(() => {
          const currentPanel = LiquibaseConfigurationPanel.currentPanel;
          assert.ok(!currentPanel, "panel is not created");

          done();
        })
        .catch(done)
        .finally(() => {
          // dispose manually after the tests
          LiquibaseConfigurationPanel.currentPanel?.dispose();
        });
    });
  });

  /**
   * Tests the adding of an existing configuration
   */
  suite("addExistingLiquibaseConfiguration", () => {
    /**
     * Tests the adding of an existing liquibase configuration.
     */
    test("should add", (done) => {
      const addToLiquibaseConfigurationStub = Sinon.stub(
        createAndAddConfiguration,
        "addToLiquibaseConfiguration"
      ).resolves();

      const copyInputBox = Object.create(vscode.window.createInputBox());
      copyInputBox.onDidAccept = (callback: () => void) => {
        copyInputBox.value = "foo";
        callback();
        return {
          dispose: () => {},
        } as vscode.Disposable;
      };
      const inputBoxWithAccept = copyInputBox as vscode.InputBox;

      const inputBox = Sinon.stub(vscode.window, "createInputBox").returns(inputBoxWithAccept);
      const openDialog = Sinon.stub(vscode.window, "showOpenDialog").resolves([vscode.Uri.file("bar")]);

      configurationCommand
        .addExistingLiquibaseConfiguration()
        .then(() => {
          Sinon.assert.calledOnce(addToLiquibaseConfigurationStub);
          Sinon.assert.calledWith(addToLiquibaseConfigurationStub, "foo", Sinon.match("bar"));

          Sinon.assert.calledOnce(inputBox);
          Sinon.assert.calledOnce(openDialog);
          Sinon.assert.calledWith(openDialog, {
            title: "Add existing configuration (Step 2 of 2)",
            openLabel: "Append",
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
              "Liquibase Properties": ["properties"],
            },
          } as vscode.OpenDialogOptions);

          done();
        })
        .catch(done);
    });
  });

  /**
   * Tests the creation of a new liquibase configuration.
   */
  suite("writeConfigToJSON", () => {
    /**
     * Tests the creation of a new liquibase configuration.
     */
    test("should write config to JSON", () => {
      const driverName = crypto.randomUUID();
      const expectedJSON = JSON.stringify(
        {
          name: driverName,
          driverClass: "myDriverClass",
          defaultPort: 1,
          jdbcName: "jdbc:myDriver://",
          separator: "/",
        },
        null,
        2
      );

      configurationCommand.writeConfigToJSON(driverName, createCustomDriverData());

      const driverJson = path.join(tempPath, driverName + ".json");
      chai.assert.pathExists(driverJson);
      assert.strictEqual(fs.readFileSync(driverJson, "utf-8"), expectedJSON);
    });
  });

  /**
   * Tests the copy and creation of a driver.
   */
  suite("copyAndCreateDriver", () => {
    /**
     * Tests the copy and creation of a driver.
     */
    test("should copy and create driver", () => {
      const driverName = crypto.randomUUID();
      const customJarFileFolder = path.join(tempPath, crypto.randomUUID());
      const customJarFilePath = path.join(customJarFileFolder, crypto.randomUUID() + ".jar");
      fs.mkdirSync(customJarFileFolder, { recursive: true });
      fs.writeFileSync(customJarFilePath, "");
      configurationCommand.copyAndCreateDriver(customJarFilePath, driverName, createCustomDriverData());

      chai.assert.pathExists(path.join(tempPath, driverName + ".jar"));
      chai.assert.pathExists(path.join(tempPath, driverName + ".json"));
    });
  });

  /**
   * Tests the update of a driver.
   */
  suite("updateDriver", () => {
    /**
     * Tests the update of a driver.
     */
    test("should update driver", () => {
      const driverName1 = crypto.randomUUID();
      const driverName2 = crypto.randomUUID();
      const customJarFileFolder = path.join(tempPath, crypto.randomUUID());
      const customJarFilePath = path.join(customJarFileFolder, crypto.randomUUID() + ".jar");
      fs.mkdirSync(customJarFileFolder, { recursive: true });
      fs.writeFileSync(customJarFilePath, "");
      configurationCommand.copyAndCreateDriver(customJarFilePath, driverName1, createCustomDriverData());

      configurationCommand.updateDriver(driverName1, driverName2, createCustomDriverData());

      chai.assert.pathExists(path.join(tempPath, driverName2 + ".jar"));
      chai.assert.pathExists(path.join(tempPath, driverName2 + ".json"));
    });
  });

  suite("getCustomDriversForView", () => {
    /**
     * Tests the creation of a new liquibase configuration.
     */
    test("should get custom drivers for view", () => {
      const driverName = crypto.randomUUID();
      configurationCommand.writeConfigToJSON(driverName, createCustomDriverData());
      const drivers: vscode.QuickPickItem[] = [];
      configurationCommand.getCustomDriversForView(drivers, []);

      assert.ok(
        drivers.find((driver) => driver.label === driverName),
        "driver was not found"
      );
    });
  });

  /**
   * Tests the handling of the driver input.
   */
  suite("handleDriverInput", () => {
    /**
     * Tests the handling of the driver input
     */
    test("should handle driver input", async () => {
      const driverName = crypto.randomUUID();
      const driverFile = path.join(tempPath, crypto.randomUUID() + ".jar");
      fs.writeFileSync(driverFile, "");

      configurationCommand.handleDriverInput(createDriverInputs(driverFile, driverName));

      await new Promise((resolve) => setImmediate(resolve));

      chai.assert.pathExists(path.join(tempPath, driverName + ".jar"));
      chai.assert.pathExists(path.join(tempPath, driverName + ".json"));
      chai.assert.pathExists(driverFile);
    });

    /**
     * Tests the handling of the driver input and only update
     */
    test("should handle driver input with old values", async () => {
      const driverName1 = crypto.randomUUID();
      const driverName2 = crypto.randomUUID();
      const driverFile = path.join(tempPath, crypto.randomUUID() + ".jar");
      fs.writeFileSync(driverFile, "");

      //create the driver to be updated
      configurationCommand.handleDriverInput(createDriverInputs(driverFile, driverName1));

      //update the driver
      configurationCommand.handleDriverInput(
        createDriverInputs(driverFile, driverName2),
        createCustomDriverData(),
        driverName1
      );

      await new Promise((resolve) => setImmediate(resolve));

      chai.assert.notPathExists(
        path.join(tempPath, driverName1 + ".jar"),
        "old driver file " + driverName1 + ".jar should be deleted"
      );
      chai.assert.notPathExists(
        path.join(tempPath, driverName1 + ".json"),
        "old driver json " + driverName1 + ".json should be deleted"
      );
      chai.assert.pathExists(path.join(tempPath, driverName2 + ".jar"), "new driver file should exist");
      chai.assert.pathExists(path.join(tempPath, driverName2 + ".json"), "new driver json should exist");
      chai.assert.pathExists(driverFile);
    });

    /**
     * Tests the handling of the driver input with no input from the user.
     */
    test("should handle driver input with no input", () => {
      const driverVisualName = crypto.randomUUID();
      const driverFile = path.join(tempPath, crypto.randomUUID() + ".jar");
      fs.writeFileSync(driverFile, "");

      configurationCommand.handleDriverInput(createDriverInputs("", driverVisualName), undefined, driverVisualName);

      chai.assert.notPathExists(path.join(tempPath, driverVisualName + ".jar"));
      chai.assert.notPathExists(path.join(tempPath, driverVisualName + ".json"));
      chai.assert.pathExists(driverFile);
    });
  });

  /**
   * Tests the getting of drivers.
   */
  suite("getDrivers", () => {
    /**
     * Tests the getting of drivers.
     */
    test("should get drivers", () => {
      const preExecutionDriverCount = configurationCommand.getDrivers().length;
      const driverName = crypto.randomUUID();
      configurationCommand.writeConfigToJSON(driverName, createCustomDriverData());
      const drivers = configurationCommand.getDrivers();

      assert.ok(
        drivers.find((driver) => driver.label === driverName),
        "driver was not found"
      );

      // check if the driver was added
      assert.strictEqual(drivers.length, preExecutionDriverCount + 1);
    });
  });

  /**
   * Tests the modification or addition of a driver.
   */
  suite("modifyOrAddDriver", () => {
    /**
     * Tests the modification of a driver.
     */
    test("should modify driver", () => {
      const driverFile = path.join(tempPath, crypto.randomUUID() + ".jar");
      fs.writeFileSync(driverFile, "");

      const modifyOrAddDriverSpy = Sinon.spy(configurationCommand, "modifyOrAddDriver");
      const handleDriverInputStub = Sinon.stub(configurationCommand, "handleDriverInput");

      modifyOrAddDriverSpy();

      Sinon.assert.calledOnce(handleDriverInputStub);
    });
  });

  /**
   * Tests the validation of the input box text value.
   */
  suite("validateInputBoxTextValue", () => {
    const inputParameter = [
      { input: "foo", expected: undefined },
      { input: "", expected: "Value must not be empty" },
    ];

    /**
     * Tests the validation of the input box text value.
     */
    inputParameter.forEach((input) => {
      test(`should validate input box text value ${input.input}`, () => {
        assert.strictEqual(configurationCommand.validateInputBoxTextValue(input.input)?.message, input.expected);
      });
    });
  });

  /**
   * Tests the validation of the input box port value.
   */
  suite("validateInputBoxPortValue", () => {
    const inputParameter = [
      { input: "foo", expected: "Port must be a number" },
      { input: "1", expected: undefined },
      { input: "0", expected: undefined },
      { input: "65535", expected: undefined },
      { input: "999999", expected: "Port must be between 0 and 65535" },
      { input: "", expected: "Port must not be empty" },
    ];
    /**
     * Tests the validation of the input box text value.
     */
    inputParameter.forEach((input) => {
      test(`should validate input box port value ${input.input}`, () => {
        assert.strictEqual(configurationCommand.validateInputBoxPortValue(input.input)?.message, input.expected);
      });
    });
  });

  /**
   * Tests the removal of driver files.
   */
  suite("removeDriverFiles", () => {
    /**
     * Tests the removal of driver files.
     */
    test("should remove driver files", () => {
      const driverName = crypto.randomUUID();
      const driverFile = path.join(tempPath, driverName + ".jar");
      fs.writeFileSync(driverFile, "");
      const driverJSON = path.join(tempPath, driverName + ".json");
      fs.writeFileSync(driverJSON, "");

      configurationCommand.removeDriverFiles(driverName);

      chai.assert.notPathExists(driverFile);
      chai.assert.notPathExists(driverJSON);
    });
  });
});

/**
 * Tests the method `editExistingLiquibaseConfiguration` and validates that a webview was created.
 *
 * @param extensionContext - the extension context that should be passed to the method
 * @param uri - the uri that should be passed to the method. This can be also `undefined`, if no uri was passed.
 * @param done - mochas done to signal the end of the tests
 */
function assertEditExistingLiquibaseConfiguration(
  extensionContext: vscode.ExtensionContext,
  uri: vscode.Uri | undefined,
  done: Mocha.Done
): void {
  Sinon.stub(handleLiquibaseFolder, "getLiquibaseFolder").returns("myFolder");

  assert.ok(!LiquibaseConfigurationPanel.currentPanel, "no current panel created");

  configurationCommand
    .editExistingLiquibaseConfiguration(uri, extensionContext)
    .then(() => {
      const currentPanel = LiquibaseConfigurationPanel.currentPanel;
      assert.ok(currentPanel, "panel was created");
      const webviewPanel = currentPanel["_panel"];
      assert.ok(webviewPanel.visible, "panel is visible");

      // test that a second call to show the panel still works
      if (uri) {
        LiquibaseConfigurationPanel.render(uri);

        assert.ok(LiquibaseConfigurationPanel.currentPanel?.["_panel"], "panel is still visible");
      }

      done();
    })
    .catch(done)
    .finally(() => {
      // dispose manually after the tests
      LiquibaseConfigurationPanel.currentPanel?.dispose();
    });
}

/**
 * Creates a custom driver for the tests.
 *
 * @returns the custom driver data
 */
function createCustomDriverData(): CustomDriverData {
  return {
    driverClass: "myDriverClass",
    port: 1,
    jdbcName: "jdbc:myDriver://",
    separator: "/",
  };
}

/**
 * Creates the driver inputs for the tests.
 *
 * @param driverFilePath - path to the driver file
 * @param visualNameOutput - the output of the visual name
 * @returns the driver inputs
 */
function createDriverInputs(
  driverFilePath: string,
  visualNameOutput: string
): [OpenDialog, InputBox, InputBox, InputBox, InputBox, InputBox] {
  const driverFileInput = new OpenDialog({
    name: "driverFile",
    openDialogOptions: { openLabel: "foo" },
  });
  Sinon.stub(driverFileInput, "showDialog").resolves([driverFilePath]);

  const visualName = new InputBox({
    name: "visualName",
    inputBoxOptions: { placeHolder: "foo" },
  });
  Sinon.stub(visualName, "showDialog").resolves(visualNameOutput);

  const jdbcName = new InputBox({
    name: "jdbcName",
    inputBoxOptions: { placeHolder: "foo" },
  });
  Sinon.stub(jdbcName, "showDialog").resolves("jdbcName");

  const driverClass = new InputBox({
    name: "driverClass",
    inputBoxOptions: { placeHolder: "foo" },
  });
  Sinon.stub(driverClass, "showDialog").resolves("driverClass");

  const defaultPort = new InputBox({
    name: "defaultPort",
    inputBoxOptions: { placeHolder: "foo" },
  });
  Sinon.stub(defaultPort, "showDialog").resolves("1");

  const separator = new InputBox({
    name: "separator",
    inputBoxOptions: { placeHolder: "foo" },
  });
  Sinon.stub(separator, "showDialog").resolves("/");

  return [driverFileInput, visualName, jdbcName, driverClass, defaultPort, separator];
}
