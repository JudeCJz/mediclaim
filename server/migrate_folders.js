const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB for migration...");

        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        const names = collections.map(c => c.name);

        const renameMapping = {
            'users': 'ACCOUNTS.Users',
            'financialyears': 'SESSIONS.Cycles',
            'auditlogs': 'SYSTEM.AuditLogs',
            'claims': 'SESSIONS.All_Enrollments'
        };

        for (const [oldName, newName] of Object.entries(renameMapping)) {
            if (names.includes(oldName) && !names.includes(newName)) {
                console.log(`Renaming ${oldName} -> ${newName}`);
                await db.collection(oldName).rename(newName);
            }
        }

        // Special handling for legacy claims if they exist in the fresh 'SESSIONS.All_Enrollments'
        if (names.includes('claims') || names.includes('SESSIONS.All_Enrollments')) {
            const enrollments = await db.collection('SESSIONS.All_Enrollments').find().toArray();
            for (const doc of enrollments) {
                if (doc.fyName) {
                    const fyNameClean = doc.fyName.replace(/[^a-zA-Z0-9]/g, '_');
                    const cycleCollectionName = `SESSIONS.CYCLES.${fyNameClean}.Claims`;
                    console.log(`Syncing enrollment for ${doc.userName} to ${cycleCollectionName}`);
                    await db.collection(cycleCollectionName).updateOne(
                        { userId: doc.userId, fyId: doc.fyId },
                        { $set: doc },
                        { upsert: true }
                    );
                }
            }
        }

        console.log("Migration complete!");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
};

migrate();
