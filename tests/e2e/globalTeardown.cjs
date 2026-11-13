module.exports = async function globalTeardown() {
  if (!process.env.TEST_DATABASE_URL) return

  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  const { userA, userB } = require('../fixtures/users')
  const prisma = require('../../server/src/services/prisma')

  try {
    await prisma.user.deleteMany({
      where: { email: { in: [userA.email, userB.email] } },
    })
  } finally {
    await prisma.$disconnect()
  }
}
