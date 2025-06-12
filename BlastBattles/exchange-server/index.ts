import { serve, Server } from 'bun'
import pino from 'pino'

interface ClientData {
  clientId: string
}

interface Order {
  clientId: string
  ws: WebSocket
}

const logger = pino({ level: process.env.PINO_LOG_LEVEL || 'info' })

let nextClientId = 1
const bids: Order[] = []
const asks: Order[] = []

function matchOrders() {
  while (bids.length > 0 && asks.length > 0) {
    const bid = bids.shift()!
    const ask = asks.shift()!
    bid.ws.send(`Matched with seller ${ask.clientId}`)
    ask.ws.send(`Matched with buyer ${bid.clientId}`)
    logger.info(`Matched buyer ${bid.clientId} with seller ${ask.clientId}`)
  }
  setTimeout(matchOrders, 100)
}

const server = serve({
  fetch(req: Request, server: Server): Response | Promise<Response> {
    const upgraded = server.upgrade(req, {
      data: { clientId: String(nextClientId++) }
    })
    if (!upgraded) {
      return new Response('Upgrade failed', { status: 500 })
    }
    return new Response(null, { status: 101 })
  },
  websocket: {
    open(ws) {
      const data = ws.data as ClientData
      logger.debug(`client ${data.clientId} connected`)
    },
    message(ws, message) {
      const data = ws.data as ClientData
      const text = message.toString()
      if (text.startsWith('bid')) {
        bids.push({ clientId: data.clientId, ws })
        logger.debug(`received bid from ${data.clientId}`)
      } else if (text.startsWith('ask')) {
        asks.push({ clientId: data.clientId, ws })
        logger.debug(`received ask from ${data.clientId}`)
      }
    },
    close(ws) {
      const data = ws.data as ClientData
      ;[bids, asks].forEach(list => {
        const index = list.findIndex(o => o.clientId === data.clientId)
        if (index !== -1) list.splice(index, 1)
      })
      logger.debug(`client ${data.clientId} disconnected`)
    }
  }
})

logger.info(`Exchange server running on ${server.hostname}:${server.port}`)
matchOrders()
