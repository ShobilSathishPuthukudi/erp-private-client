const BASE_URL = 'http://localhost:3000/api';

async function verify() {
  console.log('--- ERP Institutional Flow FINAL Verification ---');
  
  const adminToken = await login('admin@erp.com', 'password123');
  const financeToken = await login('finance@erp.com', 'password123');
  const hrToken = await login('hr@erp.com', 'password123');
  
  if (!adminToken || !financeToken || !hrToken) {
    console.error('Auth Failure: Check user seeding.');
    process.exit(1);
  }

  // 2. HR FLOW
  await testEndpoint('POST', `${BASE_URL}/hr/attendance/clock-in`, hrToken, { status: 'present', remarks: 'Verification Test' });
  await testEndpoint('POST', `${BASE_URL}/hr/referrals/submit`, hrToken, { name: 'TEST-Flow', phone: '0000000000' });

  // 3. ACADEMIC FLOW
  await testEndpoint('POST', `${BASE_URL}/academic/students/1/lms-sync`, adminToken);
  await testEndpoint('POST', `${BASE_URL}/academic/students/1/rereg-request`, adminToken, { remarks: 'Cycle Test' });

  // 4. FINANCE FLOW
  await testEndpoint('PUT', `${BASE_URL}/finance/students/1/adjust-fee`, financeToken, { adjustmentAmount: 100, type: 'discount', remarks: 'Forensic Audit Verification' });
  await testEndpoint('POST', `${BASE_URL}/finance/incentives/calculate`, financeToken, { period: '2026-04', bdeId: 'SAL-ADM-001' });
  await testEndpoint('POST', `${BASE_URL}/finance/payments/1/distribute`, financeToken);

  console.log('\n--- Final Verification Complete ---');
}

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.token;
}

async function testEndpoint(method, url, token, body = null) {
  const shortUrl = url.split('/').slice(-2).join('/');
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : null
    });
    const data = await res.json();
    if (res.ok) {
      console.log(`✅ [${method}] ${shortUrl} -> SUCCESS`);
    } else {
      console.log(`❌ [${method}] ${shortUrl} -> ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    console.log(`🔥 [${method}] ${shortUrl} -> CRASH: ${error.message}`);
  }
}

verify();
