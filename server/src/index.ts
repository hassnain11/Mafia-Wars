import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server as IOServer } from 'socket.io';
import { logger } from './util/logger.js';

const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? '0.0.0.0';
const CLIENT_ORIGIN = (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

async function main() {
  const app = Fastify({ logger });

  await app.register(cors, {
    origin: CLIENT_ORIGIN,
    credentials: true,
  });

  app.get('/healthz', async () => ({ ok: true }));

  const io = new IOServer(app.server, {
    cors: { origin: CLIENT_ORIGIN, credentials: true },
    pingInterval: 20_000,
    pingTimeout: 20_000,
  });

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'socket connected');
    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, reason }, 'socket disconnected');
    });
  });

  await app.listen({ host: HOST, port: PORT });
  logger.info({ port: PORT, host: HOST, clientOrigin: CLIENT_ORIGIN }, 'server listening');

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down');
    io.close();
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error(err, 'fatal boot error');
  process.exit(1);
});
