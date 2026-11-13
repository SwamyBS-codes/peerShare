const http = require('node:http')
const jwt = require('../../../server/node_modules/jsonwebtoken')
const WebSocket = require('../../../server/node_modules/ws')
const request = require('../../../server/node_modules/supertest')
const { createTestUsers, prisma, removeTestUsers, tokenFor } = require('../support/database')
const app = require('../../../server/src/app')
const { initWebSocketServer } = require('../../../server/src/websocket/server')
const { getSocketByUsername } = require('../../../server/src/services/userManager')

let users
let userA
let userB
let server
let wss
let endpoint
const clients = new Set()

function openSocket(token) {
  const socket = new WebSocket(`${endpoint}${token ? `?token=${encodeURIComponent(token)}` : ''}`)
  clients.add(socket)
  const readyMessage = waitForMessage(socket, 'connection-ready')
  const socketOpened = new Promise((resolve, reject) => {
    socket.once('open', resolve)
    socket.once('error', reject)
  })
  return Promise.all([socketOpened, readyMessage]).then(() => socket)
}

function waitForMessage(socket, type) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('message', onMessage)
      reject(new Error(`Timed out waiting for WebSocket message "${type}".`))
    }, 10000)
    const onMessage = (raw) => {
      let message
      try {
        message = JSON.parse(raw.toString())
      } catch {
        return
      }
      if (message.type !== type) return
      clearTimeout(timer)
      socket.off('message', onMessage)
      resolve(message)
    }
    socket.on('message', onMessage)
  })
}

function waitForClose(socket) {
  return new Promise((resolve) => {
    if (socket.readyState === WebSocket.CLOSED) return resolve()
    socket.once('close', resolve)
  })
}

beforeAll(async () => {
  users = await createTestUsers(2)
  ;[userA, userB] = users
  server = http.createServer(app)
  wss = initWebSocketServer(server)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  endpoint = `ws://127.0.0.1:${server.address().port}/`
})

afterAll(async () => {
  for (const socket of clients) {
    if (socket.readyState !== WebSocket.CLOSED) socket.close()
  }
  await new Promise((resolve) => wss.close(resolve))
  await new Promise((resolve) => server.close(resolve))
  await removeTestUsers(users)
})

describe('authenticated WebSocket signaling', () => {
  it('rejects missing and invalid session tokens', async () => {
    const unauthenticated = new WebSocket(endpoint)
    clients.add(unauthenticated)
    const missingTokenMessage = waitForMessage(unauthenticated, 'error')
    const missingTokenClose = waitForClose(unauthenticated)
    expect((await missingTokenMessage).message).toContain('token missing')
    await missingTokenClose

    const invalid = new WebSocket(`${endpoint}?token=${jwt.sign({ id: userA.id }, 'invalid-secret')}`)
    clients.add(invalid)
    const invalidTokenMessage = waitForMessage(invalid, 'error')
    const invalidTokenClose = waitForClose(invalid)
    expect((await invalidTokenMessage).message).toContain('Session invalid')
    await invalidTokenClose
  })

  it('relays invitations and WebRTC signaling and unregisters a disconnected peer', async () => {
    const socketA = await openSocket(tokenFor(userA))
    const socketB = await openSocket(tokenFor(userB))
    const inviteMessage = JSON.stringify({ id: 'invite-1', type: 'call-invite' })
    const inviteReceived = waitForMessage(socketB, 'incoming-invite')
    socketA.send(JSON.stringify({
      type: 'invite',
      targetUserId: userB.userId,
      mediaType: 'video',
      inviteMessage,
    }))
    await expect(inviteReceived).resolves.toMatchObject({
      senderUserId: userA.userId,
      mediaType: 'video',
      inviteMessage,
    })

    const responseReceived = waitForMessage(socketA, 'invite-response')
    socketB.send(JSON.stringify({
      type: 'invite-response',
      targetUserId: userA.userId,
      accepted: true,
      messageId: 'invite-1',
    }))
    await expect(responseReceived).resolves.toMatchObject({
      senderUserId: userB.userId,
      accepted: true,
      messageId: 'invite-1',
    })

    const signalReceived = waitForMessage(socketB, 'signal')
    socketA.send(JSON.stringify({
      type: 'signal',
      targetUserId: userB.userId,
      data: { sdp: { type: 'offer', sdp: 'test-offer' } },
    }))
    await expect(signalReceived).resolves.toMatchObject({
      fromUserId: userA.userId,
      data: { sdp: { type: 'offer', sdp: 'test-offer' } },
    })

    const socketClosed = waitForClose(socketA)
    const offlineStatus = waitForMessage(socketB, 'status-update')
    socketA.close()
    await socketClosed
    expect(getSocketByUsername(userA.userId)).toBeFalsy()
    const statusUpdate = await offlineStatus
    expect(statusUpdate.statuses[userA.userId]).toBe(false)
    expect(statusUpdate.lastSeenAt[userA.userId]).toEqual(expect.any(String))

    const persistedUser = await prisma.user.findUnique({ where: { id: userA.id } })
    expect(persistedUser.lastSeenAt).toBeInstanceOf(Date)

    const friends = await request(app)
      .get('/api/friends')
      .set('Authorization', `Bearer ${tokenFor(userB)}`)
      .expect(200)
    expect(friends.body.friends.find((friend) => friend.friendId === userA.id).lastSeenAt)
      .toBe(persistedUser.lastSeenAt.toISOString())

    const refreshedPresence = waitForMessage(socketB, 'status-update')
    socketB.send(JSON.stringify({ type: 'check-status', friends: [userA.userId] }))
    await expect(refreshedPresence).resolves.toMatchObject({
      statuses: { [userA.userId]: false },
      lastSeenAt: { [userA.userId]: persistedUser.lastSeenAt.toISOString() },
    })

    socketB.close()
    await waitForClose(socketB)
    expect(getSocketByUsername(userB.userId)).toBeFalsy()
  })
})
