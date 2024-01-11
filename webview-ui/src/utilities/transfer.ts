import { MessageData } from "../../../src/transferData";

// TODO TSdoc, nach vscode?
export function getConfigurationDataFromMessage(event: MessageEvent<MessageData>): MessageData {
  const message = event.data;
  return MessageData.createFromSerializedData(message);
}
