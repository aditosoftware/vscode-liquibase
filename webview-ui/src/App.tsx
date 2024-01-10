import { vscode } from "./utilities/vscode";
import {
  VSCodeButton,
  VSCodeDivider,
  VSCodeLink,
  VSCodeRadio,
  VSCodeRadioGroup,
  VSCodeTextArea,
  VSCodeTextField,
} from "@vscode/webview-ui-toolkit/react";
import "./App.css";
import "./codicon.css";
import { useState } from "react";
import { LiquibaseConfigurationData, DatabaseConnection, MessageData } from "../../src/transferData";
import { DatabaseConfiguration } from "./components/DatabaseConfiguration";
import { AdditionalElements } from "./components/AdditionalElements";
import { useImmer } from "use-immer";
import { NO_PRE_CONFIGURED_DRIVER } from "../../src/drivers";

function App() {
  // TODO Persist values when changed view

  const [data, updateData] = useImmer<LiquibaseConfigurationData>(
    new LiquibaseConfigurationData("", "", ";", createEmptyDatabaseConnection(), {}) // TODO anders lösen?
  );
  const [referenceConnection, setReferenceConnection] = useState<boolean>(false);

  window.addEventListener("message", (event) => {
    const message = event.data;

    if (message instanceof MessageData) {
      const deserializedMessage = MessageData.createFromSerializedData(message);
      // TODO Transfer separator!
      // if (typeof deserializedMessage.isWindows !== "undefined") {
      //   isWindows = deserializedMessage.isWindows;
      // }

      updateData((draft) => {
        const messageData = deserializedMessage.data;
        draft.name = messageData.name;
        draft.classpath = messageData.classpath;
        draft.classpathSeparator = messageData.classpathSeparator;
        draft.databaseConnection = messageData.databaseConnection;
        draft.referenceDatabaseConnection = messageData.referenceDatabaseConnection;
        draft.additionalConfiguration = messageData.additionalConfiguration;
        // TODO anders lösen?
      });
    }

    console.log(message);
  });

  /**
   * Handles the saving of the configuration.
   * Saving is only allowed when a name is present.
   */
  function handleSaveConfiguration(): void {
    if (data.name) {
      vscode.postMessage(new MessageData("saveConfiguration", data));
    }
  }

  /**
   * Tests the given configuration
   */
  function handleTestConfiguration(): void {
    vscode.postMessage(new MessageData("testConfiguration", data));
  }

  return (
    <main>
      <h1>Liquibase Configuration</h1>

      <p>
        For more information about the <code>liquibase.properties</code> file, see{" "}
        <VSCodeLink href="https://docs.liquibase.com/concepts/connections/creating-config-properties.html">
          the official documentation
        </VSCodeLink>
        .
      </p>
      <form>
        <section className="component-row">
          <div>
            <fieldset>
              <legend>General information</legend>
              <section>
                <VSCodeTextField required value={data.name} onBlur={handleChangeName} id="nameInput">
                  The name under which the configuration should be stored
                </VSCodeTextField>
                <label htmlFor="nameInput">
                  For instance the name <code>dev</code> will result in a <code>dev.liquibase.properties</code> file.
                </label>
              </section>
              <VSCodeDivider />
              <section>
                {/* // TODO value change
                // TODO label as p before?
                // TODO better label
                */}
                <VSCodeTextArea
                  id="classpathInput"
                  value={data.classpath}
                  resize="vertical"
                  rows={3}
                  onBlur={handleChangeClasspath}>
                  The classpaths used for executing liquibase.
                </VSCodeTextArea>
                <label htmlFor="classpathInput" slot="label">
                  These should be absolute paths. Each line is treated as one entry. These are connected automatically
                  by the selected systems separator.
                </label>

                <VSCodeRadioGroup
                  orientation="horizontal"
                  value={data.classpathSeparator}
                  onClick={(e) => {
                    // @ts-expect-error error exists because type is not 100% correct. I cannot change the type and using any is against ESLint. // TODO validate
                    const value = e.target.value;
                    updateData((draft) => {
                      draft.classpathSeparator = value;
                    });
                  }}>
                  <label slot="label">
                    The separator for multiple classpaths. This is depending on your operating system
                  </label>

                  <VSCodeRadio value=";">
                    <code>;</code> (Windows)
                  </VSCodeRadio>
                  <VSCodeRadio value=":">
                    <code>:</code> (Linux and MacOS)
                  </VSCodeRadio>
                </VSCodeRadioGroup>
              </section>
            </fieldset>

            <DatabaseConfiguration title="Database configuration" onUpdate={changeDatabaseConnection} />

            <section>
              <VSCodeButton
                className="normalButton"
                formnovalidate={true}
                disabled={referenceConnection}
                onClick={() => handleAddRemoveReferenceConnection(true)}
                appearance="secondary">
                Add reference connection
                <span slot="start" className="codicon codicon-add"></span>
              </VSCodeButton>
              <VSCodeButton
                className="normalButton"
                formnovalidate={true}
                disabled={!referenceConnection}
                onClick={() => handleAddRemoveReferenceConnection(false)}
                appearance="secondary">
                <span slot="start" className="codicon codicon-remove"></span>
                Remove reference connection
              </VSCodeButton>
            </section>

            {/* Show reference connection only when the button for creating such was selected */}
            {referenceConnection && (
              <DatabaseConfiguration title="Reference Database configuration" onUpdate={changeReferenceConnection} />
            )}

            <VSCodeDivider />
            <AdditionalElements onValueChange={handleChangeAdditionalElements} />
          </div>

          <fieldset>
            <legend>Preview</legend>
            <p>Note: The preview will be updated after you leave an input field.</p>
            {data.name && (
              <p>
                Configuration of <code>{data.name}.liquibase.properties</code>:
              </p>
            )}
            <pre>{data.generatePropertiesForDisplay()}</pre>
          </fieldset>
        </section>

        <VSCodeDivider />

        <VSCodeButton onClick={handleSaveConfiguration} appearance="primary" className="normalButton">
          Save configuration
          <span slot="start" className="codicon codicon-save"></span>
        </VSCodeButton>

        <VSCodeButton
          onClick={handleTestConfiguration}
          appearance="secondary"
          formnovalidate={true}
          className="normalButton">
          Test configuration
          <span slot="start" className="codicon codicon-beaker"></span>
        </VSCodeButton>
      </form>
    </main>
  );

  /**
   * Updates a specific value of the DatabaseConnection .
   *
   * @param pComponent - The key of the component to be updated.
   * @param pInputValue - The new value to set for the specified component.
   */
  function changeDatabaseConnection(pComponent: keyof DatabaseConnection, pInputValue: string): void {
    updateData((draft) => {
      draft.databaseConnection = draft.databaseConnection.setValue(pComponent, pInputValue);
    });
  }

  /**
   * Updates a specific value of the Reference DatabaseConnection .
   *
   * @param pComponent - The key of the component to be updated.
   * @param pInputValue - The new value to set for the specified component.
   */
  function changeReferenceConnection(pComponent: keyof DatabaseConnection, pInputValue: string): void {
    updateData((draft) => {
      if (draft.referenceDatabaseConnection) {
        draft.referenceDatabaseConnection = draft.referenceDatabaseConnection.setValue(pComponent, pInputValue);
      }
    });
  }

  /**
   * Creates and removes a dummy connection for the reference connection. This will also trigger the appearing or disappearing of the reference connection element.
   * @param pAdded - indicator weather the reference connection was added (`true`) or removed (`false`)
   */
  function handleAddRemoveReferenceConnection(pAdded: boolean): void {
    updateData((draft) => {
      draft.referenceDatabaseConnection = pAdded ? createEmptyDatabaseConnection() : undefined;
    });

    setReferenceConnection(pAdded);
  }

  /**
   * Handles the name change of the input field.
   * @returns the event
   */
  function handleChangeName(event: React.FocusEvent<HTMLInputElement>) {
    updateData((draft) => {
      draft.name = event.target.value;
    });
  }

  /**
   * Handles the change of the classpath elements.
   * @param event - the event with was triggered
   */
  function handleChangeClasspath(event: React.FocusEvent<HTMLInputElement>) {
    updateData((draft) => {
      draft.classpath = event.target.value;
    });
  }

  /**
   * Handles the changing of the additional elements.
   * @param pValues - the new additional elements.
   */
  function handleChangeAdditionalElements(pValues: Map<string, string>): void {
    updateData((draft) => {
      draft.additionalConfiguration = {};
      pValues.forEach((value, key) => {
        draft.additionalConfiguration[key] = value;
      });
    });
  }

  /**
   * Creates an empty database connection.
   * @returns the empty database connection
   */
  function createEmptyDatabaseConnection(): DatabaseConnection {
    // TODO TSDOC
    return new DatabaseConnection("", "", "", "", NO_PRE_CONFIGURED_DRIVER);
  }
}

export default App;
