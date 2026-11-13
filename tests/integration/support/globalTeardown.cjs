module.exports = async function globalTeardown() {
  if (!process.env.TEST_DATABASE_URL) return

  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  const prisma = require('../../../server/src/services/prisma')
  await prisma.$disconnect()
}
