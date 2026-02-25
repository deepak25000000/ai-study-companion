// verify-cluster.js
require('dotenv').config();
const dns = require('dns').promises;

async function verifyCluster() {
    console.log('\n🔍 VERIFYING CLUSTER NAME');
    console.log('========================\n');

    const uri = process.env.MONGODB_URI;

    // Extract cluster name
    const clusterMatch = uri.match(/@([^/]+)/);
    if (!clusterMatch) {
        console.log('❌ Could not extract cluster name from URI');
        return;
    }

    const clusterFull = clusterMatch[1];
    const clusterName = clusterFull.split('.')[0];

    console.log(`📌 Your cluster name: ${clusterName}`);
    console.log(`📌 Full address: ${clusterFull}`);
    console.log('');

    // Try to DNS lookup
    try {
        const srvRecord = `_mongodb._tcp.${clusterFull}`;
        console.log(`🔎 Looking up: ${srvRecord}`);

        const addresses = await dns.resolveSrv(srvRecord);
        console.log(`✅ DNS lookup SUCCESS!`);
        console.log(`📊 Found ${addresses.length} server(s)`);

    } catch (err) {
        console.log(`❌ DNS lookup FAILED!`);
        console.log(`Error: ${err.message}`);
        console.log('');
        console.log('🔧 FIX:');
        console.log('   1. Your cluster name is WRONG');
        console.log('   2. Go to MongoDB Atlas → Clusters');
        console.log('   3. Look at your cluster name - it should be "cluster0.em48nlr.mongodb.net"');
        console.log('   4. Copy the EXACT name from Atlas');
        console.log('   5. Update your .env file');
    }
}

verifyCluster();