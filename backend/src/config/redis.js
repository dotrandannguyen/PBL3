import IORedis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

connection.on("error", (err) => {
  console.error(" Redis error:", err);
});

connection.on("connect", () => {
  console.log(" Redis connected");
});

export default connection;