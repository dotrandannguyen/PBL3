import { Queue } from "bullmq";
import connection from "../../config/redis.js";

export const notificationQueue = new Queue("notification-reminder", {
  connection,
});

export const addNotificationJob = async ({
  jobId,
  payload,
  delay,
}) => {
  await notificationQueue.add("reminder", payload, {
    jobId,
    delay,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  });
};
export const removeJobsByPrefix = async (prefix) => {
  const jobs = await notificationQueue.getJobs(["delayed", "waiting"]);

  for (const job of jobs) {
    if (job.id.startsWith(prefix)) {
      await job.remove();
    }
  }
};