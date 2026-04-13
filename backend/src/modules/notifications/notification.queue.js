/**
 * Notification Queue - BullMQ Queue Management
 *
 * Nhiệm vụ:
 * 1. Tạo và quản lý BullMQ queue cho notification jobs
 * 2. Add job với unique jobId (idempotent)
 * 3. Remove jobs by prefix (dùng job.opts.jobId, KHÔNG phải job.id)
 *
 * CRITICAL FIX: job.id trong BullMQ là internal numeric ID (1, 2, 3...)
 * Custom jobId được lưu ở job.opts.jobId
 */

import { Queue } from "bullmq";
import connection from "../../config/redis.js";

export const notificationQueue = new Queue("notification-reminder", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      age: 3600, // Giữ completed jobs 1 giờ để tránh jobId collision
      count: 1000,
    },
    removeOnFail: false,
  },
});

/**
 * Thêm một notification job vào queue
 *
 * @param {Object} params
 * @param {string} params.jobId - Unique job identifier (e.g., "reminder:TASK:abc123:ON_TIME:0")
 * @param {Object} params.payload - Job data
 * @param {number} params.delay - Delay in ms before job fires
 */
export const addNotificationJob = async ({ jobId, payload, delay }) => {
  try {
    // Xóa job cũ cùng jobId nếu tồn tại (để reschedule sạch)
    const existingJob = await notificationQueue.getJob(jobId);
    if (existingJob) {
      try {
        const state = await existingJob.getState();
        // Chỉ remove nếu job chưa active/completed
        if (state === "delayed" || state === "waiting" || state === "paused") {
          await existingJob.remove();
          console.log(`[Queue] Removed existing job ${jobId} (state: ${state})`);
        } else {
          console.log(
            `[Queue] Job ${jobId} exists in state ${state}, skipping add`
          );
          return null;
        }
      } catch (removeError) {
        // Job might have been processed between getJob and remove
        console.log(
          `[Queue] Could not remove existing job ${jobId}: ${removeError.message}`
        );
      }
    }

    const job = await notificationQueue.add("reminder", payload, {
      jobId,
      delay,
    });

    console.log(
      `[Queue] Added job ${jobId} (internal id: ${job.id}, delay: ${delay}ms)`
    );
    return job;
  } catch (error) {
    const message = `${error?.message || ""}`;
    const duplicateJob = /already exists|already waiting|jobid/i.test(message);

    if (duplicateJob) {
      console.log(`[Queue] Job ${jobId} đã tồn tại, skip add`);
      return null;
    }

    console.error(`[Queue] Error adding job ${jobId}:`, error);
    throw error;
  }
};

/**
 * Xóa tất cả jobs có jobId bắt đầu bằng prefix
 *
 * CRITICAL FIX: Dùng job.opts.jobId thay vì job.id
 * - job.id = internal BullMQ numeric ID (1, 2, 3...)
 * - job.opts.jobId = custom jobId ta set khi add ("reminder:TASK:abc123:ON_TIME:0")
 *
 * @param {string} prefix - Prefix to match (e.g., "reminder:TASK:abc123")
 * @returns {number} Number of jobs removed
 */
export const removeJobsByPrefix = async (prefix) => {
  let removedCount = 0;

  const jobs = await notificationQueue.getJobs([
    "delayed",
    "waiting",
    "prioritized",
    "paused",
  ]);

  for (const job of jobs) {
    // FIX: Dùng job.opts.jobId thay vì job.id
    const customJobId = job.opts?.jobId || job.id || "";
    if (typeof customJobId === "string" && customJobId.startsWith(prefix)) {
      try {
        await job.remove();
        removedCount++;
        console.log(
          `[Queue] Removed job ${customJobId} (internal id: ${job.id})`
        );
      } catch (removeError) {
        // Job might have been processed between getJobs and remove
        console.warn(
          `[Queue] Could not remove job ${customJobId}: ${removeError.message}`
        );
      }
    }
  }

  console.log(
    `[Queue] removeJobsByPrefix("${prefix}"): removed ${removedCount} jobs`
  );
  return removedCount;
};

/**
 * Lấy tất cả active delayed jobs cho debugging
 * @returns {Array} List of delayed jobs with their custom jobIds
 */
export const getActiveJobs = async () => {
  const jobs = await notificationQueue.getJobs(["delayed", "waiting"]);
  return jobs.map((job) => ({
    internalId: job.id,
    jobId: job.opts?.jobId || job.id,
    data: job.data,
    delay: job.opts?.delay,
    processedOn: job.processedOn,
    timestamp: job.timestamp,
  }));
};