export type RequestOptions = RequestInit & {
  skipAuth?: boolean;
};

export type AppCoreRequest = <T>(path: string, options?: RequestOptions) => Promise<T>;
