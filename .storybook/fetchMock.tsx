import React, { useEffect } from "react";
import type { Decorator } from "@storybook/nextjs-vite";

type MaybePromise<T> = T | Promise<T>;

type FetchMockRequest = {
  url: string;
  method: string;
  request: Request;
  bodyText: string | null;
  bodyJson: unknown;
};

type UrlMatcher = string | RegExp | ((request: FetchMockRequest) => boolean);

export type FetchMockHandler = {
  method?: string;
  url?: UrlMatcher;
  status?: number;
  delayMs?: number;
  once?: boolean;
  headers?: Record<string, string>;
  json?: unknown | ((request: FetchMockRequest) => MaybePromise<unknown>);
  text?: string | ((request: FetchMockRequest) => MaybePromise<string>);
};

type FetchMockParameters = {
  enabled?: boolean;
  handlers?: FetchMockHandler[];
};

type StoryParametersWithFetchMock = {
  fetchMock?: FetchMockParameters;
};

type RuntimeHandler = FetchMockHandler & {
  used: number;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function matchUrl(matcher: UrlMatcher | undefined, request: FetchMockRequest) {
  if (!matcher) return true;
  if (typeof matcher === "string") return request.url.includes(matcher);
  if (matcher instanceof RegExp) return matcher.test(request.url);
  return matcher(request);
}

async function resolveRequest(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<FetchMockRequest> {
  const request = new Request(input, init);
  const method = request.method.toUpperCase();

  let bodyText: string | null = null;
  let bodyJson: unknown = null;
  if (method !== "GET" && method !== "HEAD") {
    bodyText = await request.clone().text();
    if (bodyText) {
      try {
        bodyJson = JSON.parse(bodyText);
      } catch {
        bodyJson = null;
      }
    }
  }

  return {
    url: request.url,
    method,
    request,
    bodyText,
    bodyJson,
  };
}

function FetchMockBoundary({
  handlers,
  children,
}: {
  handlers: FetchMockHandler[];
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!handlers.length) return;

    const originalFetch = window.fetch.bind(window);
    const runtimeHandlers: RuntimeHandler[] = handlers.map((handler) => ({
      ...handler,
      used: 0,
    }));

    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = await resolveRequest(input, init);

      for (const handler of runtimeHandlers) {
        if (handler.once && handler.used > 0) continue;
        if (handler.method && handler.method.toUpperCase() !== request.method) continue;
        if (!matchUrl(handler.url, request)) continue;

        handler.used += 1;
        if (handler.delayMs && handler.delayMs > 0) {
          await sleep(handler.delayMs);
        }

        const headers = new Headers(handler.headers ?? {});
        const status = handler.status ?? 200;

        if (handler.json !== undefined) {
          const payload =
            typeof handler.json === "function"
              ? await handler.json(request)
              : handler.json;
          if (!headers.has("content-type")) {
            headers.set("content-type", "application/json");
          }
          return new Response(JSON.stringify(payload), { status, headers });
        }

        if (handler.text !== undefined) {
          const payload =
            typeof handler.text === "function"
              ? await handler.text(request)
              : handler.text;
          if (!headers.has("content-type")) {
            headers.set("content-type", "text/plain");
          }
          return new Response(payload, { status, headers });
        }

        return new Response(null, { status, headers });
      }

      return originalFetch(input, init);
    }) as typeof window.fetch;

    return () => {
      window.fetch = originalFetch;
    };
  }, [handlers]);

  return <>{children}</>;
}

export const withFetchMock: Decorator = (Story, context) => {
  const parameters = context.parameters as StoryParametersWithFetchMock;
  const fetchMock = parameters.fetchMock;
  if (fetchMock?.enabled === false) {
    return React.createElement(Story);
  }

  return React.createElement(
    FetchMockBoundary,
    { handlers: fetchMock?.handlers ?? [] },
    React.createElement(Story)
  );
};
