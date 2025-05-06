import chalk from "chalk";

// Logging helper functions
function logError(message: string | Error): void {
  console.log(chalk.red(`[ERROR] ${message instanceof Error ? message.message : message}`));
}

function logCritical(message: string | Error): void {
  console.log(chalk.bgRed.white.bold(`[CRITICAL] ${message instanceof Error ? message.message : message}`));
}

function logWarning(message: string | Error): void {
  console.log(chalk.yellow(`[WARNING] ${message instanceof Error ? message.message : message}`));
}

function logInfo(message: string): void {
  console.log(chalk.white(`[INFO] ${message}`));
}

function printTestLogs(): void {
  logError("This is an error log example.");
  logCritical("This is a critical log example.");
  logWarning("This is a warning log example.");
  logInfo("This is an informational log example.");
  console.log("");
}

// Run test logs when this module is executed directly
if (require.main === module) {
  printTestLogs();
}

export default { logError, logCritical, logWarning, logInfo };