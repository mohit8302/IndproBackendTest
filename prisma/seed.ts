import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const involvementData = [
        { name: 'Around 2 hours weekly', involvementType: 'LOW' },
        { name: 'Around 4 hours every week', involvementType: 'LOW' },
        { name: 'Less than an hour daily', involvementType: 'MEDIUM' },
        { name: 'Around 10 hours every week', involvementType: 'MEDIUM' },
        { name: 'Working together daily for more than 2 hours', involvementType: 'HIGH' },
        { name: 'Around 6 hours daily', involvementType: 'HIGH' },
    ];

    for (const data of involvementData) {
        await prisma.involvement.create({
            data,
        });
    }
}

main()
    .then(() => {
        console.log('Seed data inserted');
    })
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
