import { VSCodeButton, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import path from "path";
import { useState } from "react";
import { vscode } from "../utilities/vscode";
export function StorageLocation() {
  let [folderPath, setFolderPathValue] = useState("");

  async function chooseFolder() {
    // vscode.postMessage({});
    // const result = await vscode.window.showOpenDialog({
    //   canSelectFiles: false,
    //   canSelectFolders: true,
    //   canSelectMany: false,
    // });
    // if (result && result.length > 0) {
    //   // Map the Uri objects to their file paths
    //   const folderPaths = result.map((uri) => uri.fsPath);
    //   folderPath = path.join(...folderPaths);
    // }
  }

  return (
    <section>
      <h2>General Configuration</h2>
      <VSCodeTextField maxlength={50}>Unique Configuration Name</VSCodeTextField>

      <VSCodeTextField readOnly value="{folderPath}">
        Folder
      </VSCodeTextField>
      <VSCodeButton onClick={chooseFolder}>Choose Folder</VSCodeButton>
    </section>
  );
}
