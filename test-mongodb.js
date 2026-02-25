// test-mongodb.js
require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;

console.log('\n🔍 ==================================');
console.log('🔍 TESTING MONGODB CONNECTION');
console.log('🔍 ==================================\n');

console.log('📌 Connection String:', uri.replace(/:([^@]+)@/, ':****@'));
console.log('📌 Database: study-companion');
console.log('📌 Username: thoratdeepak63_db_user');
console.log('📌 Cluster:', uri.split('@')[1].split('/')[0]);
console.log('\n🔄 Attempting to connect...\n');

mongoose.connect(uri)
    .then(() => {
        console.log('✅✅✅ SUCCESS! ✅✅✅');
        console.log('🎉 Connected to MongoDB Atlas!');
        console.log('📚 Database "study-companion" is ready');
        console.log('📦 Collections will be created automatically\n');
        process.exit(0);
    })
    .catch((err) => {
        console.log('❌❌❌ FAILED! ❌❌❌');
        console.log('Error:', err.message);
        console.log('\n🔧 CHECK THESE EXACTLY:');
        console.log('   1. Password: U1iVNTfELIzjYgod (no brackets)');
        console.log('   2. Cluster: cluster0.em48nlr.mongodb.net (LETTER l, not number 1)');
        console.log('   3. Database: /study-companion in the string');
        console.log('   4. Network: 0.0.0.0/0 added in Atlas\n');
        process.exit(1);
    });