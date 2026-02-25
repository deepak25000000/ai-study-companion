// test-save.js
// This file tests saving data to MongoDB

require('dotenv').config();
const mongoose = require('mongoose');

// Create a simple test schema
const testSchema = new mongoose.Schema({
    message: String,
    timestamp: { type: Date, default: Date.now }
});

const Test = mongoose.model('Test', testSchema);

async function testDatabase() {
    try {
        console.log('\n🔍 Testing SAVE operation...\n');

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Save a test document
        const testDoc = new Test({ message: 'Hello MongoDB!' });
        await testDoc.save();
        console.log('✅ Saved test document. ID:', testDoc._id);

        // Read it back
        const found = await Test.findOne({ message: 'Hello MongoDB!' });
        console.log('✅ Found test document. ID:', found._id);

        // Clean up
        await Test.deleteOne({ _id: testDoc._id });
        console.log('✅ Cleaned up test document');

        console.log('\n🎉🎉🎉 DATABASE IS FULLY WORKING! 🎉🎉🎉');
        console.log('✅ Connect ✅ Save ✅ Read ✅ Delete\n');
        process.exit(0);
    } catch (error) {
        console.log('❌❌❌ TEST FAILED! ❌❌❌');
        console.error('Error:', error.message);
        process.exit(1);
    }
}

testDatabase();