import { vscodeApiWrapper } from "./utilities/vscodeApiWrapper";
import { VSCodeButton, VSCodeDivider, VSCodeLink, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import "./App.css";
import "./codicon.css";
import { useEffect, useState } from "react";
import { DatabaseConfiguration } from "./components/DatabaseConfiguration";
import { AdditionalElements } from "./components/AdditionalElements";
import { useImmer } from "use-immer";
import {
  ConfigurationStatus,
  LiquibaseConfigurationData,
} from "../../src/configuration/data/LiquibaseConfigurationData";
import { DatabaseConnection } from "../../src/configuration/data/DatabaseConnection";
import { NO_PRE_CONFIGURED_DRIVER } from "../../src/configuration/drivers";
import { MessageData, MessageType } from "../../src/configuration/transfer";

/**
 * The main Webview for the Liquibase Configuration.
 *
 * @returns the created react element for the webview
 */
function App(): JSX.Element {
  const [data, updateData] = useImmer<LiquibaseConfigurationData>(
    // dummy data to create the element.
    // The data will be updated shortly after the view is created.
    LiquibaseConfigurationData.createDefaultData(
      { defaultDatabaseForConfiguration: NO_PRE_CONFIGURED_DRIVER, liquibaseDirectoryInProject: "" },
      ConfigurationStatus.NEW
    )
  );
  const [referenceConnection, setReferenceConnection] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<string | null>(null);

  vscodeApiWrapper.addMessageListener((pMessage) => {
    switch (pMessage.messageType) {
      case MessageType.INIT:
        handleInitData(pMessage);
        break;
      case MessageType.SAVING_SUCCESSFUL:
        handleSavingSuccessful(pMessage);
        break;
      case MessageType.CHOOSE_CHANGELOG_RESULT:
        handleChooseChangelogResult(pMessage);
        break;
      default:
        console.error(`No handling for type ${pMessage.messageType} found`);
        break;
    }
  });

  /**
   * Handles the initialization of the web view with the given data.
   * All the required components will be set.
   *
   * @param messageData - the message data given
   */
  function handleInitData(messageData: MessageData): void {
    const configurationData = messageData.configurationData;
    if (configurationData) {
      setReferenceConnection(typeof configurationData.referenceDatabaseConnection !== "undefined");

      updateData((draft) => {
        Object.assign(draft, configurationData);
      });
    }
  }

  /**
   * Handles the changing of the state after the saving was successful.
   *
   * @param messageData - the message data given
   */
  function handleSavingSuccessful(messageData: MessageData): void {
    if (messageData.configurationData && data.name === messageData.configurationData.name) {
      //just check the name if the loaded config is the same
      updateData((draft) => {
        draft.status = ConfigurationStatus.EDIT;
      });
    }
  }

  /**
   * Handles the result after the user choose a changelog file.
   * This will update the classpath (when relative path was not possible from existing classpath)
   * and changelog file.
   *
   * @param pMessage - the message data given
   */
  function handleChooseChangelogResult(pMessage: MessageData): void {
    updateData((draft) => {
      if (pMessage.configurationData) {
        draft.changelogFile = pMessage.configurationData.changelogFile;
      }
    });
  }

  /**
   * Handles the saving of the configuration.
   * Saving is only allowed when a name is present.
   */
  function handleSaveConfiguration(): void {
    if (data.name) {
      vscodeApiWrapper.postMessage(new MessageData(MessageType.SAVE_CONNECTION, data));
    } else {
      vscodeApiWrapper.postMessage(
        new MessageData(MessageType.LOG_MESSAGE, {
          level: "error",
          message: "Required value 'name of configuration' is missing",
          notifyUser: true,
        })
      );
    }
  }

  /**
   * Tests the given configuration
   */
  function handleTestConfiguration(): void {
    vscodeApiWrapper.postMessage(new MessageData(MessageType.TEST_CONNECTION, data));
  }

  // Whenever the data changes, update the preview data
  useEffect(() => {
    fetchData();
  }, [data]);

  return (
    <main>
      <h1>Liquibase Configuration</h1>

      <p>
        For more information about the <code>liquibase.properties</code> file, see{" "}
        <VSCodeLink
          id="documentationLink"
          href="https://docs.liquibase.com/concepts/connections/creating-config-properties.html">
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
                <VSCodeTextField value={data.changelogFile} onBlur={handleChangelogFileChange} id="changelogInput">
                  The basic changelog file for any command
                </VSCodeTextField>
                <VSCodeButton appearance="secondary" onClick={handleChooseChangelog} id="changelogSelection">
                  Choose changelog
                  <span slot="start" className="codicon codicon-file-code"></span>
                </VSCodeButton>
              </section>
            </fieldset>

            <DatabaseConfiguration
              title="Database configuration"
              baseId="dbConfig"
              customDrivers={data.liquibaseSettings.customDrivers}
              databaseConnection={data.databaseConnection}
              onUpdate={changeDatabaseConnection}
            />

            <section>
              <VSCodeButton
                id="addReferenceConnection"
                className="normalButton"
                formnovalidate={true}
                disabled={referenceConnection}
                onClick={() => handleAddRemoveReferenceConnection(true)}
                appearance="secondary">
                Add reference connection
                <span slot="start" className="codicon codicon-add"></span>
              </VSCodeButton>
              <VSCodeButton
                id="removeReferenceConnection"
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
                baseId="referenceConfig"
                customDrivers={data.liquibaseSettings.customDrivers}
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

              <div>{previewData !== null ? <pre id="preview">{previewData}</pre> : <p>Load Data...</p>}</div>
            </fieldset>
          </div>
        </section>

        <VSCodeDivider />

        <VSCodeButton id="saveButton" onClick={handleSaveConfiguration} appearance="primary" className="normalButton">
          Save configuration
          <span slot="start" className="codicon codicon-save"></span>
        </VSCodeButton>

        <VSCodeButton
          id="testButton"
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
   * Fetches the data from the data and sets it to the preview, whenever the data changes.
   */
  function fetchData(): void {
    try {
      // do not add any values for the driver, because we can not build them here (path is not allowed!)
      setPreviewData(data.generateProperties(true));
    } catch (error) {
      vscodeApiWrapper.postMessage(
        new MessageData(MessageType.LOG_MESSAGE, {
          level: "error",
          message: "Not able to set preview data",
          error: error,
        })
      );
    }
  }

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
   *
   * @param pAdded - indicator weather the reference connection was added (`true`) or removed (`false`)
   */
  function handleAddRemoveReferenceConnection(pAdded: boolean): void {
    updateData((draft) => {
      draft.referenceDatabaseConnection = pAdded
        ? DatabaseConnection.createDefaultDatabaseConnection(data.liquibaseSettings.defaultDatabaseForConfiguration)
        : undefined;
    });

    setReferenceConnection(pAdded);
  }

  /**
   * Handles the name change of the input field.
   *
   * @param event - the event that was triggered
   */
  function handleChangeName(event: React.FocusEvent<HTMLInputElement>): void {
    updateData((draft) => {
      draft.name = event.target.value;

      // whenever the name changes, assume new config
      draft.status = ConfigurationStatus.NEW;
    });
  }

  /**
   * Handles the change of the changelog file.
   *
   * @param event - the event which was triggered
   */
  function handleChangelogFileChange(event: React.FocusEvent<HTMLInputElement>): void {
    updateData((draft) => {
      draft.changelogFile = event.target.value;
    });
  }

  /**
   * Handles when the "Choose changelog" button was pressed.
   * In this case, we need to trigger an choose dialog outside of the webview.
   * The data will later return.
   */
  function handleChooseChangelog(): void {
    vscodeApiWrapper.postMessage(new MessageData(MessageType.CHOOSE_CHANGELOG, data));
  }

  /**
   * Handles the changing of the additional elements.
   *
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
