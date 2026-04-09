const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');
const FinancialYear = require('./models/FinancialYear');

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mediclaim');
    console.log('Connected to DB for seeding...');

    // Clear existing
    await User.deleteMany({ email: { $in: ['admin@college.edu', 'faculty@college.edu'] } });

    const salt = await bcrypt.genSalt(10);
    const adminPass = await bcrypt.hash('admin123', salt);
    const facultyPass = await bcrypt.hash('faculty123', salt);

    const users = [
      {
        name: 'Super Admin',
        email: 'admin@college.edu',
        password: adminPass,
        role: 'admin',
        department: 'ADMINISTRATION',
        empId: 'ADM001',
        status: 'active'
      },
      {
        name: 'Test Faculty',
        email: 'faculty@college.edu',
        password: facultyPass,
        role: 'faculty',
        department: 'COMPUTER SCIENCE',
        empId: 'FAC101',
        status: 'active'
      }
    ];

    await User.insertMany(users);
    console.log('Users seeded successfully!');

    // Ensure at least one active FY exists
    const existingFY = await FinancialYear.findOne({ name: '2026-2027' });
    if (!existingFY) {
        await FinancialYear.create({
            name: '2026-2027',
            enabled: true,
            maxChildren: 2,
            maxParents: 4,
            allowSpouse: true,
            allowChildren: true,
            allowParents: true,
            policies: [
                { id: 'p1', label: '1.5 Lakhs', premium: 4500 },
                { id: 'p2', label: '5 Lakhs', premium: 8500 },
                { id: 'p3', label: '10 Lakhs', premium: 12500 }
            ]
        });
        console.log('Default FY seeded!');
    }

    mongoose.disconnect();
    console.log('Seeding finished.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();
