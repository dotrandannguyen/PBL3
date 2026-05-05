import IORedis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const buildRedisUrl = () => {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;
  const host = process.env.REDIS_HOST || "localhost";
  const port = process.env.REDIS_PORT || "6379";
  const password = process.env.REDIS_PASSWORD;
  const auth = password ? `:${encodeURIComponent(password)}@` : "";
  return `redis://${auth}${host}:${port}`;
};

const redisUrl = buildRedisUrl();
console.log(`[Redis] Connecting to ${redisUrl.replace(/:[^:@]+@/, ":***@")}`);

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

connection.on("error", (err) => {
  console.error(" Redis error:", err);
});

connection.on("connect", () => {
  console.log(" Redis connected");
});

export default connection;