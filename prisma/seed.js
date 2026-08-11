import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const apps = [
    {
      appName: 'fitness_journal',
      secrets: [
        { label: 'default', secret: 'fj_secret_xxx' },
      ],
    },
    {
      appName: 'warranty_tracker',
      secrets: [
        { label: 'default', secret: 'wt_secret_xxx' },
      ],
    },
    {
      appName: 'sub_manager',
      secrets: [
        { label: 'default', secret: 'sm_secret_xxx' },
      ],
    },
    {
      appName: 'english_conv',
      secrets: [
        { label: 'default', secret: 'ec_secret_xxx' },
      ],
    },
  ];

  for (const app of apps) {
    const record = await prisma.app.upsert({
      where: { appName: app.appName },
      update: {},
      create: { appName: app.appName },
    });

    for (const s of app.secrets) {
      const existing = await prisma.appSecret.findFirst({
        where: { appId: record.id, label: s.label, revokedAt: null },
      });
      if (!existing) {
        const hashed = await bcrypt.hash(s.secret, 12);
        await prisma.appSecret.create({
          data: { appId: record.id, label: s.label, secret: hashed },
        });
        console.log(`  ✓ Secret "${s.label}" created`);
      } else {
        console.log(`  - Secret "${s.label}" already exists, skipping`);
      }
    }
    console.log(`✓ App registered: ${app.appName}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
