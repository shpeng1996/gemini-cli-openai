import * as fs from "node:fs";
import * as path from "node:path";

/**
 * A simple file-based implementation of Cloudflare KVNamespace for local development.
 */
export class LocalKV {
	private cachePath: string;
	private data: Record<string, any> = {};

	constructor(cachePath: string = ".kv_cache.json") {
		this.cachePath = path.resolve(process.cwd(), cachePath);
		this.load();
	}

	private load() {
		try {
			if (fs.existsSync(this.cachePath)) {
				const content = fs.readFileSync(this.cachePath, "utf-8");
				this.data = JSON.parse(content);
			}
		} catch (e) {
			console.error("Failed to load local KV cache:", e);
			this.data = {};
		}
	}

	private save() {
		try {
			fs.writeFileSync(this.cachePath, JSON.stringify(this.data, null, 2), "utf-8");
		} catch (e) {
			console.error("Failed to save local KV cache:", e);
		}
	}

	async get(key: string, type: "text" | "json" | "arrayBuffer" | "stream" = "text"): Promise<any> {
		const item = this.data[key];
		if (!item) return null;

		// Check expiration if implemented (simple version doesn't handle TTL yet)
		
		if (type === "json") {
			return typeof item === "string" ? JSON.parse(item) : item;
		}
		return item;
	}

	async put(key: string, value: string | ArrayBuffer | ArrayBufferView | ReadableStream, options?: { expiration?: number; expirationTtl?: number }): Promise<void> {
		if (value instanceof ReadableStream) {
			throw new Error("LocalKV does not support ReadableStream yet");
		}
		
		this.data[key] = value;
		this.save();
	}

	async delete(key: string): Promise<void> {
		delete this.data[key];
		this.save();
	}

	async list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ keys: { name: string }[]; list_complete: boolean; cursor?: string }> {
		let keys = Object.keys(this.data).map(name => ({ name }));
		if (options?.prefix) {
			keys = keys.filter(k => k.name.startsWith(options.prefix!));
		}
		return {
			keys,
			list_complete: true
		};
	}
}
