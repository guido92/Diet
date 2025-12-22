const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
console.log('DB URL:', process.env.DATABASE_URL);
const prisma = new PrismaClient();

const DATA_FILE = path.resolve(__dirname, '../tracker_data.json');

async function migrate() {
    console.log('Reading JSON data...');
    if (!fs.existsSync(DATA_FILE)) {
        console.error('No tracker_data.json found!');
        return;
    }

    const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(rawData);

    // 1. Create Users
    for (const [name, profile] of Object.entries(data.users)) {
        const email = `${name.toLowerCase()} @diet.local`;
        const passwordHash = await bcrypt.hash('123456', 10);

        console.log(`Migrating User: ${name} (${email})...`);

        const user = await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                name: name,
                email: email,
                passwordHash,
                role: 'CLIENT', // Assuming current users are clients
            }
        });

        // 2. Create Profile
        await prisma.userProfile.create({
            data: {
                userId: user.id,
                startWeight: profile.startWeight || 0,
                currentWeight: profile.currentWeight || 0,
                targetWeight: profile.targetWeight || 0,
                height: profile.height || 0
            }
        });

        // 3. Migrate Logs
        if (profile.logs) {
            for (const log of profile.logs) {
                await prisma.weightLog.create({
                    data: {
                        profileId: (await prisma.userProfile.findUnique({ where: { userId: user.id } })).id,
                        date: new Date(log.date),
                        weight: log.weight || 0,
                        notes: log.notes
                    }
                });
            }
        }
    }

    // 4. Migrate Stores (Flyers)
    // In the old app, flyers were global. In the new SaaS, they belong to a user.
    // We'll assign them to "Michael" for now as he's likely the primary.
    const primaryUser = await prisma.user.findUnique({ where: { email: 'michael@diet.local' } });
    if (primaryUser && data.conadFlyers) {
        console.log('Migrating Flyers to Michael...');
        for (const flyer of data.conadFlyers) {
            await prisma.store.create({
                data: {
                    userId: primaryUser.id,
                    name: flyer.label || 'Negozio',
                    url: flyer.url,
                    lastSync: flyer.lastSync ? new Date(flyer.lastSync) : null,
                    storeId: flyer.storeId
                }
            });
        }
    }

    console.log('Migration Complete! Default password is "123456"');
}

migrate()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
