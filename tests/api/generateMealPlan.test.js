const { test, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { DAYS } = require("../../lib/mealPlanCore");

// Exercise the HTTP handler without contacting Firebase or an AI provider.
const adminPath = require.resolve("firebase-admin");
const previousAdmin = require.cache[adminPath];
const firestore = {
  collection: () => ({ doc: () => ({ get: async () => ({ exists: false }) }) }),
  runTransaction: async (callback) => callback({
    get: async () => ({ exists: false }),
    set: () => {}
  })
};
const fakeFirestore = () => firestore;
fakeFirestore.FieldValue = { serverTimestamp: () => "test-time" };
require.cache[adminPath] = { exports: {
  apps: [{}],
  auth: () => ({ verifyIdToken: async () => ({ uid: "test-user" }) }),
  firestore: fakeFirestore
} };
const handler = require("../../api/generateMealPlan");
if (previousAdmin) require.cache[adminPath] = previousAdmin;
else delete require.cache[adminPath];

const originalFetch = global.fetch;
const originalKey = process.env.OPENROUTER_API_KEY;
afterEach(() => {
  global.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = originalKey;
});

function candidate() {
  return { days: DAYS.map((day) => ({ day, meals: ["breakfast", "lunch", "dinner"].map((type) => ({
    type, name: "Oats", ingredients: [{ name: "Oats", quantity: 60, unit: "g" }],
    calories: 400, protein: 20, carbs: 55, fats: 10, prepMinutes: 8
  })) })) };
}

async function request(overrides = {}) {
  process.env.OPENROUTER_API_KEY = "test-placeholder";
  const res = {
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    end(body) { this.body = body ? JSON.parse(body) : null; }
  };
  await handler({ method: "POST", headers: { authorization: "Bearer test-token" }, body: { profile: {} }, ...overrides }, res);
  return res;
}

test("handler returns a normalized full week and bounds the provider request", async () => {
  global.fetch = async (_url, options) => {
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.signal.aborted, false);
    assert.equal(JSON.parse(options.body).response_format.type, "json_schema");
    return { ok: true, json: async () => ({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(candidate()) } }] }) };
  };
  const res = await request();
  assert.equal(res.statusCode, 200);
  assert.deepEqual(Object.keys(res.body.mealPlan), DAYS);
  assert.equal(res.body.mealPlan.Monday.totalNutrition.calories, 1200);
});

test("handler rejects truncated output even if its JSON is valid", async () => {
  global.fetch = async () => ({ ok: true, json: async () => ({ choices: [{ finish_reason: "length", message: { content: JSON.stringify(candidate()) } }] }) });
  const res = await request();
  assert.equal(res.statusCode, 502);
  assert.match(res.body.message, /incomplete/);
  assert.equal(res.body.mealPlan, undefined);
});

test("handler reports timeouts during the request and response body", async () => {
  for (const bodyTimeout of [false, true]) {
    const timeout = () => { throw new DOMException("Timed out", "TimeoutError"); };
    global.fetch = bodyTimeout ? async () => ({ ok: true, json: timeout }) : timeout;
    const res = await request();
    assert.equal(res.statusCode, 504);
    assert.match(res.body.message, /too long/);
  }
});

test("handler rejects unauthenticated requests and disallowed origins without provider calls", async () => {
  global.fetch = () => { throw new Error("Provider must not be called"); };
  assert.equal((await request({ headers: {} })).statusCode, 401);
  assert.equal((await request({ headers: { origin: "https://untrusted.example" } })).statusCode, 403);
});
