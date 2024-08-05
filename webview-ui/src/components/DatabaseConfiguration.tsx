import { TextFieldType } from "@vscode/webview-ui-toolkit";
import { VSCodeDivider, VSCodeTextField, VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react";
import { DatabaseConnection } from "../../../src/configuration/data/DatabaseConnection";
import { NO_PRE_CONFIGURED_DRIVER, PREDEFINED_DRIVERS, UrlParts } from "@aditosoftware/driver-dependencies";
import { useEffect, useState } from "react";
import { vscodeApiWrapper } from "../utilities/vscodeApiWrapper";
import { MessageData, MessageType } from "../../../src/configuration/transfer";
import { CustomDrivers, CustomDriver } from "../../../src/utilities/customDriver";
/**
 * Properties for creating a database configuration
 */
interface DatabaseConfigurationProps {
  /**
   * The basic id for all elements inside
   */
  baseId: string;

  /**
   * The title for the configuration.
   */
  title: string;

  /**
   * The configured database connection. This will be used to display the values inside the element.
   */
  databaseConnection?: DatabaseConnection;

  /**
   * The custom drivers that are available for the driver selection.
   */
  customDrivers?: CustomDrivers;

  /**
   * Method that will get a new value whenever the initial component was left (`onBlur`).
   * This is used to transfer the data the user has put into a element to the main app.
   *
   * @param pComponent - the name of the component that was updated
   * @param pInputValue - the input value of the component
   * @returns void
   */
  onUpdate: (pComponent: keyof DatabaseConnection, pInputValue: string) => void;
}

/**
 * The new url values that should be updated.
 *
 * Only the fields given will be changed. If any field is `undefined`, then the old value will be used.
 */
interface NewUrlValues extends UrlParts {
  /**
   * The new database type.
   */
  databaseType?: string;
}

/**
 * Creates an DatabaseConfiguration input area. This can be used for the normal an the reference connection.
 *
 * @param pProperties - the properties for creating the element
 * @returns the created element
 */
export function DatabaseConfiguration(pProperties: DatabaseConfigurationProps): React.JSX.Element {
  const [serverAddress, setServerAddress] = useState<string>("localhost");
  const [port, setPort] = useState<number>(-1);
  const [databaseName, setDatabaseName] = useState<string>("data");
  const customDrivers: CustomDrivers = pProperties.customDrivers ?? {};

  /**
   * Updates the url for the changed values of the url parts.
   *
   * @param newValues - the new values to set. You do not need to fill every value, just the new values
   */
  function updateUrl(newValues: NewUrlValues): void {
    const databaseType = newValues.databaseType ?? pProperties.databaseConnection?.databaseType ?? "";
    const driver = PREDEFINED_DRIVERS.get(databaseType);
    if (driver) {
      // builds the new url
      const url = driver.buildUrl(pProperties.databaseConnection?.url, newValues, serverAddress, port, databaseName);

      // and set the new url
      pProperties.onUpdate("url", url);
    } else if (databaseType !== NO_PRE_CONFIGURED_DRIVER && !PREDEFINED_DRIVERS.has(databaseType)) {
      const customDriver: CustomDriver = new CustomDriver(customDrivers[databaseType]);
      const url = customDriver.buildUrl(
        pProperties.databaseConnection?.url,
        newValues,
        serverAddress,
        port,
        databaseName
      );

      pProperties.onUpdate("url", url);
    }
  }

  useEffect(() => updateAfterDatabaseConnectionChanged(), [pProperties.databaseConnection]);

  /**
   * Update server address, port and database name whenever database connection changes
   */
  function updateAfterDatabaseConnectionChanged(): void {
    // extract the new url parts from the database connection
    const extractedUrlParts = pProperties.databaseConnection?.extractUrlPartsFromDatabaseConfiguration(
      pProperties.customDrivers
    );

    // sets the new server address
    const newServerAddress = extractedUrlParts?.serverAddress ?? "localhost";
    setServerAddress(newServerAddress);

    // sets the new port
    const newPort = extractedUrlParts?.port ?? 0;
    setPort(newPort);

    // sets the new database name
    const newDatabaseName = extractedUrlParts?.databaseName ?? "data";
    setDatabaseName(newDatabaseName);

    // updates the url with the new elements
    updateUrl({
      serverAddress: newServerAddress,
      port: newPort,
      databaseName: newDatabaseName,
      databaseType: pProperties.databaseConnection?.databaseType,
    });
  }

  /**
   * Sets the new server address whenever a `onBlur` event was triggered.
   * It updates automatically the url with the new url part.
   *
   * @param event - the `onBlur` event which has the new value
   */
  function handleServerAddress(event: React.FocusEvent<HTMLInputElement>): void {
    const newServerAddress = event.target.value;
    setServerAddress(newServerAddress);

    updateUrl({ serverAddress: newServerAddress });
  }

  /**
   * Sets the new port whenever a `onBlur` event was triggered.
   * It updates automatically the url with the new url part.
   *
   * @param event - the `onBlur` event which has the new value
   * @see https://github.com/microsoft/vscode-webview-ui-toolkit/issues/439:
   * Number inputs are not possible, therefore manually validation and parsing is necessary
   */
  function handlePort(event: React.FocusEvent<HTMLInputElement>): void {
    const inputValue = event.target.value;

    // checks if the input value is a number
    if (inputValue && /^\d*$/.test(inputValue)) {
      const newPort = parseInt(inputValue);

      // checks if the port is in a valid range
      if (newPort >= 0 && newPort <= 65535) {
        setPort(newPort);

        updateUrl({ port: newPort });
      } else {
        vscodeApiWrapper.postMessage(
          new MessageData(MessageType.LOG_MESSAGE, {
            level: "error",
            message: `Port '${newPort}' needs to be a number between 0 and 65535`,
            notifyUser: true,
          })
        );
      }
    } else {
      vscodeApiWrapper.postMessage(
        new MessageData(MessageType.LOG_MESSAGE, {
          level: "error",
          message: `Port '${inputValue}' needs to be a number`,
          notifyUser: true,
        })
      );
    }
  }

  /**
   * Sets the new database name whenever a `onBlur` event was triggered.
   * It updates automatically the url with the new url part.
   *
   * @param event - the `onBlur` event which has the new value
   */
  function handleDatabaseName(event: React.FocusEvent<HTMLInputElement>): void {
    const newDatabaseName = event.target.value;
    setDatabaseName(newDatabaseName);

    updateUrl({ databaseName: newDatabaseName });
  }

  return (
    <div>
      <fieldset>
        <legend>{pProperties.title}</legend>
        <fieldset>
          <legend>Database credentials</legend>
          {createInput(pProperties, "text", "username", "Username of the database")}
          {createInput(pProperties, "password", "password", "Password of the database")}
        </fieldset>

        <fieldset id={pProperties.baseId + "_databaseConnection"}>
          <legend>Database url</legend>

          <div className="dropdown-container">
            <label htmlFor="databaseTypeSelection">Database type for the configuration</label>
            <VSCodeDropdown
              id={pProperties.baseId + "_databaseTypeSelection"}
              value={pProperties.databaseConnection?.databaseType}
              onInput={(e) => {
                // @ts-expect-error error exists because type is not 100% correct. I cannot change the type and using any is against ESLint.
                const newDatabaseType = e.target.value;
                pProperties.onUpdate("databaseType", newDatabaseType);
                // remove classpath and driver values, when a pre-configured values was used
                if (newDatabaseType !== NO_PRE_CONFIGURED_DRIVER && PREDEFINED_DRIVERS.has(newDatabaseType)) {
                  pProperties.onUpdate("driver", "");
                  // updates the url, when a new database type was selected
                  updateUrl({ databaseType: newDatabaseType, port: PREDEFINED_DRIVERS.get(newDatabaseType)?.port });
                } else {
                  pProperties.onUpdate("driver", customDrivers[newDatabaseType].driverClass);

                  updateUrl({ databaseType: newDatabaseType, port: customDrivers[newDatabaseType].port });
                }
              }}>
              {createDatabaseSelections()}
            </VSCodeDropdown>
          </div>

          {pProperties.databaseConnection?.databaseType !== NO_PRE_CONFIGURED_DRIVER && (
            <div className="flexContainer">
              <VSCodeTextField
                id={pProperties.baseId + "_serverAddress"}
                className="tripleInput"
                value={serverAddress}
                onBlur={handleServerAddress}>
                server address
              </VSCodeTextField>
              <VSCodeTextField
                id={pProperties.baseId + "_port"}
                className="tripleInput"
                value={port.toString()}
                onBlur={handlePort}>
                port
              </VSCodeTextField>
              <VSCodeTextField
                id={pProperties.baseId + "_databaseName"}
                className="tripleInput"
                value={databaseName}
                onBlur={handleDatabaseName}>
                database name
              </VSCodeTextField>
            </div>
          )}

          {createInput(
            pProperties,
            "text",
            "url",
            "The url of the database",
            "For example: jdbc:mariadb://localhost:3306/data"
          )}

          {pProperties.databaseConnection?.databaseType === NO_PRE_CONFIGURED_DRIVER && (
            <>
              <VSCodeDivider />
              {createInput(
                pProperties,
                "text",
                "driver",
                "The driver class of database",
                "For example: org.mariadb.jdbc.Driver"
              )}
            </>
          )}
        </fieldset>
      </fieldset>
    </div>
  );

  /**
   * Creates all the radio elements for all the possible pre-configured drivers and a wildcard driver entry.
   *
   * @returns the created `VSCodeRadio` elements
   */
  function createDatabaseSelections(): React.JSX.Element[] {
    const radioElements: React.JSX.Element[] = [];
    const drivers = customDrivers;

    // add all the pre-configured drivers drivers
    [...PREDEFINED_DRIVERS.keys()]
      .sort((a, b) => a.localeCompare(b))
      .forEach((pKey: string) => {
        const driver = PREDEFINED_DRIVERS.get(pKey);
        if (driver) {
          radioElements.push(<VSCodeOption value={pKey}>{pKey}</VSCodeOption>);
        }
      });

    // add custom drivers
    if (drivers && Object.keys(drivers).length !== 0) {
      // add a divider between the pre-configured drivers and the custom drivers
      radioElements.push(<VSCodeDivider />);

      [...Object.keys(drivers)]
        .sort((a, b) => a.localeCompare(b))
        .forEach((pKey: string) => {
          radioElements.push(<VSCodeOption value={pKey}>{pKey}</VSCodeOption>);
        });
    }

    // and add one element for no pre-configured driver at the end
    radioElements.push(<VSCodeDivider />);
    radioElements.push(
      <VSCodeOption value={NO_PRE_CONFIGURED_DRIVER} selected>
        No pre-configured driver
      </VSCodeOption>
    );

    return radioElements;
  }

  /**
   * Creates an input inside a section.
   *
   * @param pProperties - the properties which are used to configure this component. This is needed for handling the changing of values.
   * @param pType - the type of the text input field, e.g. text, password
   * @param pFieldName - the name of the field. This is used for setting the new value when the value has changed
   * @param pLabel - the label of the text field
   * @param pPlaceholder - a possible placeholder value for this input
   * @returns the created input
   */
  function createInput(
    pProperties: DatabaseConfigurationProps,
    pType: TextFieldType,
    pFieldName: keyof DatabaseConnection,
    pLabel: string,
    pPlaceholder?: string
  ): React.JSX.Element {
    return (
      <VSCodeTextField
        id={pProperties.baseId + "_" + pFieldName.toString()}
        type={pType}
        placeholder={pPlaceholder}
        value={pProperties.databaseConnection?.getValue(pFieldName)}
        onBlur={(e: React.FocusEvent<HTMLInputElement>) => pProperties.onUpdate(pFieldName, e.target.value)}>
        {pLabel}
      </VSCodeTextField>
    );
  }
}
