import { vscode } from "./utilities/vscode";
import { VSCodeButton, VSCodeDivider, VSCodeLink, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
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
    new LiquibaseConfigurationData("", createEmptyDatabaseConnection(), {})
  );

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

  const [referenceConnection, setReferenceConnection] = useState<boolean>(false);

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
              <VSCodeTextField size={75} required onBlur={handleChangeName()}>
                The name under which the configuration should be stored
              </VSCodeTextField>
              <p>
                For instance the name <code>dev</code> will result in a <code>dev.liquibase.properties</code> file.
              </p>
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
            <p>
              Configuration of <code>{data.name}.liquibase.properties</code>:
            </p>
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
   * Handles the name change of the input field.
   * @returns the event
   */
  function handleChangeName(): React.FocusEventHandler<HTMLElement> | undefined {
    return (event: React.FocusEvent<HTMLInputElement>) => {
      // TODO change signature of method?
      updateData((draft) => {
        draft.name = event.target.value;
      });
    };
  }

  /**
   * Handles the changing of the additional elements.
   * @returns a function for changing the data based on the new values
   */
  function handleChangeAdditionalElements(): (pValues: Map<string, string>) => void {
    return (pValues) => {
      updateData((draft) => {
        draft.additionalConfiguration = {};
        pValues.forEach((value, key) => {
          draft.additionalConfiguration[key] = value;
        });
      });
    };
  }
}

export default App;

/**
 * Creates an empty database connection.
 * @returns the empty database connection
 */
function createEmptyDatabaseConnection(): DatabaseConnection {
  // TODO TSDOC
  return new DatabaseConnection("", "", "", "", "", NO_PRE_CONFIGURED_DRIVER);
}
