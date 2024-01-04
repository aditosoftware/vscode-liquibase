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
import { useState } from "react";
import { TextFieldType } from "@vscode/webview-ui-toolkit";
import { InputValues, MessageData } from "../../src/interfaces";
import { ALL_DRIVERS, NO_PRE_CONFIGURED_DRIVER } from "../../src/drivers";

function App() {
  /**
   * Handles the saving of the configuration.
   * Saving is only allowed when a name is present.
   */
  function handleSaveConfiguration(): void {
    if (inputValues.name) {
      vscode.postMessage(createMessageData("saveConfiguration"));
    }
  }

  function createMessageData(pCommand: string): MessageData {
    return {
      command: pCommand,
      inputValues,
      databaseType: selectedDatabaseType,
    };
  }

  /**
   * Tests the given configuration
   */
  function handleTestConfiguration(): void {
    // TODO async ?
    vscode.postMessage(createMessageData("testConfiguration"));
  }

  // Initializes all input values with empty elements.
  const [inputValues, setInputValues] = useState<InputValues>({
    name: "",
    username: "",
    password: "",
    url: "",
    driver: "",
    classpath: "",
  });

  /**
   * Handles the change event for a text field.
   *
   * @param {keyof InputValues} pFieldName  The name of the field to update.
   * @returns {(e: React.ChangeEvent<HTMLInputElement>) => void} A function to handle the input change event.
   */
  function handleTextFieldChange(pFieldName: keyof InputValues): (e: any) => void {
    return (e: any): void => {
      setInputValues((prevValues) => ({
        ...prevValues,
        [pFieldName]: e.target.value,
      }));
    };
  }

  const [selectedDatabaseType, setSelectedDatabaseType] = useState<string>(NO_PRE_CONFIGURED_DRIVER);

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
          {createInput("text", "name", "The name under which the configuration should be stored", true)}
          <label>
            For instance the name <code>dev</code> will result in a <code>dev.liquibase.properties</code> file.
          </label>
        </fieldset>

        <fieldset>
          <legend>Connection configuration</legend>
          {createInput("text", "username", "Username of the database")}
          {createInput("password", "password", "Password of the database")}
          {createInput("text", "url", "The JDBC url of the database")}
        </fieldset>

        <fieldset>
          <legend>Database type</legend>
          <VSCodeRadioGroup
            orientation="vertical"
            value={selectedDatabaseType}
            onChange={(e: any) => {
              setSelectedDatabaseType(e.target.value);
            }}>
            <label>Database type for the configuration</label>
            {createDatabaseSelections()}
          </VSCodeRadioGroup>

          {selectedDatabaseType === NO_PRE_CONFIGURED_DRIVER && (
            <>
              <VSCodeDivider />
              {createInput("text", "driver", "The driver class of database")}
              {createInput("text", "classpath", "The path to the driver")}
            </>
          )}
        </fieldset>

        <VSCodeButton onClick={handleSaveConfiguration} appearance="primary">
          Save configuration
        </VSCodeButton>

        <VSCodeButton onClick={handleTestConfiguration} appearance="secondary">
          Test configuration
        </VSCodeButton>
      </form>
    </main>
  );

  /**
   * Creates all the radio elements for all the possible pre-configured drivers and a wildcard driver entry.
   * @returns the created `VSCodeRadio` elements
   */
  function createDatabaseSelections(): JSX.Element[] {
    const radioElements: JSX.Element[] = [];

    // add all drivers
    ALL_DRIVERS.forEach((pDriver, pKey) =>
      radioElements.push(<VSCodeRadio value={pKey}>{pDriver.displayName}</VSCodeRadio>)
    );

    // and add a none element
    radioElements.push(
      <VSCodeRadio value={NO_PRE_CONFIGURED_DRIVER} checked>
        none of the above
      </VSCodeRadio>
    );

    return radioElements;
  }

  /**
   * Creates an input inside a section.
   * @param pType the type of the text input field, e.g. text, password,...
   * @param pFieldName the name of the field. This is used for setting the new value when the value has changed
   *
   * @param pLabel the label of the text field
   * @param pRequired flag if this text field is required
   * @returns the created input
   */
  function createInput(
    pType: TextFieldType,
    pFieldName: keyof InputValues,
    pLabel: string,
    pRequired?: boolean
  ): JSX.Element {
    return (
      <section>
        <VSCodeTextField
          size={75}
          value={inputValues[pFieldName]}
          type={pType}
          required={pRequired}
          onInput={handleTextFieldChange(pFieldName)}>
          {pLabel}
        </VSCodeTextField>
      </section>
    );
  }
}

export default App;
