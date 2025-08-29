// This script tests the transaction API connection to worktime-dux3.onrender.com

async function testTransactionAPI() {
    console.log('Testing transaction API connection...');

    // Replace with your actual token or get from localStorage
    const token = process.env.TEST_TOKEN;

    if (!token) {
        console.error('No token provided. Set TEST_TOKEN environment variable');
        process.exit(1);
    }

    try {
        const response = await fetch('https://worktime-dux3.onrender.com/api/transactions', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Connection successful!');
            console.log(`Retrieved ${data.transactions?.length || 0} transactions`);

            if (data.transactions && data.transactions.length > 0) {
                console.log('Sample transaction:');
                console.log(JSON.stringify(data.transactions[0], null, 2));
            } else {
                console.log('No transactions found');
            }
        } else {
            console.error('API request failed with status:', response.status);
            try {
                const errorData = await response.json();
                console.error('Error details:', errorData);
            } catch (e) {
                console.error('Could not parse error response');
            }
        }
    } catch (error) {
        console.error('Connection failed:', error.message);
    }
}

testTransactionAPI().catch(console.error);
