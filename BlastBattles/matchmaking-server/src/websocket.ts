import { serve, Server } from 'bun';
import pino from 'pino';

import MemoryUsageTimer from './utils/memory-usage';
const memoryUsageTimer = new MemoryUsageTimer(100);
memoryUsageTimer.start();

const logger = pino({
    level: 'debug',  // Set the initial log level to debug
});

interface WebSocketData {
    playerId: string;
    ws: WebSocket;
}

interface WebSocket {
    data: any;
    send: (data: string) => void;
}

const playerSockets = new Map<string, WebSocket>();

const server = serve({
    fetch(req: Request, server: Server): Response | Promise<Response> {
        const upgraded = server.upgrade(req, {
            data: {
                playerId: generatePlayerId()
            },
        });

        if (!upgraded) {
            return new Response('Upgrade failed', {
                status: 500
            });
        }

        return new Response(null, {
            status: 101
        });
    },
    websocket: {
        perMessageDeflate: true,
        open(ws) {
            const data = ws.data as WebSocketData;
            playerSockets.set(data.playerId, ws);
            logger.debug(`Player ID: ${data.playerId} connected`);
        },
        message(ws, message) {
            const wsData = ws.data as WebSocketData;
            const messageText = message.toString();
            switch (messageText) {
                case 'q': // Queue player
                    process.send!({ type: 'queue', playerId: wsData.playerId });
                    logger.debug(`Queued Player ID: ${wsData.playerId}`);
                    break;
                case 'd': // Dequeue player
                    process.send!({ type: 'dequeue', playerId: wsData.playerId });
                    logger.debug(`Dequeued Player ID: ${wsData.playerId}`);
                    break;
                default:
                    logger.debug(`Unknown command from Player ID: ${wsData.playerId}`);
            }
        },
        close(ws) {
            const data = ws.data as WebSocketData;
            playerSockets.delete(data.playerId);
            process.send!({ type: 'dequeue', playerId: data.playerId });
            logger.debug(`WebSocket disconnected, Player ID: ${data.playerId} dequeued`);
        },
    },
});

logger.debug(`WebSocket server is running on ${server.hostname}:${server.port}`);

function generatePlayerId(): string {
    return Math.random().toString(36).substring(7);
}

// Listen for IPC messages regarding matchmaking
process.on('message', (message: any) => {
    if (message.type === 'matchFound') {
        message.playerIds.forEach((playerId: string) => {
            const ws = playerSockets.get(playerId);
            if (ws) {
                ws.send(`Match found: Match ID ${message.matchId} with players: ${message.playerIds.join(', ')}`);
            }
        });
        logger.debug(`Notified matched players: ${message.playerIds.join(', ')}`);
    }
});

// Print the total number of connected WebSockets every 10 seconds
setInterval(() => {
    logger.debug(`Total WebSockets connected: ${playerSockets.size}`);
  }, 10000);
