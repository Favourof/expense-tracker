const http = require("http");
const https = require("https");
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

const run = async () => {
  if (!env.TEST_USER_EMAIL || !env.TEST_USER_PASSWORD) {
    console.log("Missing TEST_USER_EMAIL or TEST_USER_PASSWORD in env.");
    process.exit(1);
  }

  console.log("Logging in...");
  const login = await requestJson("POST", "/api/v1/loginuser", {
    email: env.TEST_USER_EMAIL,
    password: env.TEST_USER_PASSWORD,
  });
  console.log("Login:", login.status, login.data.message);

  const { accessToken } = login.data;
  if (!accessToken) {
    throw new Error("Missing access token from login response.");
  }

  const refreshCookie = extractCookie(login);
  if (!refreshCookie) {
    throw new Error("Missing refresh token cookie from login response.");
  }

  console.log("Refreshing token...");
  const refresh = await requestJson("POST", "/api/v1/refresh", null, {}, refreshCookie);
  console.log("Refresh:", refresh.status);

  const rotatedCookie = extractCookie(refresh) || refreshCookie;

  console.log("Logging out...");
  const logout = await requestJson(
    "POST",
    "/api/v1/logout",
    null,
    { Authorization: `Bearer ${accessToken}` }
    , rotatedCookie
  );
  console.log("Logout:", logout.status, logout.data.message);
};

run().catch((err) => {
  console.error("Auth smoke test failed:", err.message);
  process.exit(1);
});
