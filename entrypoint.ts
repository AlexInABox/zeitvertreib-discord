import Logging from './lib/Logging.js';
import { setupCommands } from './setupCommands.js';

/**
 * Application entrypoint that handles the startup sequence:
 * 1. Register Discord commands
 * 2. Wait for commands to register
 * 3. Start the main application
 */
async function start(): Promise<void> {
  try {
    Logging.logInfo('Setting up Discord commands...');
    await setupCommands();
    
    Logging.logInfo('Waiting for commands to register (5 seconds)...');
    await new Promise<void>(resolve => setTimeout(resolve, 5000));
    
    Logging.logInfo('Starting main application...');
    // Import and run the main application
    await import('./index.js');
  } catch (error) {
    Logging.logError(`Startup error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Start the application
start().catch(error => {
  console.error('Fatal error in application startup:', error);
  process.exit(1);
});
