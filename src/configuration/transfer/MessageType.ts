/**
 * The message types any of the message can have.
 */
export enum MessageType {
  INIT = "INIT",

  SAVE_CONNECTION = "SAVE_CONNECTION",
  SAVING_SUCCESSFUL = "SAVING_SUCCESSFUL",

  TEST_CONNECTION = "TEST_CONNECTION",

  CHOOSE_CHANGELOG = "CHOOSE_CHANGELOG",
  CHOOSE_CHANGELOG_RESULT = "CHOOSE_CHANGELOG_RESULT",

  LOG_MESSAGE = "LOG_MESSAGE",
}