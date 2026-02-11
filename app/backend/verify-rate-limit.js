
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
    const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';
    const llmEndpoint = `${API_BASE}/api/llm/rate-simple-field`;
    const healthEndpoint = `${API_BASE}/health`;

    console.log('Waiting for server to be ready...');
    let ready = false;
    // Retry connection for 15 seconds
    for (let i = 0; i < 15; i++) {
        try {
            await fetch(healthEndpoint);
            ready = true;
            break;
        } catch (e) {
            await wait(1000);
        }
    }

    if (!ready) {
        console.error('Server failed to start in time or is unreachable.');
        process.exit(1);
    }

    console.log('Server is ready. Starting verification...');

    // Test LLM Limiter (10 req / 1 min)
    console.log('Testing LLM Rate Limiter...');
    for (let i = 1; i <= 12; i++) {
        try {
            const res = await fetch(llmEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            const limit = res.headers.get('RateLimit-Limit');
            const remaining = res.headers.get('RateLimit-Remaining');
            console.log(`LLM Request ${i}: Status ${res.status} | Limit: ${limit} | Remaining: ${remaining}`);

            if (i <= 10 && res.status === 429) {
                console.error('FAILED: Premature rate limit on LLM endpoint');
            }
            if (i > 10 && res.status !== 429) {
                console.error('FAILED: Rate limit NOT triggered on LLM endpoint');
            }
        } catch (e) {
            console.error(`LLM Request ${i} failed:`, e.message);
        }
    }

    console.log('Testing Global Rate Limiter...');
    // We already sent 12 requests.
    // We need to send 88 more to hit 100 on global.
    // Let's send 105 total to be safe and see the limit hit.

    for (let i = 1; i <= 105; i++) {
        try {
            const res = await fetch(healthEndpoint);
            // Log every 20th and around limit
            if (i % 20 === 0 || i > 90) {
                console.log(`Global Request ${i}: Status ${res.status}`);
            }

            // We expect 429 around i > 88 (since 12 already sent)
            if (i > 95 && res.status === 429) {
                console.log("Global limit triggered successfully.");
            }
        } catch (e) {
            console.error(`Global Request ${i} failed:`, e.message);
        }
    }
}

run();
