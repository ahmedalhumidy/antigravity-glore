// Shared CORS configuration for all edge functions
// Restricts access to known application domains only

const ALLOWED_ORIGINS = [
  "https://antigravity-glore.vercel.app",
  "http://localhost:5173",
];

export function getCorsHeaders(origin: string | null): Record<string, string> {
  // Check if the origin is in our allowed list
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) 
    ? origin 
    : ALLOWED_ORIGINS[0]; // Default to production URL

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

export function handleCorsPreflightRequest(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    const origin = req.headers.get("Origin");
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }
  return null;
}
