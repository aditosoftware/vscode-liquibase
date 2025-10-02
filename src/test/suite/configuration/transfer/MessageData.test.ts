import assert from "node:assert";
import {
  ConfigurationStatus,
  LiquibaseConfigurationData,
} from "../../../../configuration/data/LiquibaseConfigurationData";
import { MessageData, MessageType } from "../../../../configuration/transfer";

/**
 * Tests the MessageData class.
 */
suite("MessageData", () => {
  /**
   * Tests the method createFromSerializedData.
   */
  suite("createFromSerializedData", () => {
    /**
     * Tests that it should work with LiquibaseConfigurationData.
     */
    test("should work with LiquibaseConfigurationData", () => {
      const initialData = new MessageData(
        MessageType.INIT,
        LiquibaseConfigurationData.createDefaultData(
          {
            defaultDatabaseForConfiguration: "MariaDB",
            liquibaseDirectoryInProject: "",
            customDrivers: undefined,
          },
          ConfigurationStatus.NEW
        )
      );

      const cloned = MessageData.clone(JSON.parse(JSON.stringify(initialData)));

      assert.ok(cloned.configurationData, "configuration data should be there");

      assert.deepStrictEqual(initialData, cloned);
    });

    /**
     * Tests that it should work with LoggingMessageWithLevel.
     */
    test("should work with LoggingMessageWithLevel", () => {
      const initialData = new MessageData(MessageType.LOG_MESSAGE, {
        level: "info",
        message: "my message",
        notifyUser: true,
      });

      const cloned = MessageData.clone(JSON.parse(JSON.stringify(initialData)));

      assert.ok(!cloned.configurationData, "no configuration data should be there");

      assert.deepStrictEqual(initialData, cloned);
    });
  });
});
