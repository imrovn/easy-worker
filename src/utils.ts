// TODO: Using a simple counter for message IDs to avoid external dependencies, use uuid if needed
let messageIdCounter = 0;

/**
 * Generates a unique message ID.
 * @returns {string} A unique ID string.
 */
export function getNextMessageId(): string {
  return `easy-worker-msg-${messageIdCounter++}`;
}
