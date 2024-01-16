import { LiquibaseConfigurationData } from "../data/LiquibaseConfigurationData";

/**
 * The message types any of the message can have.
 */
export enum MessageType {
  INIT = "INIT",
  SAVING_SUCCESSFUL = "SAVING_SUCCESSFUL",

  SAVE_CONNECTION = "SAVE_CONNECTION",
  TEST_CONNECTION = "TEST_CONNECTION",
}

/**
 * The message data that can be transferred from the webview to the extension.
 */
export class MessageData {
  /**
   * The command that should be executed. This command is any string that is referenced in the panel of the webview.
   */
  messageType: MessageType;

  /**
   * The configuration data of the message.
   */
  configurationData: LiquibaseConfigurationData;

  constructor(messageType: MessageType, configurationData: LiquibaseConfigurationData) {
    this.messageType = messageType;
    this.configurationData = configurationData;
  }

  /**
   * Creates a new instance of an existing object after the serialization.
   * This is needed, because otherwise no methods will be there.
   * @param pSerializedData - the serialized data
   * @returns the new message data
   */
  static createFromSerializedData(pSerializedData: MessageData): MessageData {
    return new MessageData(
      pSerializedData.messageType,
      LiquibaseConfigurationData.clone(pSerializedData.configurationData)
    );
  }
}
