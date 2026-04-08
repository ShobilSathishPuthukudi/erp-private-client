import axios from 'axios';

const testRegistration = async () => {
    try {
        const payload = {
            name: "Test Audit Center",
            email: "audit-test-center@example.com",
            phone: "+91-99999-88888",
            password: "SecurePassword123",
            confirmPassword: "SecurePassword123",
            code: "CEO-001", // Valid BDE Code
            description: "Diagnostic test for credential provisioning.",
            interest: {
                universityId: 44, // Assumed valid ID from previous sessions
                programId: 1
            }
        };

        console.log('[TEST] Submitting registration payload...');
        const res = await axios.post('http://localhost:3000/api/public/register-center', payload);
        console.log('[SUCCESS] Registration result:', res.data);
        
        console.log('[TEST] Verifying database entries...');
        // I will use run_command next to verify via MySQL
    } catch (error) {
        console.error('[ERROR] Registration failed:', error.response?.data || error.message);
    }
};

testRegistration();
