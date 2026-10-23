/**
 * The message types any of the messages can have.
 */
export enum MessageType {
  /**
   * Initializes the webview with the configuration data.
   */
  INIT = "INIT",

  /**
   * Saves the connection that was entered in the webview.
   */
  SAVE_CONNECTION = "SAVE_CONNECTION",

  /**
   * Informs the webview that saving was successful.
   */
  SAVING_SUCCESSFUL = "SAVING_SUCCESSFUL",

  /**
   * Tests the connection that was entered in the webview.
   */
  TEST_CONNECTION = "TEST_CONNECTION",

  /**
   * Lets the user choose a changelog file.
   */
  CHOOSE_CHANGELOG = "CHOOSE_CHANGELOG",

  /**
   * Transfers the chosen changelog file back to the webview.
   */
  CHOOSE_CHANGELOG_RESULT = "CHOOSE_CHANGELOG_RESULT",

  /**
   * Transfers a log message to the webview.
   */
  LOG_MESSAGE = "LOG_MESSAGE",

  /**
   * Opens the help page in the webview.
   */
  HELP = "HELP",
}
