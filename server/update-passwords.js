const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');

const updatePasswords = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({});
        console.log(`Found ${users.length} users`);

        const salt = await bcrypt.genSalt(10);

        for (const user of users) {
            const newPassword = await bcrypt.hash(user.email, salt);
            await User.updateOne({ _id: user._id }, { $set: { password: newPassword } });
            console.log(`Updated password for: ${user.email}`);
        }

        console.log('All passwords updated successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

updatePasswords();
