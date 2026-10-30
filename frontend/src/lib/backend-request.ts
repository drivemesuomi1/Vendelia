import "server-only";

type Method = "GET" | "HEAD" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";
interface BackendRequest {
  method?: Method;
  headers?: HeadersInit;
  body?: ArrayBuffer;
}

type App = Awaited<ReturnType<typeof import("@vendelia/backend/app").buildApp>>;
let localApp: Promise<App> | undefined;

async function getLocalApp(): Promise<App> {
  // Lazy initialization lets Next build without opening database connections.
  // Each warm server instance reuses its Fastify app and PostgreSQL pool.
  const pending = localApp ??= (async () => {
    const [{ buildApp }, { sql }] = await Promise.all([
      import("@vendelia/backend/app"), import("@vendelia/backend/db"),
    ]);
    const app = buildApp(sql);
    await app.ready();
    return app;
  })();
  try {
    return await pending;
  } catch (error) {
    if (localApp === pending) localApp = undefined;
    throw error;
  }
}

/** Shared transport for server components and the same-origin /api handler. */
export async function backendRequest(path: string, options: BackendRequest = {}): Promise<Response> {
  if (!path.startsWith("/api/")) throw new Error("Invalid API path");
  const headers = new Headers(options.headers);
  for (const name of ["host", "connection", "content-length", "transfer-encoding", "accept-encoding", "upgrade", "keep-alive", "te", "trailer"]) {
    headers.delete(name);
  }

  const backend = process.env.BACKEND_URL?.trim().replace(/\/+$/, "");
  if (backend) {
    return fetch(`${backend}${path}`, {
      method: options.method ?? "GET", headers, body: options.body,
      cache: "no-store", signal: AbortSignal.timeout(15000),
    });
  }

  const app = await getLocalApp();
  const response = await app.inject({
    method: options.method ?? "GET", url: path,
    headers: Object.fromEntries(headers),
    payload: options.body ? Buffer.from(options.body) : undefined,
  });
  const responseHeaders = new Headers();
  for (const [key, value] of Object.entries(response.headers)) {
    if (value === undefined) continue;
    for (const entry of Array.isArray(value) ? value : [value]) responseHeaders.append(key, String(entry));
  }
  const noBody = options.method === "HEAD" || [204, 205, 304].includes(response.statusCode);
  return new Response(noBody ? null : Uint8Array.from(response.rawPayload).buffer, {
    status: response.statusCode, headers: responseHeaders,
  });
}

/** Adapts a Web request to the same backend that powers server-rendered pages. */
export async function handleApiRequest(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const external = process.env.BACKEND_URL?.trim();
    if (external && new URL(external).origin === url.origin) {
      throw new Error("BACKEND_URL points to the frontend itself; remove it to use the in-process API");
    }
    const method = request.method as Method;
    const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();
    if (body && body.byteLength > 1024 * 1024) {
      return Response.json({ error: "invalid_request", message: "Request body is too large" }, { status: 413 });
    }
    const response = await backendRequest(url.pathname + url.search, {
      method, headers: request.headers, body: body?.byteLength ? body : undefined,
    });
    const headers = new Headers(response.headers);
    // fetch may decompress an external response; do not forward stale length/encoding.
    for (const name of ["content-length", "content-encoding", "connection", "transfer-encoding"]) headers.delete(name);
    headers.set("cache-control", "no-store");
    return new Response(response.body, { status: response.status, headers });
  } catch (error) {
    console.error("Catalogue API request failed", error);
    return Response.json(
      { error: "service_unavailable", message: "Catalogue API is unavailable" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
