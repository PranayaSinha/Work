import { expect } from 'chai'
import { WebSocketServer } from 'ws'
import WebSocket from 'ws'
import { createServer } from 'http'

// Simple test to ensure server matches a bid with an ask

describe('exchange server', () => {
  it('matches a bid with an ask', done => {
    const httpServer = createServer()
    const wss = new WebSocketServer({ server: httpServer })
    const bids: WebSocket[] = []
    const asks: WebSocket[] = []

    wss.on('connection', ws => {
      ws.on('message', message => {
        const text = message.toString()
        if (text.startsWith('bid')) {
          bids.push(ws)
          if (asks.length > 0) {
            const ask = asks.shift()!
            ws.send('matched')
            ask.send('matched')
          }
        } else if (text.startsWith('ask')) {
          asks.push(ws)
          if (bids.length > 0) {
            const bid = bids.shift()!
            ws.send('matched')
            bid.send('matched')
          }
        }
      })
    })

    httpServer.listen(() => {
      const { port } = httpServer.address() as any
      const bidder = new WebSocket(`ws://localhost:${port}`)
      const asker = new WebSocket(`ws://localhost:${port}`)

      let matchedCount = 0

      bidder.on('open', () => bidder.send('bid 1'))
      asker.on('open', () => asker.send('ask 1'))

      function check() {
        matchedCount++
        if (matchedCount === 2) {
          httpServer.close()
          done()
        }
      }

      bidder.on('message', msg => {
        expect(msg.toString()).to.equal('matched')
        check()
      })
      asker.on('message', msg => {
        expect(msg.toString()).to.equal('matched')
        check()
      })
    })
  })
})
