import { LiquibaseConfigurationData, MessageData } from "../../../src/transferData";

// TODO TSdoc, nach vscode?
export function getConfigurationDataFromMessage(event: MessageEvent<MessageData>): LiquibaseConfigurationData {
  console.log(event);
  console.log(event.data);

  console.log(typeof event.data);
  console.log(event.data instanceof MessageData);
  console.log(typeof event.data === "string");

  const message = event.data;

  return MessageData.createFromSerializedData(message).data;
}
