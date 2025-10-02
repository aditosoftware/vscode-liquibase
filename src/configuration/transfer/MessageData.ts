import { MessageType } from ".";
import { LoggingMessageWithLevel } from "@aditosoftware/vscode-logging";
import { LiquibaseConfigurationData } from "../data/LiquibaseConfigurationData";

/**
 * The message data that can be transferred from the webview to the extension.
 */
export class MessageData {
  /**
   * Creates a new message data.
   *
   * @param messageType - The command that should be executed. This command is any string that is referenced in the panel of the webview.
   * @param data - The configuration data or the logging message that needs to be passed.
   */
  constructor(
    public messageType: MessageType,
    public data: LiquibaseConfigurationData | LoggingMessageWithLevel
  ) {}

  /**
   * Returns the configurationData of the message, if this message contains one.
   *
   * @returns the configuration data
   */
  get configurationData(): LiquibaseConfigurationData | undefined {
    if (this.data instanceof LiquibaseConfigurationData) {
      return this.data;
    }

    return undefined;
  }

  /**
   * Creates a new instance of an existing object after the serialization.
   * This is needed, because otherwise no methods will be there.
   *
   * @param pSerializedData - the serialized data
   * @returns the new message data
   */
  static clone(pSerializedData: MessageData): MessageData {
    return new MessageData(
      pSerializedData.messageType,
      // checking if this could be a LiquibaseConfigurationData, by checking the status attribute
      // no instanceof check possible, because the data is not serialized yet
      "status" in pSerializedData.data ? LiquibaseConfigurationData.clone(pSerializedData.data) : pSerializedData.data
    );
  }
}
