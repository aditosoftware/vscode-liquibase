import { TextFieldType } from "@vscode/webview-ui-toolkit";
import { VSCodeDivider, VSCodeTextField, VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react";
import { DatabaseConnection } from "../../../src/configuration/data/DatabaseConnection";
import { NO_PRE_CONFIGURED_DRIVER, ALL_DRIVERS } from "../../../src/configuration/drivers";

/**
 * Properties for creating a database configuration
 */
interface DatabaseConfigurationProps {
  /**
   * The title for the configuration.
   */
  title: string;

  /**
   * The configured database connection. This will be used to display the values inside the element.
   */
  databaseConnection?: DatabaseConnection;

  /**
   * Method that will get a new value whenever the initial component was left (`onBlur`).
   * This is used to transfer the data the user has put into a element to the main app.
   * @param pComponent - the name of the component that was updated
   * @param pInputValue - the input value of the component
   * @returns void
   */
  onUpdate: (pComponent: keyof DatabaseConnection, pInputValue: string) => void;
}

/**
 * Creates an DatabaseConfiguration input area. This can be used for the normal an the reference connection.
 * @param pProperties - the properties for creating the element
 * @returns the created element
 */
export function DatabaseConfiguration(pProperties: DatabaseConfigurationProps) {
  return (
    <div>
      <fieldset>
        <legend>{pProperties.title}</legend>
        <fieldset>
          <legend>Connection configuration</legend>
          {createInput(pProperties, "text", "username", "Username of the database")}
          {createInput(pProperties, "password", "password", "Password of the database")}
          {createInput(
            pProperties,
            "text",
            "url",
            "The url of the database",
            "For example: jdbc:mariadb://localhost:3306/data"
          )}
        </fieldset>
        <fieldset>
          <legend>Database type</legend>
          <div className="dropdown-container">
            <label htmlFor="databaseTypeSelection">Database type for the configuration</label>
            <VSCodeDropdown
              id="databaseTypeSelection"
              value={pProperties.databaseConnection?.databaseType}
              onInput={(e) => {
                // @ts-expect-error error exists because type is not 100% correct. I cannot change the type and using any is against ESLint.
                const value = e.target.value;
                pProperties.onUpdate("databaseType", value);
                // remove classpath and driver values, when a pre-configured values was used
                if (value !== NO_PRE_CONFIGURED_DRIVER) {
                  pProperties.onUpdate("driver", "");
                }
              }}>
              {createDatabaseSelections()}
            </VSCodeDropdown>
          </div>

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
   * @returns the created `VSCodeRadio` elements
   */
  function createDatabaseSelections(): JSX.Element[] {
    const radioElements: JSX.Element[] = [];

    // add all the pre-configured drivers drivers
    [...ALL_DRIVERS.keys()]
      .sort((a, b) => a.localeCompare(b))
      .forEach((pKey: string) => {
        const driver = ALL_DRIVERS.get(pKey);
        if (driver) {
          radioElements.push(<VSCodeOption value={pKey}>{pKey}</VSCodeOption>);
        }
      });

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
   * @param pFieldName -  the name of the field. This is used for setting the new value when the value has changed
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
  ): JSX.Element {
    return (
      <VSCodeTextField
        type={pType}
        placeholder={pPlaceholder}
        value={pProperties.databaseConnection?.getValue(pFieldName)}
        onBlur={(e: React.FocusEvent<HTMLInputElement>) => pProperties.onUpdate(pFieldName, e.target.value)}>
        {pLabel}
      </VSCodeTextField>
    );
  }
}
