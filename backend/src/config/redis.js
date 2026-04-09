import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL);

connection.on("error", (err) => {
  console.error(" Redis error:", err);
});

connection.on("connect", () => {
  console.log(" Redis connected");
});

export default connection;