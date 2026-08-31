const prisma = require('./src/services/prisma.js');

async function main() {
  const activities = await prisma.activity.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  console.log(JSON.stringify(activities, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
