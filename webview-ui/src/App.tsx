import { vscode } from "./utilities/vscode";
import {
  VSCodeButton,
  VSCodeDivider,
  VSCodeLink,
  VSCodeRadio,
  VSCodeRadioGroup,
  VSCodeTextField,
} from "@vscode/webview-ui-toolkit/react";
import "./App.css";
import "./codicon.css";
import { useState } from "react";
import { TextFieldType } from "@vscode/webview-ui-toolkit";
import { LiquibaseConfigurationData, DatabaseConnection } from "../../src/transferData";
import { ALL_DRIVERS, NO_PRE_CONFIGURED_DRIVER } from "../../src/drivers";
import { DatabaseConfiguration } from "./components/DatabaseConfiguration";

function App() {
  // let data: Data = new Data();

  const [data] = useState<LiquibaseConfigurationData>(new LiquibaseConfigurationData());

  /**
   * Handles the saving of the configuration.
   * Saving is only allowed when a name is present.
   */
  function handleSaveConfiguration(): void {
    console.log(data);
    if (data.name) {
      vscode.postMessage({ command: "saveConfiguration", data });
    }
  }

  /**
   * Tests the given configuration
   */
  function handleTestConfiguration(): void {
    // TODO async ?
    vscode.postMessage({ command: "testConfiguration", data });
  }

  const [referenceConnection, setReferenceConnection] = useState<boolean>(false);

  /**
   * Creates and removes a dummy connection for the reference connection. This will also trigger the appearing or disappearing of the reference connection element.
   * @param added indicator weather the reference connection was added (`true`) or removed (`false`)
   */
  function handleAddRemoveReferenceConnection(added: boolean): void {
    data.referenceDatabaseConnection = added ? new DatabaseConnection() : undefined;

    setReferenceConnection(added);
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
          <VSCodeTextField
            size={75}
            required
            onBlur={(event: any) => {
              data.name = event.target.value;
            }}>
            The name under which the configuration should be stored
          </VSCodeTextField>
          <p>
            For instance the name <code>dev</code> will result in a <code>dev.liquibase.properties</code> file.
          </p>
        </fieldset>

        <DatabaseConfiguration
          title="Database configuration"
          onUpdate={(pComponent, pInputValue) => data.databaseConnection.setValue(pComponent, pInputValue)}
        />

        <section>
          <VSCodeButton
            formnovalidate={true}
            disabled={referenceConnection}
            onClick={(e) => handleAddRemoveReferenceConnection(true)}
            appearance="secondary">
            Add reference connection
            <span slot="start" className="codicon codicon-add"></span>
          </VSCodeButton>
          <VSCodeButton
            formnovalidate={true}
            disabled={!referenceConnection}
            onClick={(e) => handleAddRemoveReferenceConnection(false)}
            appearance="secondary">
            <span slot="start" className="codicon codicon-remove"></span>
            Remove reference connection
          </VSCodeButton>
        </section>

        {/* Show reference connection only when the button for creating such was selected */}
        {referenceConnection && (
          <DatabaseConfiguration
            title="Reference Database configuration"
            onUpdate={(pComponent, pInputValue) => {
              if (data.referenceDatabaseConnection) {
                data.referenceDatabaseConnection.setValue(pComponent, pInputValue);
              }
            }}
          />
        )}

        <VSCodeDivider />

        <VSCodeButton onClick={handleSaveConfiguration} appearance="primary">
          Save configuration
          <span slot="start" className="codicon codicon-save"></span>
        </VSCodeButton>

        <VSCodeButton onClick={handleTestConfiguration} appearance="secondary" formnovalidate={true}>
          Test configuration
          <span slot="start" className="codicon codicon-beaker"></span>
        </VSCodeButton>
      </form>
    </main>
  );
}

export default App;
