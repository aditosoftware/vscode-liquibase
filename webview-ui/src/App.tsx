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
import { useEffect, useState } from "react";
import { DatabaseConfiguration } from "./components/DatabaseConfiguration";
import { AdditionalElements } from "./components/AdditionalElements";
import { useImmer } from "use-immer";
import { getConfigurationDataFromMessage } from "./utilities/transfer";
import { ConfigurationStatus, LiquibaseConfigurationData } from '../../src/configuration/data/LiquibaseConfigurationData';
import { DatabaseConnection } from "../../src/configuration/data/DatabaseConnection";
import { NO_PRE_CONFIGURED_DRIVER } from "../../src/configuration/drivers";
import { MessageData, MessageType } from '../../src/configuration/transfer/transferData';

function App() {
  const [data, updateData] = useImmer<LiquibaseConfigurationData>(
    // dummy data to create the element.
    // The data will be updated shortly after the view is created.
    LiquibaseConfigurationData.createDefaultData(NO_PRE_CONFIGURED_DRIVER, ConfigurationStatus.NEW, true)
  );
  const [referenceConnection, setReferenceConnection] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<string | null>(null);

  window.addEventListener("message", (event) => {
    const messageData = getConfigurationDataFromMessage(event);

    switch (messageData.messageType) {
      case MessageType.INIT:
        handleInitData(messageData);
        break;
      case MessageType.SAVING_SUCCESSFUL:
        handleSavingSuccessful(messageData);
        break;
      default:
        console.error(`No handling for type ${messageData.messageType} found`);
        break;
    }
  });

  /**
   * Handles the initialization of the web view with the given data.
   * All the required components will be set.
   * @param messageData - the message data given
   */
  function handleInitData(messageData: MessageData) {
    const configurationData = messageData.configurationData;

    setReferenceConnection(typeof configurationData.referenceDatabaseConnection !== "undefined");

    updateData((draft) => {
      Object.assign(draft, configurationData);
    });
  }

  /**
   *Handles the changing of the state after the saving was successful.
   * @param messageData-  the message data given
   */
  function handleSavingSuccessful(messageData: MessageData) {
    if (data.name === messageData.configurationData.name) {
      //just check the name if the loaded config is the same
      updateData((draft) => {
        draft.status = ConfigurationStatus.EDIT;
      });
    }
  }

  /**
   * Handles the saving of the configuration.
   * Saving is only allowed when a name is present.
   */
  function handleSaveConfiguration(): void {
    if (data.name) {
      vscode.postMessage(new MessageData(MessageType.SAVE_CONNECTION, data));
    }
  }

  /**
   * Tests the given configuration
   */
  function handleTestConfiguration(): void {
    vscode.postMessage(new MessageData(MessageType.TEST_CONNECTION, data));
  }

  // Whenever the data changes, update the preview data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await data.generateProperties();
        setPreviewData(result);
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
  }, [data]);

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
                <VSCodeTextField autoFocus required value={data.name} onBlur={handleChangeName} id="nameInput">
                  The name under which the configuration should be stored
                </VSCodeTextField>
                <label htmlFor="nameInput">
                  For instance the name <code>dev</code> will result in a <code>dev.liquibase.properties</code> file.
                </label>
              </section>
              <VSCodeDivider />
              <section>
                <VSCodeTextArea
                  id="classpathInput"
                  value={data.classpath}
                  resize="vertical"
                  rows={3}
                  onBlur={handleChangeClasspath}>
                  The classpath used for executing liquibase.
                </VSCodeTextArea>
                <label htmlFor="classpathInput" slot="label">
                  These should be absolute paths. Each line is treated as one entry. These are connected automatically
                  by the selected system separator. If you have a custom driver specified, then you need to put in the
                  path to your driver here.
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
                    semicolon (<code>;</code>) for Windows
                  </VSCodeRadio>
                  <VSCodeRadio value=":">
                    colon (<code>:</code>) for Linux and MacOS
                  </VSCodeRadio>
                </VSCodeRadioGroup>
              </section>
            </fieldset>

            <DatabaseConfiguration
              title="Database configuration"
              databaseConnection={data.databaseConnection}
              onUpdate={changeDatabaseConnection}
            />

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
              <DatabaseConfiguration
                title="Reference Database configuration"
                databaseConnection={data.referenceDatabaseConnection}
                onUpdate={changeReferenceConnection}
              />
            )}

            <VSCodeDivider />
            <AdditionalElements onValueChange={handleChangeAdditionalElements} />
          </div>

          <div>
            <fieldset>
              <legend>Preview</legend>
              <p>Note: The preview will be updated after you leave an input field.</p>
              {data.name && (
                <p>
                  Configuration of <code>{data.name}.liquibase.properties</code>:
                </p>
              )}

              <div>{previewData !== null ? <pre>{previewData}</pre> : <p>Load Data...</p>}</div>
              {/* <pre>{data.generatePropertiesForDisplay()}</pre> */}
            </fieldset>
          </div>
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
      draft.referenceDatabaseConnection = pAdded
        ? DatabaseConnection.createDefaultDatabaseConnection(data.defaultDatabaseForConfiguration)
        : undefined;
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

      // whenever the name changes, assume new config
      draft.status = ConfigurationStatus.NEW;
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
}

export default App;
