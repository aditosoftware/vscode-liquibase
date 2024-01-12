import { DatabaseConnection } from "./configuration/DatabaseConnection";
import { LiquibaseConfigurationData } from "./configuration/LiquibaseConfigurationData";

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
   * The real data of the message.
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
    // TODO schöner?

    return new MessageData(
      pSerializedData.messageType,
      new LiquibaseConfigurationData(
        pSerializedData.configurationData.newConfig,
        pSerializedData.configurationData.defaultDatabaseForConfiguration,
        pSerializedData.configurationData.name,
        pSerializedData.configurationData.classpath,
        pSerializedData.configurationData.classpathSeparator,

        new DatabaseConnection(
          pSerializedData.configurationData.databaseConnection.username,
          pSerializedData.configurationData.databaseConnection.password,
          pSerializedData.configurationData.databaseConnection.url,
          pSerializedData.configurationData.databaseConnection.driver,
          pSerializedData.configurationData.databaseConnection.databaseType
        ),

        pSerializedData.configurationData.additionalConfiguration,

        pSerializedData.configurationData.referenceDatabaseConnection
          ? new DatabaseConnection(
              pSerializedData.configurationData.referenceDatabaseConnection.username,
              pSerializedData.configurationData.referenceDatabaseConnection.password,
              pSerializedData.configurationData.referenceDatabaseConnection.url,
              pSerializedData.configurationData.referenceDatabaseConnection.driver,
              pSerializedData.configurationData.referenceDatabaseConnection.databaseType
            )
          : undefined
      )
    );
  }
}
