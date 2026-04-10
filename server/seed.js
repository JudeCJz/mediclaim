const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Seed: Connected to MongoDB');

        const salt = await bcrypt.genSalt(10);
        const adminPassword = await bcrypt.hash('admin@college.edu', salt);
        const facultyPassword = await bcrypt.hash('faculty123', salt);

        // Upsert Admin
        await User.updateOne(
            { email: 'admin@college.edu' },
            { 
                $set: { 
                    name: 'Admin Head',
                    department: 'ADMINISTRATION',
                    empId: 'ADMIN001',
                    password: adminPassword,
                    role: 'admin',
                    status: 'active'
                }
            },
            { upsert: true }
        );
        console.log('Seed: Admin verified');

        // Upsert Default Faculty
        await User.updateOne(
            { email: 'faculty@college.edu' },
            { 
                $set: { 
                    name: 'Default Faculty',
                    department: 'CS',
                    empId: 'FAC001',
                    password: facultyPassword,
                    role: 'faculty',
                    status: 'active'
                }
            },
            { upsert: true }
        );
        console.log('Seed: Faculty verified');

        console.log('Seed completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Seed Error:', err);
        process.exit(1);
    }
};

seed();
