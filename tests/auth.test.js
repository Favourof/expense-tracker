const http = require("http");
const https = require("https");
const assert = require("assert");
const test = require("node:test");
const env = require("../config/env");

const baseUrl = env.BASE_URL || `http://localhost:${env.port || 4000}`;

const extractCookie = (res) => {
  const setCookie = res.headers["set-cookie"];
  if (!setCookie || !setCookie.length) return null;
  return setCookie[0].split(";")[0];
};

const requestJson = (method, path, body, headers = {}, cookie) =>
  new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const client = url.protocol === "https:" ? https : http;

    const req = client.request(
      {
        method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers: {
          "Content-Type": "application/json",
          ...(cookie ? { Cookie: cookie } : {}),
          ...headers,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        });
      }
    );

    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });

test("auth flow: login -> refresh -> logout", async (t) => {
  if (!env.TEST_USER_EMAIL || !env.TEST_USER_PASSWORD) {
    t.skip("Missing TEST_USER_EMAIL or TEST_USER_PASSWORD");
  }

  const login = await requestJson("POST", "/api/v1/loginuser", {
    email: env.TEST_USER_EMAIL,
    password: env.TEST_USER_PASSWORD,
  });

  assert.equal(login.status, 200);
  assert.ok(login.data.accessToken);
  const refreshCookie = extractCookie(login);
  assert.ok(refreshCookie);

  const refresh = await requestJson("POST", "/api/v1/refresh", null, {}, refreshCookie);
  assert.equal(refresh.status, 200);
  assert.ok(refresh.data.accessToken);
  const rotatedCookie = extractCookie(refresh);
  assert.ok(rotatedCookie);

  const logout = await requestJson(
    "POST",
    "/api/v1/logout",
    null,
    { Authorization: `Bearer ${refresh.data.accessToken}` },
    rotatedCookie
  );
  assert.equal(logout.status, 200);
});
