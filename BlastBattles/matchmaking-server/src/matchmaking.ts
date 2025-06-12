import pino from 'pino';

// import MemoryUsageTimer from './utils/memory-usage';
// const memoryUsageTimer = new MemoryUsageTimer(100);
// memoryUsageTimer.start();

// Set up Pino logger
const logger = pino({
  level: 'debug', // Set the initial log level to debug
});

interface Player {
  playerId: string;
}

const queue: Player[] = [];

const MATCH_MAKING_TICK = 100;

function startMatchmaking() {
  while (queue.length >= 4) {
    const matchedPlayers = queue.splice(0, 4);
    const matchId = generateMatchId();
    const playerIds = matchedPlayers.map(p => p.playerId);

    // Send an IPC message to websocket process
    process.send!({
      type: 'matchFound',
      matchId,
      playerIds
    });

    logger.info(`Match ${matchId} created with players: ${playerIds.join(', ')}`);
  }

  // Uncomment below if you want to log when the queue is not full
  // logger.debug('Queue is not full, waiting...');

  setTimeout(startMatchmaking, MATCH_MAKING_TICK);
}

function generateMatchId(): string {
  return Math.random().toString(36).substr(2, 9);
}

process.on('message', (message: any) => {
  logger.debug(`Received message: ${JSON.stringify(message)}`);

  if (message.type === 'queue') {
    queue.push({ playerId: message.playerId });
  } else if (message.type === 'dequeue' || message.type === 'disconnect') {
    const index = queue.findIndex((p) => p.playerId === message.playerId);
    if (index !== -1) {
      queue.splice(index, 1);
    }
  }
});

startMatchmaking();

logger.debug('Matchmaking server started');