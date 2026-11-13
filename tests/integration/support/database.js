const { randomBytes, randomUUID } = require('node:crypto')
const bcrypt = require('../../../server/node_modules/bcryptjs')
const jwt = require('../../../server/node_modules/jsonwebtoken')

function configureTestDatabase() {
  const connectionString = process.env.TEST_DATABASE_URL
  if (!connectionString) {
    throw new Error('TEST_DATABASE_URL is required for integration tests.')
  }

  const url = new URL(connectionString)
  const databaseName = decodeURIComponent(url.pathname.slice(1)).toLowerCase()
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (!databaseName.includes('test') || !['localhost', '127.0.0.1', '::1'].includes(hostname) || url.password) {
    throw new Error('Integration tests require a password-free, loopback PostgreSQL database with "test" in its name.')
  }

  process.env.DATABASE_URL = connectionString
  process.env.JWT_SECRET ||= randomBytes(32).toString('hex')
}

configureTestDatabase()
const prisma = require('../../../server/src/services/prisma')

async function createTestUsers(count = 3) {
  const users = []
  for (let index = 0; index < count; index += 1) {
    const id = randomUUID()
    const password = `test-${randomBytes(18).toString('hex')}`
    users.push(await prisma.user.create({
      data: {
        email: `test-${id}@example.test`,
        userId: `test_${id.replaceAll('-', '').slice(0, 20)}`,
        passwordHash: await bcrypt.hash(password, 4),
      },
    }).then((user) => ({ ...user, password })))
  }

  if (users.length > 1) {
    const [userA, userB] = users
    const [userId1, userId2] = [userA.id, userB.id].sort()
    await prisma.friendship.create({
      data: { userId1, userId2, requestorId: userA.id, status: 'accepted' },
    })
  }

  return users
}

function tokenFor(user) {
  return jwt.sign({ id: user.id, userId: user.userId }, process.env.JWT_SECRET, { expiresIn: '5m' })
}

async function removeTestUsers(users) {
  if (!users?.length) return
  await prisma.user.deleteMany({ where: { id: { in: users.map((user) => user.id) } } })
}

module.exports = { prisma, createTestUsers, tokenFor, removeTestUsers }
