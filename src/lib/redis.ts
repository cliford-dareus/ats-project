import { Redis } from 'ioredis';

const redis = new Redis({
    host: '127.0.0.1',
    port: 6379,
    maxRetriesPerRequest: null, // Required for BullMQ workers
    enableReadyCheck: false,    // Optional: disables readiness checks
});

export default redis;
