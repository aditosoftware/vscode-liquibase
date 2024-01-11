import { DataGridCell } from "@vscode/webview-ui-toolkit";
import {
  VSCodeButton,
  VSCodeDataGrid,
  VSCodeDataGridCell,
  VSCodeDataGridRow,
  VSCodeTextField,
} from "@vscode/webview-ui-toolkit/react";
import { useState } from "react";
import { getConfigurationDataFromMessage } from "../utilities/transfer";

/**
 * The properties for the additional element tag.
 */
interface AdditionalElementProps {
  /**
   * Event for listening on any value change of the additional elements.
   * @param pValues - all the new additional values
   */
  onValueChange: (pValues: Map<string, string>) => void;
}

/**
 * Creates an editable grid component for adding the additional elements to the configuration.
 * @param pProperties - the properties that are needed for the additional elements
 * @returns the created component
 */
export function AdditionalElements(pProperties: AdditionalElementProps) {
  const [additionalElementValues, setAdditionalElementValues] = useState<Map<string, string>>(new Map());

  const [key, setKey] = useState<string>("");
  const [value, setValue] = useState<string>("");

  window.addEventListener("message", (event) => {
    // TODO anders lösen?
    const data = getConfigurationDataFromMessage(event);

    // recreate the new values as a new map
    const newValues = new Map();
    const additionalConfiguration = data.additionalConfiguration;
    for (const configKey in additionalConfiguration) {
      newValues.set(configKey, additionalConfiguration[configKey]);
    }
    setAdditionalElementValues(newValues);
  });

  /**
   * Makes the row editable when clicked on it.
   * @param pEvent - the click event
   */
  function makeRowEditable(pEvent: { target: unknown }) {
    const target = pEvent.target;

    if (target instanceof DataGridCell) {
      const cell: DataGridCell = target as DataGridCell;

      // Do not continue if `cell` is undefined/null or is not a grid cell
      if (!cell || cell.role !== "gridcell") {
        return;
      }

      // set editable
      cell.setAttribute("contenteditable", "true");

      // add keydown listener
      cell.addEventListener("keydown", handleKeydown);
    }
  }

  /**
   * Exists the editing when Enter or Escape where pressed.
   * @param pEvent - the keyboard event
   */
  function handleKeydown(pEvent: KeyboardEvent) {
    if (pEvent.key === "Enter" || pEvent.key === "Escape") {
      const target = pEvent.target;

      if (target instanceof DataGridCell) {
        const cell: DataGridCell = target as DataGridCell;

        cell.setAttribute("contenteditable", "false");
      }
    }
  }

  /**
   * Creates a new row, when the plus button was pressed and both key and value where given.
   */
  function createNewRow(): void {
    if (key && value) {
      setAdditionalElementValues(additionalElementValues.set(key, value));

      setKey("");
      setValue("");

      pProperties.onValueChange(additionalElementValues);
    }
  }

  /**
   * Deletes a row based on the key.
   * @param pKey - the key of the row which should be deleted
   */
  function handleDeleteRow(pKey: string): void {
    // create new map for saving and deleting the row
    const newElementValues: Map<string, string> = new Map(additionalElementValues);
    newElementValues.delete(pKey);

    setAdditionalElementValues(newElementValues);

    pProperties.onValueChange(newElementValues);
  }

  return (
    <div>
      <fieldset>
        <legend>Additional elements</legend>
        <p>To edit an row, click on it.</p>

        <VSCodeDataGrid aria-label="Default">
          <VSCodeDataGridRow row-type="header">
            <VSCodeDataGridCell cell-type="columnheader" grid-column="1">
              Key
            </VSCodeDataGridCell>
            <VSCodeDataGridCell cell-type="columnheader" grid-column="2">
              Value
            </VSCodeDataGridCell>
            <VSCodeDataGridCell cell-type="columnheader" grid-column="3">
              Action
            </VSCodeDataGridCell>
          </VSCodeDataGridRow>

          <VSCodeDataGridRow key="newDataRow">
            <VSCodeDataGridCell cell-type="columnheader" grid-column="1">
              <VSCodeTextField value={key} onBlur={(e: React.FocusEvent<HTMLInputElement>) => setKey(e.target.value)} />
            </VSCodeDataGridCell>
            <VSCodeDataGridCell cell-type="columnheader" grid-column="2">
              <VSCodeTextField
                value={value}
                onBlur={(e: React.FocusEvent<HTMLInputElement>) => setValue(e.target.value)}
              />
            </VSCodeDataGridCell>
            <VSCodeDataGridCell cell-type="columnheader" grid-column="3">
              <VSCodeButton onClick={() => createNewRow()} appearance="icon" formnovalidate={true}>
                <span className="codicon codicon-add"></span>
              </VSCodeButton>
            </VSCodeDataGridCell>
          </VSCodeDataGridRow>

          {[...additionalElementValues].map(([key, value]) => (
            <VSCodeDataGridRow key={key}>
              <VSCodeDataGridCell onClick={makeRowEditable} grid-column="1">
                {key}
              </VSCodeDataGridCell>
              <VSCodeDataGridCell onClick={makeRowEditable} grid-column="2">
                {value}
              </VSCodeDataGridCell>
              <VSCodeDataGridCell grid-column="3">
                <VSCodeButton onClick={() => handleDeleteRow(key)} appearance="icon" formnovalidate={true}>
                  <span className="codicon codicon-trash"></span>
                </VSCodeButton>
              </VSCodeDataGridCell>
            </VSCodeDataGridRow>
          ))}
        </VSCodeDataGrid>
      </fieldset>
    </div>
  );
}
