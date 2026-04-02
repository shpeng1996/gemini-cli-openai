import { serve } from "@hono/node-server";
import { Hono } from "hono";
import * as dotenv from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";
import app from "./index";
import { LocalKV } from "./utils/local-kv";
import { Env } from "./types";

// Load environment variables from .env or .dev.vars
const dotEnvPath = path.resolve(process.cwd(), ".env");
const devVarsPath = path.resolve(process.cwd(), ".dev.vars");

if (fs.existsSync(dotEnvPath)) {
	dotenv.config({ path: dotEnvPath });
} else if (fs.existsSync(devVarsPath)) {
	dotenv.config({ path: devVarsPath });
}

// Prepare the environment object
const env: Partial<Env> = {
	GCP_SERVICE_ACCOUNT: process.env.GCP_SERVICE_ACCOUNT,
	GEMINI_PROJECT_ID: process.env.GEMINI_PROJECT_ID,
	OPENAI_API_KEY: process.env.OPENAI_API_KEY,
	ENABLE_FAKE_THINKING: process.env.ENABLE_FAKE_THINKING,
	ENABLE_REAL_THINKING: process.env.ENABLE_REAL_THINKING,
	STREAM_THINKING_AS_CONTENT: process.env.STREAM_THINKING_AS_CONTENT,
	ENABLE_AUTO_MODEL_SWITCHING: process.env.ENABLE_AUTO_MODEL_SWITCHING,
	GEMINI_CLI_KV: new LocalKV(".kv_cache.json") as any,
	ENABLE_GEMINI_NATIVE_TOOLS: process.env.ENABLE_GEMINI_NATIVE_TOOLS,
	ENABLE_GOOGLE_SEARCH: process.env.ENABLE_GOOGLE_SEARCH,
	ENABLE_URL_CONTEXT: process.env.ENABLE_URL_CONTEXT,
	GEMINI_TOOLS_PRIORITY: process.env.GEMINI_TOOLS_PRIORITY,
	DEFAULT_TO_NATIVE_TOOLS: process.env.DEFAULT_TO_NATIVE_TOOLS,
	ALLOW_REQUEST_TOOL_CONTROL: process.env.ALLOW_REQUEST_TOOL_CONTROL,
	ENABLE_INLINE_CITATIONS: process.env.ENABLE_INLINE_CITATIONS,
	INCLUDE_GROUNDING_METADATA: process.env.INCLUDE_GROUNDING_METADATA,
	INCLUDE_SEARCH_ENTRY_POINT: process.env.INCLUDE_SEARCH_ENTRY_POINT,
};

// Create a wrapper Hono app to inject the environment
const standaloneApp = new Hono();

// Middleware to inject the environment into c.env
standaloneApp.use("*", async (c, next) => {
	// Object.assign(c.env, env); // This might not work if c.env is read-only
	// In Hono + node-server, c.env is usually what's passed to serve or middleware
	// We can set it manually for the underlying app
	(c as any).env = { ...(c.env || {}), ...env };
	await next();
});

standaloneApp.route("/", app);

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

console.log(`
🚀 Gemini CLI OpenAI Proxy (Standalone Mode)
--------------------------------------------
Port: ${port}
Local Server: http://localhost:${port}
OpenAI Base URL: http://localhost:${port}/v1

Environment:
- GCP_SERVICE_ACCOUNT: ${env.GCP_SERVICE_ACCOUNT ? "✅ Set" : "❌ Not Set"}
- OPENAI_API_KEY: ${env.OPENAI_API_KEY ? "✅ Set" : "❌ Public (No Key Required)"}
- Real Thinking: ${env.ENABLE_REAL_THINKING === "true" ? "✅ Enabled" : "❌ Disabled"}
- Auto Switching: ${env.ENABLE_AUTO_MODEL_SWITCHING === "true" ? "✅ Enabled" : "❌ Disabled"}

Local KV Cache: .kv_cache.json

💡 Tip: This proxy is drop-in compatible with OpenAI and Ollama clients.
   Set your Base URL to http://localhost:${port}/v1
--------------------------------------------
`);

serve({
	fetch: standaloneApp.fetch,
	port,
});
