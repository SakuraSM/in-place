import 'fastify';
import type { UploadedImageFile } from '../lib/uploads.js';

declare module '@fastify/multipart' {
  const multipartPlugin: import('fastify').FastifyPluginAsync<any>;
  export default multipartPlugin;
}

declare module '@fastify/static' {
  const staticPlugin: import('fastify').FastifyPluginAsync<any>;
  export default staticPlugin;
}

declare module 'fastify' {
  interface FastifyRequest {
    file: () => Promise<UploadedImageFile | undefined>;
  }
}

export {};
