import { ref } from 'vue';
import { generateId } from './format.js';

export interface QueuedMessage {
  id: string;
  content: string;
  images?: File[];
  timestamp: number;
}

export function useMessageQueue() {
  const queue = ref<QueuedMessage[]>([]);

  function addToQueue(msg: Omit<QueuedMessage, 'id' | 'timestamp'>) {
    queue.value.push({
      ...msg,
      id: generateId(),
      timestamp: Date.now(),
    });
  }

  function getNext() {
    return queue.value.shift();
  }

  function clear() {
    queue.value = [];
  }

  return {
    queue,
    addToQueue,
    getNext,
    clear,
  };
}
