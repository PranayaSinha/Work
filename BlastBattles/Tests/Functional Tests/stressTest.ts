// !!! NOTE !!! - dincrease matchmaking timer to be infinite so that it ONLY queues to keep connection going

import pino from 'pino';
import WebSocket from 'ws';

// Set up Pino logger
const logger = pino({
  level: 'debug', // Set the initial log level to debug
});

const WEBSOCKET_CREATION_INTERVAL = 100; // Interval between creating each WebSocket connection (in milliseconds)
const MAX_WEBSOCKETS = 25000; // Maximum number of WebSocket connections to create

const connectedWebSockets: WebSocket[] = [];

function createWebSocketConnection() {
  if (connectedWebSockets.length >= MAX_WEBSOCKETS) {
    logger.info(`Maximum number of WebSocket connections (${MAX_WEBSOCKETS}) reached.`);
    return;
  }

  const ws = new WebSocket('ws://localhost:3000'); // Replace with your WebSocket server URL

  ws.on('open', () => {
    connectedWebSockets.push(ws);
    logger.info(`WebSocket connection established. Total connected: ${connectedWebSockets.length}`);
  });

  ws.on('close', () => {
    const index = connectedWebSockets.indexOf(ws);
    if (index !== -1) {
      connectedWebSockets.splice(index, 1);
      logger.info(`WebSocket connection closed. Total connected: ${connectedWebSockets.length}`);
    }
  });

  ws.on('error', (error) => {
    logger.error(`WebSocket error: ${error.message}`);
    throw error;
  });

  setTimeout(createWebSocketConnection, WEBSOCKET_CREATION_INTERVAL);
}

function startStressTest() {
  logger.info('Starting WebSocket stress test...');
  createWebSocketConnection();
}

startStressTest();