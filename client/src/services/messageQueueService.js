import { api } from '../lib/api';

const RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000]; // Exponential backoff delays in ms
const MAX_BATCH_SIZE = 10;
const BATCH_INTERVAL = 1000; // 1 second

export class MessageQueueService {
  constructor() {
    this.queue = new Map();
    this.retryCount = new Map();
    this.batchTimeout = null;
    this.isOnline = navigator.onLine;

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processBatch();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // Add message to queue
  enqueue(teamId, message) {
    if (!this.queue.has(teamId)) {
      this.queue.set(teamId, []);
    }

    this.queue.get(teamId).push(message);
    this.scheduleBatch();

    return message.localId;
  }

  // Schedule batch processing
  scheduleBatch() {
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.processBatch();
        this.batchTimeout = null;
      }, BATCH_INTERVAL);
    }
  }

  // Process a batch of messages
  async processBatch() {
    if (!this.isOnline) return;

    for (const [teamId, messages] of this.queue.entries()) {
      if (!messages.length) continue;

      // Take up to MAX_BATCH_SIZE messages
      const batch = messages.slice(0, MAX_BATCH_SIZE);
      const batchIds = batch.map(msg => msg.localId);

      try {
        // Send batch to server
        const response = await api.post(`/teams/${teamId}/messages/batch`, {
          messages: batch
        });

        // Process successful messages
        if (response.data.success) {
          // Remove sent messages from queue
          this.queue.set(
            teamId,
            messages.filter(msg => !batchIds.includes(msg.localId))
          );

          // Clear retry counts for successful messages
          batchIds.forEach(id => this.retryCount.delete(id));

          // Emit success events
          batch.forEach((msg, index) => {
            const serverMsg = response.data.messages[index];
            this.emitSuccess(msg.localId, serverMsg);
          });
        }
      } catch (error) {
        // Handle failed messages
        batch.forEach(msg => {
          const retries = (this.retryCount.get(msg.localId) || 0) + 1;
          this.retryCount.set(msg.localId, retries);

          if (retries < RETRY_DELAYS.length) {
            // Schedule retry with exponential backoff
            setTimeout(() => {
              this.processBatch();
            }, RETRY_DELAYS[retries - 1]);
          } else {
            // Mark as failed after max retries
            this.emitError(msg.localId, error);

            // Remove from queue
            this.queue.set(
              teamId,
              messages.filter(m => m.localId !== msg.localId)
            );
            this.retryCount.delete(msg.localId);
          }
        });
      }
    }

    // Schedule next batch if there are remaining messages
    if ([...this.queue.values()].some(msgs => msgs.length > 0)) {
      this.scheduleBatch();
    }
  }

  // Event emitters
  emitSuccess(localId, serverMessage) {
    const event = new CustomEvent('messageSuccess', {
      detail: { localId, serverMessage }
    });
    window.dispatchEvent(event);
  }

  emitError(localId, error) {
    const event = new CustomEvent('messageError', {
      detail: { localId, error }
    });
    window.dispatchEvent(event);
  }

  // Get queue status
  getStatus(teamId) {
    const messages = this.queue.get(teamId) || [];
    return {
      pending: messages.length,
      retrying: messages.filter(msg => this.retryCount.has(msg.localId)).length
    };
  }

  // Clear queue for a team
  clearQueue(teamId) {
    const messages = this.queue.get(teamId) || [];
    messages.forEach(msg => {
      this.retryCount.delete(msg.localId);
    });
    this.queue.delete(teamId);
  }
}