// test-env.js
require('dotenv').config();

console.log('🔍 TESTING .env FILE');
console.log('===================');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Found!' : '❌ NOT FOUND!');
console.log('PORT:', process.env.PORT || '❌ NOT FOUND!');
console.log('\nIf MONGODB_URI is NOT FOUND, check:');
console.log('1. .env file exists in this folder');
console.log('2. .env has the correct variable name: MONGODB_URI');
console.log('3. No spaces around = sign');