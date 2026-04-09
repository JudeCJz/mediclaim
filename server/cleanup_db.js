const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const forceCleanup = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const db = mongoose.connection.db;
        
        const mapping = {
            'users': 'ACCOUNTS.Users',
            'financialyears': 'SESSIONS.Cycles',
            'auditlogs': 'SYSTEM.AuditLogs',
            'claims': 'SESSIONS.All_Enrollments'
        };

        for (const [oldName, newName] of Object.entries(mapping)) {
            const oldColl = db.collection(oldName);
            const newColl = db.collection(newName);
            
            const docs = await oldColl.find().toArray();
            if (docs.length > 0) {
                console.log(`Moving ${docs.length} docs from ${oldName} to ${newName}`);
                for (const doc of docs) {
                    await newColl.updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
                }
            }
            console.log(`Dropping legacy collection: ${oldName}`);
            await oldColl.drop().catch(() => {});
        }

        console.log("Cleanup complete. Compass will now show ONLY the new folder structure.");
        process.exit(0);
    } catch (err) {
        console.error("Cleanup failed:", err);
        process.exit(1);
    }
};

forceCleanup();
