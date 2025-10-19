// login username and password for this application
export const loginUsername = "eng";
export const loginPassword = "eng";

// maximum number of lines to show in the log file
export const logFileLines = 1000;

// maximum number of application logs to show in the dashboard
export const displayLastNLogs = 100;

// server credentials:
// it follows the format {aliasName: [benchName, username, password, port]}
// port number is optional and will default to 22 if not specified
const serverCredentials: Record<string, string[]> = {
  alias1: ["benchName", "username", "password", "2222"],
  alias2: ["benchName", "username", "password"], // For this server, port will be 22
};

export default serverCredentials;
