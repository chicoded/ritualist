async function testLoginFlow() {
    const API_URL = 'http://localhost:5000/api/auth';
    const timestamp = Date.now();
    const username = `testuser_${timestamp}`;
    const email = `test_${timestamp}@example.com`;
    const password = 'password123';
    console.log(`Attempting to register user: ${username}`);
    try {
        // 1. Register
        const regRes = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const regData = await regRes.json();
        console.log('Registration status:', regRes.status);
        console.log('Registration response:', regData);
        if (!regRes.ok)
            throw new Error('Registration failed');
        // 2. Login
        console.log('Attempting to login...');
        const loginRes = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const loginData = await loginRes.json();
        console.log('Login status:', loginRes.status);
        console.log('Login response:', loginData);
    }
    catch (error) {
        console.error('Error:', error);
    }
}
testLoginFlow();
export {};
//# sourceMappingURL=testLoginFlow.js.map