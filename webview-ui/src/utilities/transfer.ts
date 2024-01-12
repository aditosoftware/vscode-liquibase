import { MessageData } from "../../../src/configuration/transfer/transferData";

// TODO TSdoc, nach vscode?
export function getConfigurationDataFromMessage(event: MessageEvent<MessageData>): MessageData {
  const message = event.data;
  return MessageData.createFromSerializedData(message);
}
