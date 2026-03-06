import IORedis from "ioredis";

function getRedisConnection(): IORedis {
  // Prefer UPSTASH_REDIS_URL from Upstash Console > Redis > Connect > Node
  const url = process.env.UPSTASH_REDIS_URL;
  if (url) {
    return new IORedis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  // Fallback: build from REST URL (get Redis URL from Upstash Console if this fails)
  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (restUrl && token) {
    const host = restUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return new IORedis({
      host,
      port: 6379,
      password: token,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: { rejectUnauthorized: true },
    });
  }
  throw new Error(
    "Set UPSTASH_REDIS_URL (from Upstash Console > Connect > Node) or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN"
  );
}

let connection: IORedis | null = null;

export function getRedis(): IORedis {
  if (!connection) {
    connection = getRedisConnection();
  }
  return connection;
}
