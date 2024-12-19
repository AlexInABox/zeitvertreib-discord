import chalk from "chalk";

// Logging helper functions
async function logError(message) {
  console.log(chalk.red(`[ERROR] ${message}`));
}

async function logCritical(message) {
  console.log(chalk.bgRed.white.bold(`[CRITICAL] ${message}`));
}

async function logWarning(message) {
  console.log(chalk.yellow(`[WARNING] ${message}`));
}

async function logInfo(message) {
  console.log(chalk.white(`[INFO] ${message}`));
}

async function printTestLogs() {
  await logError("This is an error log example.");
  await logCritical("This is a critical log example.");
  await logWarning("This is a warning log example.");
  await logInfo("This is an informational log example.");
  console.log("");
}

printTestLogs();

export default { logError, logCritical, logWarning, logInfo };
