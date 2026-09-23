import AsyncStorage from "@react-native-async-storage/async-storage";
import { submitAttendance } from "../api/client";

const QUEUE_KEY = "attendance.offlineQueue";

async function readQueue() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writeQueue(queue) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// Called when a submit fails because the device has no connectivity
// (a network error, not a server-side rejection like a 409 duplicate —
// those should surface to the supervisor immediately, not be queued).
export async function enqueueSubmission(payload) {
  const queue = await readQueue();
  queue.push({ ...payload, queuedAt: new Date().toISOString() });
  await writeQueue(queue);
  return queue.length;
}

export async function getQueueSize() {
  const queue = await readQueue();
  return queue.length;
}

export async function getQueue() {
  return readQueue();
}

// Attempts to submit every queued sheet in order. Stops at the first
// item that fails for a network reason (so order is preserved and
// nothing is silently dropped); items rejected by the server for a
// real reason (e.g. already submitted elsewhere) are dropped from the
// queue with the failure recorded, since retrying them would never
// succeed.
export async function flushQueue(onProgress) {
  let queue = await readQueue();
  const results = { submitted: 0, dropped: 0, remaining: 0 };

  while (queue.length > 0) {
    const next = queue[0];
    try {
      await submitAttendance(next);
      queue = queue.slice(1);
      results.submitted += 1;
    } catch (err) {
      if (err.isNetworkError) {
        break; // still offline — stop here, keep the rest queued
      }
      // Server actively rejected it (e.g. duplicate sheet for the day) — drop it.
      queue = queue.slice(1);
      results.dropped += 1;
    }
    await writeQueue(queue);
    onProgress?.({ ...results, remaining: queue.length });
  }

  results.remaining = queue.length;
  return results;
}
