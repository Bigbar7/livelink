import { prisma } from '../src/lib/db';

async function main() {
  const user = await prisma.user.upsert({
    where: { id: 'demo-user-jun' },
    update: {
      displayName: 'Jun',
      role: 'AI Product Builder',
      city: 'Shanghai'
    },
    create: {
      id: 'demo-user-jun',
      displayName: 'Jun',
      role: 'AI Product Builder',
      city: 'Shanghai'
    }
  });

  await prisma.agent.upsert({
    where: { id: 'demo-agent-jun' },
    update: {
      userId: user.id,
      name: 'Jun 的数字分身',
      understandingScore: 36
    },
    create: {
      id: 'demo-agent-jun',
      userId: user.id,
      name: 'Jun 的数字分身',
      understandingScore: 36
    }
  });
}

main().finally(async () => {
  await prisma.$disconnect();
});
