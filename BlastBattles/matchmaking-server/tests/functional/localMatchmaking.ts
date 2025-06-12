const WebSocket = require('ws');
const pino = require('pino');

// Set up Pino logger
const logger = pino({
  level: 'debug', // Set the initial log level to debug
});

// Configuration
const NUM_CONNECTIONS = 10000; // Number of WebSocket connections
const MIN_WAIT_TIME = 0; // Minimum wait time in milliseconds before queuing
const MAX_WAIT_TIME = 0; // Maximum wait time in milliseconds before queuing
const CONNECTION_INTERVAL_MIN = 0; // Minimum delay before initiating each connection
const CONNECTION_INTERVAL_MAX = 0; // Maximum delay before initiating each connection

let startTime; // Variable to store the start time
let connectedCount = 0; // Counter for established connections
let queuedCount = 0; // Counter for queued connections
let matchesFound = 0; // Counter for received "Match found" messages

// Connect multiple WebSocket clients to the server with random initial delays
function connectAndQueue(i) {
  // Delay connection start
  const connectionDelay = Math.floor(Math.random() * (CONNECTION_INTERVAL_MAX - CONNECTION_INTERVAL_MIN + 1)) + CONNECTION_INTERVAL_MIN;
  setTimeout(() => {
    const ws = new WebSocket('ws://localhost:3000');

    ws.on('open', () => {
      if(!startTime) {
        startTime = Date.now();
      }
      connectedCount++;
      logger.debug(`Connection ${i} established`);

      // Random delay before sending queue message
      const waitTime = Math.floor(Math.random() * (MAX_WAIT_TIME - MIN_WAIT_TIME + 1)) + MIN_WAIT_TIME;
      setTimeout(() => {
        ws.send('q'); // Send 'q' to queue the player
        queuedCount++;
        logger.debug(`Connection ${i} queued after ${waitTime} ms`);
      }, waitTime);
    });

    ws.on('message', (data) => {
      logger.debug(`Connection ${i} received message: ${data}`);

      if (data.includes('Match found')) {
        matchesFound++;

        if (matchesFound === NUM_CONNECTIONS) {
          const endTime = Date.now(); // Record the end time when all matches are found
          const totalTime = endTime - startTime; // Calculate the total time
          logger.info(`All matches found in ${totalTime} ms`);
        }
      }
    });

    ws.on('close', () => {
      logger.debug(`Connection ${i} disconnected`);
    });

    ws.on('error', (error) => {
      logger.debug(`Connection ${i} error: ${error}`);
    });
  }, connectionDelay);
}

// Create the specified number of WebSocket connections
for (let i = 1; i <= NUM_CONNECTIONS; i++) {
  connectAndQueue(i);
}