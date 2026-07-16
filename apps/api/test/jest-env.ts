process.env.NODE_ENV = "test";
process.env.RABBITMQ_URL = "amqp://guest:guest@127.0.0.1:5672";
process.env.RABBITMQ_EXCHANGE = "lcsp.events.test";
process.env.OUTBOX_POLL_INTERVAL_MS = "60000";
