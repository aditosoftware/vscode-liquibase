import { vscode } from "./utilities/vscode";
import { VSCodeButton, VSCodeDivider, VSCodeLink, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import "./App.css";
import "./codicon.css";
import { useState } from "react";
import { LiquibaseConfigurationData, DatabaseConnection } from "../../src/transferData";
import { DatabaseConfiguration } from "./components/DatabaseConfiguration";
import React from "react";
import { AdditionalElements } from "./components/AdditionalElements";

function App() {
  // let data: Data = new Data();

  const [data, setData] = useState<LiquibaseConfigurationData>(new LiquibaseConfigurationData());

  /**
   * Handles the saving of the configuration.
   * Saving is only allowed when a name is present.
   */
  function handleSaveConfiguration(): void {
    if (data.name) {
      vscode.postMessage({ command: "saveConfiguration", data });
    }
  }

  /**
   * Tests the given configuration
   */
  function handleTestConfiguration(): void {
    vscode.postMessage({ command: "testConfiguration", data });
  }

  const [referenceConnection, setReferenceConnection] = useState<boolean>(false);

  /**
   * Creates and removes a dummy connection for the reference connection. This will also trigger the appearing or disappearing of the reference connection element.
   * @param pAdded indicator weather the reference connection was added (`true`) or removed (`false`)
   */
  function handleAddRemoveReferenceConnection(pAdded: boolean): void {
    const newData = { ...data, referenceConnection: pAdded ? new DatabaseConnection() : undefined };
    setData(newData);

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
        <AdditionalElements onValueChange={handleChangeAdditionalElements(data)} />
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
   * @param {keyof DatabaseConnection} pComponent - The key of the component to be updated.
   * @param {string} pInputValue - The new value to set for the specified component.
   */
  function changeDatabaseConnection(pComponent: keyof DatabaseConnection, pInputValue: string): void {
    const newData = { ...data };
    newData.databaseConnection.setValue(pComponent, pInputValue);
    setData(newData);
  }

  /**
   * Updates a specific value of the Reference DatabaseConnection .
   *
   * @param {keyof DatabaseConnection} pComponent - The key of the component to be updated.
   * @param {string} pInputValue - The new value to set for the specified component.
   */
  function changeReferenceConnection(pComponent: keyof DatabaseConnection, pInputValue: string): void {
    const newData = { ...data };

    if (newData.referenceDatabaseConnection) {
      newData.referenceDatabaseConnection.setValue(pComponent, pInputValue);
    }
    setData(newData);
  }

  /**
   * Handles the name change of the input field.
   * @returns the event
   */
  function handleChangeName(): React.FocusEventHandler<HTMLElement> | undefined {
    return (event: React.FocusEvent<HTMLInputElement>) => {
      setData({ ...data, name: event.target.value });
    };
  }

  /**
   * Handles the changing of the additional elements.
   * @param data the current data
   * @returns a function for changing the data based on the new values
   */
  function handleChangeAdditionalElements(data: LiquibaseConfigurationData): (pValues: Map<string, string>) => void {
    return (pValues) => {
      const newData = { ...data };

      pValues.forEach((value, key) => {
        newData.additionalConfiguration[key] = value;
      });

      setData(newData);
    };
  }
}

export default App;
