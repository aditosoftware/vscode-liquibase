import { vscode } from "./utilities/vscode";
import { VSCodeButton, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import "./App.css";
import { ChangeEvent, useState } from "react";
import { StorageLocation } from "./components/StorageLocation";

function App() {
  function handleButtonClick() {
    vscode.postMessage({
      command: "hello",
      text: "Hey there partner! 🤠",
      data: textFieldValue,
    });
  }

  const [textFieldValue, setTextFieldValue] = useState("");

  const handleTextFieldChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTextFieldValue(e.target.value);
  };

  return (
    <main>
      <h1>Liquibase Configuration</h1>

      <StorageLocation></StorageLocation>
      <hr></hr>
      {/* <section className="component-container">
        <h2>General configuration</h2>
        <VSCodeTextField
          maxlength={50}
          value={textFieldValue}
          onInput={
            // @ts-ignore
            (e) => setTextFieldValue(e.target.value)
          }
        >
          Name
        </VSCodeTextField>
      </section> */}
      <VSCodeButton onClick={handleButtonClick}>Howdy!</VSCodeButton>
    </main>
  );
}

export default App;
