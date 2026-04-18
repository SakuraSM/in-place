import { loadServerEnv } from './load-env.js';
import { createApp } from './app.js';
import { readEnv } from './env.js';

async function main() {
  loadServerEnv();
  const env = readEnv();
  const app = await createApp(env);

  await app.listen({
    host: '0.0.0.0',
    port: env.PORT,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
