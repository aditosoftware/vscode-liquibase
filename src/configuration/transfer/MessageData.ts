import { MessageType } from ".";
import { LoggingMessageWithLevel } from "@aditosoftware/vscode-logging";
import { LiquibaseConfigurationData } from "../data/LiquibaseConfigurationData";

/**
 * The message data that can be transferred from the webview to the extension.
 */
export class MessageData {
  /**
   * The command that should be executed. This command is any string that is referenced in the panel of the webview.
   */
  messageType: MessageType;

  /**
   * The configuration data or the logging message that needs to be passed.
   */
  data: LiquibaseConfigurationData | LoggingMessageWithLevel;

  constructor(messageType: MessageType, data: LiquibaseConfigurationData | LoggingMessageWithLevel) {
    this.messageType = messageType;
    this.data = data;
  }

  /**
   * Returns the configurationData of the message, if this message contains one.
   */
  get configurationData(): LiquibaseConfigurationData | undefined {
    if (this.data instanceof LiquibaseConfigurationData) {
      return this.data;
    }
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
      // checking if this could be a LiquibaseConfigurationData, by checking the status attribute
      // no instanceof check possible, because the data is not serialized yet
      "status" in pSerializedData.data ? LiquibaseConfigurationData.clone(pSerializedData.data) : pSerializedData.data
    );
  }
}
