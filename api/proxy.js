export default async function handler(req, res) {
  // CORS başlıkları
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    const parsed = new URL(req.url, "http://localhost");
    let path = parsed.searchParams.get("__path");
    if (!path) {
      if (parsed.pathname.startsWith("/api-proxy")) {
        path = parsed.pathname.replace(/^\/api-proxy\/?/, "");
      } else {
        path = parsed.pathname.replace(/^\//, "");
      }
    }
    parsed.searchParams.delete("__path");
    const search = parsed.searchParams.toString();
    const targetUrl =
      "https://kovanbe.universeconn.online/" +
      (path || "").replace(/^\//, "") +
      (search ? "?" + search : "");

    const forwardHeaders = {
      host: "kovanbe.universeconn.online",
      origin: "https://kovan-site.vercel.app",
    };
    if (req.headers["content-type"]) forwardHeaders["content-type"] = req.headers["content-type"];
    if (req.headers["authorization"]) forwardHeaders["authorization"] = req.headers["authorization"];
    if (req.headers["accept"]) forwardHeaders["accept"] = req.headers["accept"];
    if (req.headers["x-xsrf-token"]) forwardHeaders["x-xsrf-token"] = req.headers["x-xsrf-token"];
    if (req.headers["cookie"]) forwardHeaders["cookie"] = req.headers["cookie"];

    let bodyData = undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      if (req.body !== undefined && req.body !== null) {
        bodyData = typeof req.body === "object" ? JSON.stringify(req.body) : req.body;
      } else {
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        }
        if (chunks.length > 0) bodyData = Buffer.concat(chunks);
      }
    }

    const backendRes = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: bodyData,
    });

    const status = backendRes.status;
    const text = await backendRes.text();

    res.status(status);
    const contentType = backendRes.headers.get("content-type");
    if (contentType) res.setHeader("content-type", contentType);
    const retryAfter = backendRes.headers.get("retry-after");
    if (retryAfter) res.setHeader("retry-after", retryAfter);

    const setCookies = typeof backendRes.headers.getSetCookie === "function"
      ? backendRes.headers.getSetCookie()
      : backendRes.headers.get("set-cookie");
    if (setCookies) {
      res.setHeader("set-cookie", setCookies);
    }

    res.send(text);
  } catch (err) {
    res.status(502).json({
      detail: "Sunucuya ulaşılamadı: " + err.message,
    });
  }
}
