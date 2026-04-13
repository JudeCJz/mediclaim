const bcrypt = require('bcryptjs');

const passwordToHash = process.argv[2];

if (!passwordToHash) {
    console.log('Usage: node hash-pass.js <your_password>');
    process.exit(1);
}

async function generate() {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(passwordToHash, salt);
    console.log('----------------------------------------');
    console.log('Original Password:', passwordToHash);
    console.log('Bcrypt Hash:      ', hash);
    console.log('----------------------------------------');
}

generate();
