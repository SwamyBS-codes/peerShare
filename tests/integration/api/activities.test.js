const request = require('../../../server/node_modules/supertest')
const { createTestUsers, prisma, removeTestUsers, tokenFor } = require('../support/database')
const app = require('../../../server/src/app')

let users
let userA
let userB
let outsider
let tokenA
let tokenB
let outsiderToken

beforeAll(async () => {
  users = await createTestUsers()
  ;[userA, userB, outsider] = users
  tokenA = tokenFor(userA)
  tokenB = tokenFor(userB)
  outsiderToken = tokenFor(outsider)
})

afterAll(async () => {
  await removeTestUsers(users)
})

describe('authenticated API and activity persistence', () => {
  it('authenticates valid credentials and rejects invalid credentials', async () => {
    const loggedIn = await request(app)
      .post('/api/auth/login')
      .send({ email: userA.email, password: userA.password })
      .expect(200)

    expect(loggedIn.body).toMatchObject({ ok: true, user: { id: userA.id, userId: userA.userId } })
    expect(loggedIn.body.token).toEqual(expect.any(String))

    const rejected = await request(app)
      .post('/api/auth/login')
      .send({ email: userA.email, password: 'wrong-password' })
      .expect(400)
    expect(rejected.body.ok).toBe(false)
  })

  it('requires a valid session for profile access', async () => {
    await request(app).get('/api/users/me').expect(401)
    await request(app).get('/api/users/me').set('Authorization', 'Bearer invalid').expect(403)

    const profile = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200)

    expect(profile.body.user).toMatchObject({ id: userA.id, userId: userA.userId })
  })

  it('validates activity input, persists history, and enforces peer access', async () => {
    const authA = { Authorization: `Bearer ${tokenA}` }

    await request(app)
      .post('/api/activities')
      .set(authA)
      .send({ receiverId: userB.id })
      .expect(400)

    await request(app)
      .post('/api/activities')
      .set(authA)
      .send({ receiverId: userB.id, type: 'unsupported' })
      .expect(400)

    await request(app)
      .post('/api/activities')
      .set({ Authorization: `Bearer ${outsiderToken}` })
      .send({ receiverId: userB.id, type: 'text', content: 'must not cross peers' })
      .expect(403)

    const created = await request(app)
      .post('/api/activities')
      .set(authA)
      .send({ receiverId: userB.id, type: 'text', content: 'persisted test message' })
      .expect(200)

    expect(created.body.log).toMatchObject({
      senderId: userA.id,
      receiverId: userB.id,
      type: 'text',
      content: 'persisted test message',
    })

    const persisted = await prisma.activity.findUnique({
      where: { id: created.body.log.id },
      include: { sender: true, receiver: true },
    })
    expect(persisted.sender.id).toBe(userA.id)
    expect(persisted.receiver.id).toBe(userB.id)

    const history = await request(app)
      .get(`/api/activities?friendId=${userA.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200)
    expect(history.body.logs.map((log) => log.id)).toContain(created.body.log.id)

    await request(app)
      .get(`/api/activities?friendId=${userB.id}`)
      .set({ Authorization: `Bearer ${outsiderToken}` })
      .expect(403)

    await request(app)
      .patch(`/api/activities/${created.body.log.id}`)
      .set({ Authorization: `Bearer ${outsiderToken}` })
      .send({ content: 'unauthorized update' })
      .expect(403)

    const updated = await request(app)
      .patch(`/api/activities/${created.body.log.id}`)
      .set({ Authorization: `Bearer ${tokenB}` })
      .send({ metadata: { deliveryStatus: 'delivered' } })
      .expect(200)
    expect(updated.body.log.metadata).toMatchObject({ deliveryStatus: 'delivered' })

    await request(app)
      .get('/api/activities')
      .set(authA)
      .expect(400)
  })
})
