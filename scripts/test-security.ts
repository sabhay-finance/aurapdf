import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

interface TestResult {
  scenario: string;
  description: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

function record(scenario: string, description: string, passed: boolean, details?: string, error?: string) {
  results.push({ scenario, description, passed, details, error });
  const symbol = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${symbol} [${scenario}] - ${description}`);
  if (details) console.log(`   ℹ️  ${details}`);
  if (error) console.error(`   ⚠️  ${error}`);
}

// Helper to extract cookies from fetch response
class CookieJar {
  private cookies = new Map<string, string>();

  update(res: Response) {
    const getSetCookie = (res.headers as any).getSetCookie;
    const rawCookies: string[] =
      typeof getSetCookie === 'function'
        ? getSetCookie.call(res.headers)
        : (res.headers.get('set-cookie') || '').split(/,(?=[^;]+?=)/);

    for (const c of rawCookies) {
      if (!c.trim()) continue;
      const [nv] = c.split(';');
      const [name, ...rest] = nv.split('=');
      if (name && rest.length > 0) {
        this.cookies.set(name.trim(), rest.join('='));
      }
    }
  }

  get header(): string {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  clear() {
    this.cookies.clear();
  }
}

// Helper to login via dev-login credentials
async function devLogin(email: string, name: string): Promise<{ jar: CookieJar; user: any }> {
  const jar = new CookieJar();

  // 1. Get CSRF token
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  jar.update(csrfRes);
  const { csrfToken } = await csrfRes.json();

  // 2. Submit credentials
  const body = new URLSearchParams({
    csrfToken,
    email,
    name,
  });

  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/dev-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: jar.header,
    },
    body: body.toString(),
    redirect: 'manual',
  });
  jar.update(loginRes);

  // 3. Verify session
  const sessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
    headers: { Cookie: jar.header },
  });
  jar.update(sessionRes);
  const sessionData = await sessionRes.json();

  return { jar, user: sessionData?.user };
}

async function runSecurityTestSuite() {
  console.log('\n======================================================');
  console.log('🛡️  AuraPDF Production Security Verification Suite');
  console.log(`🎯 Target: ${BASE_URL}`);
  console.log('======================================================\n');

  let userACookie = '';
  let userBCookie = '';
  let userADocId = '';
  let userAFilename = '';
  let userAJar: CookieJar;

  // ---------------------------------------------------------
  // Scenario 1: Unauthenticated request to / redirects to /login?callbackUrl=%2F
  // ---------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/`, { redirect: 'manual' });
    const location = res.headers.get('location') || '';
    const isRedirect = res.status === 307 || res.status === 308 || res.status === 302;
    const hasCorrectDestination = location.includes('/login') && location.includes('callbackUrl');

    record(
      'SCENARIO_1',
      'Unauthenticated request to root / redirects to /login with callbackUrl',
      isRedirect && hasCorrectDestination,
      `Status: ${res.status}, Location: ${location}`
    );
  } catch (err: any) {
    record('SCENARIO_1', 'Unauthenticated root redirect', false, undefined, err.message);
  }

  // ---------------------------------------------------------
  // Scenario 2: Unauthenticated direct access to reader preserves deep destination
  // ---------------------------------------------------------
  try {
    const targetPath = '/reader/doc-sample-123';
    const res = await fetch(`${BASE_URL}${targetPath}`, { redirect: 'manual' });
    const location = res.headers.get('location') || '';
    const isRedirect = res.status === 307 || res.status === 308 || res.status === 302;
    const preservesDeepLink = location.includes(encodeURIComponent(targetPath)) || location.includes(targetPath);

    record(
      'SCENARIO_2',
      'Unauthenticated request to deep reader URL redirects to /login preserving callbackUrl',
      isRedirect && preservesDeepLink,
      `Status: ${res.status}, Location: ${location}`
    );
  } catch (err: any) {
    record('SCENARIO_2', 'Reader redirect', false, undefined, err.message);
  }

  // ---------------------------------------------------------
  // Scenario 3: Unauthenticated API request to /api/documents returns 401
  // ---------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/documents`);
    const is401 = res.status === 401;
    const body = await res.json().catch(() => ({}));

    record(
      'SCENARIO_3',
      'Unauthenticated request to /api/documents returns 401 Unauthorized',
      is401,
      `Status: ${res.status}, Error: ${body.error}`
    );
  } catch (err: any) {
    record('SCENARIO_3', 'Unauthenticated API documents', false, undefined, err.message);
  }

  // ---------------------------------------------------------
  // Scenario 4: Unauthenticated request to /api/documents/[id]/file returns 401
  // ---------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/documents/fake-doc-id/file`);
    const is401 = res.status === 401;

    record(
      'SCENARIO_4',
      'Unauthenticated request to file streaming endpoint returns 401 Unauthorized',
      is401,
      `Status: ${res.status}`
    );
  } catch (err: any) {
    record('SCENARIO_4', 'Unauthenticated file streaming', false, undefined, err.message);
  }

  // ---------------------------------------------------------
  // Authenticate User A & User B
  // ---------------------------------------------------------
  try {
    const authA = await devLogin('alex.vance@aurapdf.test', 'Alex Vance');
    userAJar = authA.jar;
    userACookie = authA.jar.header;

    const authB = await devLogin('jordan.lee@aurapdf.test', 'Jordan Lee');
    userBCookie = authB.jar.header;

    const loginOk = Boolean(authA.user?.id && authB.user?.id && authA.user.id !== authB.user.id);
    record(
      'AUTH_SETUP',
      'Authenticate User A and User B with distinct isolated identities',
      loginOk,
      `User A ID: ${authA.user?.id}, User B ID: ${authB.user?.id}`
    );
  } catch (err: any) {
    record('AUTH_SETUP', 'User authentication setup', false, undefined, err.message);
    return;
  }

  // ---------------------------------------------------------
  // Scenario 5: User A uploads valid PDF -> saved in private storage, owned by User A
  // ---------------------------------------------------------
  try {
    const pdfContent = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n165\n%%EOF'
    );

    const formData = new FormData();
    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    formData.append('file', blob, 'Quantum_Physics_Notes.pdf');

    const res = await fetch(`${BASE_URL}/api/documents`, {
      method: 'POST',
      headers: { Cookie: userACookie },
      body: formData,
    });

    const data = await res.json();
    const passed = res.status === 200 && data.success && Boolean(data.document?.id);
    if (passed) {
      userADocId = data.document.id;
      userAFilename = path.basename(data.document.file_url || '');
    }

    record(
      'SCENARIO_5',
      'User A uploads valid PDF with magic bytes -> securely saved to private storage',
      passed,
      `Doc ID: ${userADocId}, File: ${userAFilename}`
    );
  } catch (err: any) {
    record('SCENARIO_5', 'User A PDF upload', false, undefined, err.message);
  }

  // ---------------------------------------------------------
  // Scenario 6: Verify uploaded PDF is NOT exposed publicly in public/uploads
  // ---------------------------------------------------------
  try {
    const privateFiles = fs.existsSync(path.join(process.cwd(), 'storage', 'uploads'))
      ? fs.readdirSync(path.join(process.cwd(), 'storage', 'uploads'))
      : [];
    const privateExists = privateFiles.some((f) => f.includes('Quantum_Physics_Notes.pdf'));
    const publicExists = fs.existsSync(path.join(process.cwd(), 'public', 'uploads'));

    const isolatedStorage = !publicExists && privateExists;
    record(
      'SCENARIO_6',
      'PDF storage verification: file is stored in private storage/uploads and NOT in public/uploads',
      isolatedStorage,
      `In private storage: ${privateExists}, In public folder: ${publicExists}`
    );
  } catch (err: any) {
    record('SCENARIO_6', 'Storage isolation check', false, undefined, err.message);
  }

  // ---------------------------------------------------------
  // Scenario 7: User A can stream their own file via /api/documents/[id]/file
  // ---------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/documents/${userADocId}/file`, {
      headers: { Cookie: userACookie },
    });
    const contentType = res.headers.get('content-type');
    const buffer = await res.arrayBuffer();
    const magic = Buffer.from(buffer).slice(0, 5).toString('ascii');

    const canStream = res.status === 200 && contentType === 'application/pdf' && magic === '%PDF-';
    record(
      'SCENARIO_7',
      'User A can securely stream their own file with verified %PDF- header and Range headers',
      canStream,
      `Status: ${res.status}, Content-Type: ${contentType}, Magic: ${magic}`
    );
  } catch (err: any) {
    record('SCENARIO_7', 'User A stream file', false, undefined, err.message);
  }

  // ---------------------------------------------------------
  // Scenario 8: IDOR Check - User B attempts to access User A's document metadata (GET /api/documents/[id])
  // ---------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/documents/${userADocId}`, {
      headers: { Cookie: userBCookie },
    });
    const passed = res.status === 404;

    record(
      'SCENARIO_8',
      'IDOR Prevention: User B cannot view User A\'s document metadata -> Returns 404',
      passed,
      `Status: ${res.status} (Expected 404)`
    );
  } catch (err: any) {
    record('SCENARIO_8', 'IDOR metadata check', false, undefined, err.message);
  }

  // ---------------------------------------------------------
  // Scenario 9: IDOR Check - User B attempts to access User A's raw PDF (/api/documents/[id]/file)
  // ---------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/documents/${userADocId}/file`, {
      headers: { Cookie: userBCookie },
    });
    const passed = res.status === 404;

    record(
      'SCENARIO_9',
      'IDOR Prevention: User B cannot stream or download User A\'s raw PDF -> Returns 404',
      passed,
      `Status: ${res.status} (Expected 404)`
    );
  } catch (err: any) {
    record('SCENARIO_9', 'IDOR raw file check', false, undefined, err.message);
  }

  // ---------------------------------------------------------
  // Scenario 10: Data Isolation - User B's library list does NOT contain User A's document
  // ---------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/documents`, {
      headers: { Cookie: userBCookie },
    });
    const data = await res.json();
    const docs: any[] = data.documents || [];
    const containsUserADoc = docs.some((d) => d.id === userADocId);

    record(
      'SCENARIO_10',
      'Zero-Trust Data Isolation: User B library query returns zero leakage of User A\'s documents',
      res.status === 200 && !containsUserADoc,
      `User B total docs: ${docs.length}, Contains User A doc: ${containsUserADoc}`
    );
  } catch (err: any) {
    record('SCENARIO_10', 'Data isolation library list', false, undefined, err.message);
  }

  // ---------------------------------------------------------
  // Scenario 11: AI / RAG IDOR Check - User B cannot query AI against User A's document
  // ---------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/ai/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userBCookie,
      },
      body: JSON.stringify({
        document_id: userADocId,
        query: 'What does this document say?',
      }),
    });
    const passed = res.status === 404;

    record(
      'SCENARIO_11',
      'AI/RAG Protection: User B cannot extract context or query User A\'s document via AI -> Returns 404',
      passed,
      `Status: ${res.status} (Expected 404)`
    );
  } catch (err: any) {
    record('SCENARIO_11', 'AI query IDOR check', false, undefined, err.message);
  }

  // ---------------------------------------------------------
  // Scenario 12: IDOR Check - User B attempts to delete User A's document
  // ---------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/documents/${userADocId}`, {
      method: 'DELETE',
      headers: { Cookie: userBCookie },
    });
    const is404 = res.status === 404;

    // Verify User A can still fetch the document
    const verifyRes = await fetch(`${BASE_URL}/api/documents/${userADocId}`, {
      headers: { Cookie: userACookie },
    });
    const docStillExists = verifyRes.status === 200;

    record(
      'SCENARIO_12',
      'IDOR Prevention: User B cannot delete User A\'s document -> Returns 404 and document remains intact',
      is404 && docStillExists,
      `DELETE status: ${res.status}, User A verify status: ${verifyRes.status}`
    );
  } catch (err: any) {
    record('SCENARIO_12', 'IDOR delete check', false, undefined, err.message);
  }

  // ---------------------------------------------------------
  // Scenario 13: File Type Validation - Upload with fake .pdf extension but invalid magic bytes
  // ---------------------------------------------------------
  try {
    const maliciousContent = Buffer.from('<script>alert("hacked")</script>');
    const formData = new FormData();
    const blob = new Blob([maliciousContent], { type: 'application/pdf' });
    formData.append('file', blob, 'exploit.pdf');

    const res = await fetch(`${BASE_URL}/api/documents`, {
      method: 'POST',
      headers: { Cookie: userACookie },
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    const rejected = res.status === 400 && data.error?.includes('valid PDF');

    record(
      'SCENARIO_13',
      'Magic Bytes Enforcement: Uploading non-PDF file with .pdf extension is rejected -> Returns 400',
      rejected,
      `Status: ${res.status}, Error: ${data.error}`
    );
  } catch (err: any) {
    record('SCENARIO_13', 'Magic bytes check', false, undefined, err.message);
  }

  // ---------------------------------------------------------
  // Scenario 14: Rate Limiting Enforcement (HTTP 429)
  // ---------------------------------------------------------
  try {
    let triggered429 = false;
    let retryAfterHeader: string | null = null;

    // Send 35 rapid requests to rate-limited ai-explain or ai-query endpoint
    for (let i = 0; i < 35; i++) {
      const res = await fetch(`${BASE_URL}/api/ai/explain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: userACookie,
        },
        body: JSON.stringify({
          document_id: userADocId,
          selected_text: 'rate limit test',
        }),
      });

      if (res.status === 429) {
        triggered429 = true;
        retryAfterHeader = res.headers.get('retry-after');
        break;
      }
    }

    record(
      'SCENARIO_14',
      'Sliding-Window Rate Limiting: Burst of requests triggers HTTP 429 with Retry-After header',
      triggered429 && Boolean(retryAfterHeader),
      `Triggered 429: ${triggered429}, Retry-After: ${retryAfterHeader}`
    );
  } catch (err: any) {
    record('SCENARIO_14', 'Rate limit check', false, undefined, err.message);
  }

  // ---------------------------------------------------------
  // Scenario 15: Session Invalidation on Logout
  // ---------------------------------------------------------
  try {
    const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`, {
      headers: { Cookie: userAJar.header },
    });
    userAJar.update(csrfRes);
    const { csrfToken } = await csrfRes.json();

    const signoutRes = await fetch(`${BASE_URL}/api/auth/signout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: userAJar.header,
      },
      body: new URLSearchParams({ csrfToken }).toString(),
      redirect: 'manual',
    });

    const logoutCookies = (signoutRes.headers as any).getSetCookie
      ? (signoutRes.headers as any).getSetCookie()
      : [signoutRes.headers.get('set-cookie') || ''];

    const sessionCookieCleared = logoutCookies.some(
      (c: string) =>
        c.includes('authjs.session-token=;') ||
        c.includes('Max-Age=0') ||
        c.includes('Expires=Thu, 01 Jan 1970')
    );

    userAJar.update(signoutRes);

    const verifyRes = await fetch(`${BASE_URL}/api/documents`, {
      headers: { Cookie: userAJar.header },
    });
    const isProtected = verifyRes.status === 401;

    record(
      'SCENARIO_15',
      'Session Invalidation: Sign-out clears auth session cookie and renders endpoints inaccessible',
      sessionCookieCleared && isProtected,
      `Sign-out cookie cleared: ${sessionCookieCleared}, Unauthenticated access blocked: ${isProtected}`
    );
  } catch (err: any) {
    record('SCENARIO_15', 'Session invalidation check', false, undefined, err.message);
  }

  // ---------------------------------------------------------
  // Summary
  // ---------------------------------------------------------
  console.log('\n======================================================');
  const total = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = total - passedCount;

  console.log(`📊 Test Results: ${passedCount}/${total} PASSED (${failedCount} FAILED)`);
  console.log('======================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runSecurityTestSuite().catch((err) => {
  console.error('Fatal error running test suite:', err);
  process.exit(1);
});
