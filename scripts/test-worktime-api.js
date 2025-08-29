const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const API_URL = 'https://worktime-dux3.onrender.com/api';

async function testWorktimeAPI() {
    try {
        // Get the token from environment variable or local storage
        const token = process.env.WORKTIME_TOKEN;

        if (!token) {
            console.error('❌ No WORKTIME_TOKEN found in environment variables');
            console.log('Please set WORKTIME_TOKEN in your .env.local file');
            return;
        }

        console.log('🔄 Testing connection to Worktime API...');

        // Test 1: Verify authentication token
        console.log('\n🔑 Testing authentication...');
        const authResponse = await fetch(`${API_URL}/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!authResponse.ok) {
            throw new Error(`Auth verification failed with status ${authResponse.status}`);
        }

        const authData = await authResponse.json();
        console.log('✅ Authentication successful');
        console.log(`👤 Logged in as: ${authData.user.name || authData.user.username}`);

        // Test 2: Get transactions
        console.log('\n💰 Testing transaction API...');
        const transactionResponse = await fetch(`${API_URL}/transactions`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!transactionResponse.ok) {
            throw new Error(`Transaction API failed with status ${transactionResponse.status}`);
        }

        const transactionData = await transactionResponse.json();
        console.log(`✅ Transaction API successful. Found ${transactionData.transactions?.length || 0} transactions.`);

        if (transactionData.transactions?.length > 0) {
            console.log('\n📝 Sample transaction:');
            console.log(JSON.stringify(transactionData.transactions[0], null, 2));
        }

        // Test 3: Get attendance
        console.log('\n⏰ Testing attendance API...');
        const userId = authData.user.id;

        if (userId) {
            const attendanceResponse = await fetch(`${API_URL}/attendance/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!attendanceResponse.ok) {
                throw new Error(`Attendance API failed with status ${attendanceResponse.status}`);
            }

            const attendanceData = await attendanceResponse.json();
            console.log(`✅ Attendance API successful. Found ${attendanceData.attendance?.length || 0} attendance records.`);
        } else {
            console.log('⚠️ Could not test attendance API - no user ID found');
        }

        console.log('\n✅ All tests completed successfully!');

    } catch (error) {
        console.error(`\n❌ Error: ${error.message}`);
    }
}

testWorktimeAPI();
