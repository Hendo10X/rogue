import { Queue } from "bullmq";
import { getRedis } from "./redis";

export const ORDER_QUEUE_NAME = "order-processing";

export interface OrderJobData {
  orderId: string;
}

export function getOrderQueue(): Queue<OrderJobData> {
  return new Queue<OrderJobData>(ORDER_QUEUE_NAME, {
    connection: getRedis(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { count: 1000 },
    },
  });
}
