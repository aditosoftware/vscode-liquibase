/**
 * The values that can be inputted into the form elements.
 */
export interface InputValues {
  name: string;
  username: string;
  password: string;
  url: string;
  driver: string;
  classpath: string;
}

export interface MessageData {
  command: string;
  inputValues: InputValues;
  databaseType: string;
}
