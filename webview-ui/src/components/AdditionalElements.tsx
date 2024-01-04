import { DataGridCell } from "@vscode/webview-ui-toolkit";
import {
  VSCodeButton,
  VSCodeDataGrid,
  VSCodeDataGridCell,
  VSCodeDataGridRow,
  VSCodeTextField,
} from "@vscode/webview-ui-toolkit/react";
import { useState } from "react";

interface AdditionalElementProps {
  onValueChange: (pValues: Map<string, string>) => void;
}

export function AdditionalElements(pProperties: AdditionalElementProps) {
  const [additionalElementValues, setAdditionalElementValues] = useState<Map<string, string>>(new Map());

  const [key, setKey] = useState<string>("");
  const [value, setValue] = useState<string>("");

  function makeRowEditable() {
    return (e: { target: unknown }) => {
      const target = e.target;

      if (target instanceof DataGridCell) {
        const cell: DataGridCell = target as DataGridCell;

        // FIXME bei anderen events auch verwenden!

        // Do not continue if `cell` is undefined/null or is not a grid cell
        if (!cell || cell.role !== "gridcell") {
          return;
        }
        // Do not allow data grid header cells to be editable
        if (cell.className === "column-header") {
          return;
        }

        cell.setAttribute("contenteditable", "true");
      }
    };
  }

  function createNewRow(): void {
    if (key && value) {
      setAdditionalElementValues(additionalElementValues.set(key, value));

      setKey("");
      setValue("");

      pProperties.onValueChange(additionalElementValues);
    }
  }

  function handleDeleteRow(pKey: string): void {
    console.log("delete :D");
    console.log(pKey + " ");

    additionalElementValues.delete(pKey);
    setAdditionalElementValues(additionalElementValues);

    pProperties.onValueChange(additionalElementValues);
  }

  return (
    <div>
      <fieldset>
        <legend>Additional elements</legend>

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
              <VSCodeButton onClick={() => createNewRow()}>
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
                <VSCodeButton onClick={() => handleDeleteRow(key)} appearance="icon">
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
