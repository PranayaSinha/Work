import { spawn } from 'bun';

console.log('PINO_LOG_LEVEL:', process.env.PINO_LOG_LEVEL);

console.log("Starting servers...");

// Start the matchmaking process
const matchmakingProc = spawn(['bun', 'src/matchmaking.ts'], {
  ipc(message) {
    if (message.type === 'matchFound') {
      websocketProc.send(message);
    }
  },
  stdout: 'inherit', // Inherit stdout
  stderr: 'inherit', // Inherit stderr
  env: {
    ...process.env,
    PINO_LOG_LEVEL: process.env.PINO_LOG_LEVEL,
  },
});

// Start the WebSocket server
const websocketProc = spawn(['bun', 'src/websocket.ts'], {
  ipc(message) {
    matchmakingProc.send(message);
  },
  stdout: 'inherit', // Inherit stdout
  stderr: 'inherit', // Inherit stderr
  env: {
    ...process.env,
    PINO_LOG_LEVEL: process.env.PINO_LOG_LEVEL,
  },
});

console.log("Servers are running.");