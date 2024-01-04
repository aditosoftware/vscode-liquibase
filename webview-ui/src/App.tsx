import { vscode } from "./utilities/vscode";
import { VSCodeButton, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import "./App.css";
import { useState } from "react";
import { TextFieldType } from "@vscode/webview-ui-toolkit";
import { InputValues } from "../../src/interfaces";

function App() {
  /**
   * Handles the saving of the configuration.
   * Saving is only allowed when a name is present.
   */
  function handleSaveConfiguration(): void {
    if (inputValues.name) {
      vscode.postMessage({
        command: "saveConfiguration",
        data: inputValues,
      });
    }
  }

  /**
   * Tests the given configuration
   */
  function handleTestConfiguration(): void {
    // TODO async ?
    vscode.postMessage({
      command: "testConfiguration",
      data: inputValues,
    });
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

  return (
    <main>
      <h1>Liquibase Configuration</h1>

      <form>
        {createInput("text", "name", "The name under which the configuration should be stored", true)}
        {/* TODO: <label>Please note that for instance the name 'dev' will result in a 'dev.liquibase.properties' file.</label> */}
        {createInput("text", "username", "Username of the database")}
        {createInput("password", "password", "Password of the database")}
        {createInput("text", "url", "The JDBC url of the database")}
        {createInput("text", "driver", "The driver class of database")}
        {createInput("text", "classpath", "The path to the driver")}

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
          key={pFieldName}
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
