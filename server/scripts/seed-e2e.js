const bcrypt = require('bcryptjs')
const { userA, userB, getE2EPassword } = require('../../tests/fixtures/users')

function testDatabaseUrl() {
  const value = process.env.TEST_DATABASE_URL
  if (!value) throw new Error('TEST_DATABASE_URL is required for E2E database setup.')

  const url = new URL(value)
  const database = decodeURIComponent(url.pathname.slice(1)).toLowerCase()
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (!database.includes('test') || !['localhost', '127.0.0.1', '::1'].includes(host) || url.password) {
    throw new Error('E2E setup requires a password-free, loopback PostgreSQL database with "test" in its name.')
  }
  process.env.DATABASE_URL = value
  return value
}

async function main() {
  testDatabaseUrl()
  const prisma = require('../src/services/prisma')
  const emails = [userA.email, userB.email]

  try {
    if (process.argv.includes('--clean')) {
      await prisma.user.deleteMany({ where: { email: { in: emails } } })
      return
    }

    const passwordHash = await bcrypt.hash(getE2EPassword(), 10)
    const accounts = []
    for (const user of [userA, userB]) {
      accounts.push(await prisma.user.upsert({
        where: { email: user.email },
        update: { userId: user.userId, passwordHash },
        create: { email: user.email, userId: user.userId, passwordHash },
      }))
    }

    const ids = accounts.map(({ id }) => id)
    await prisma.activity.deleteMany({
      where: { OR: [{ senderId: { in: ids } }, { receiverId: { in: ids } }] },
    })
    await prisma.friendship.deleteMany({
      where: { OR: [{ userId1: { in: ids } }, { userId2: { in: ids } }] },
    })
    await prisma.groupChat.deleteMany({ where: { createdById: { in: ids } } })
    await prisma.friendship.create({
      data: {
        userId1: ids[0] < ids[1] ? ids[0] : ids[1],
        userId2: ids[0] < ids[1] ? ids[1] : ids[0],
        requestorId: ids[0],
        status: 'accepted',
      },
    })
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error('E2E test account setup failed:', error.message)
  process.exitCode = 1
})
