import { IncomingMessage, ServerResponse } from "http";
import http from "node:http";
export interface RequestHandlers {
  /**
   * Main handler for HTTP requests
   */
  handleRequest: (req: IncomingMessage, res: ServerResponse) => Promise<void>;

  /**
   * Custom cleanup function to be called when the server is shutting down
   */
  cleanup?: () => void;

  /**
   * Server type name for logging purposes
   */
  serverType: string;
}

/**
 * Handles CORS headers for incoming requests
 */
function handleCORS(req: IncomingMessage, res: ServerResponse): void {
  if (req.headers.origin) {
    try {
      const origin = new URL(req.headers.origin as string);
      res.setHeader("Access-Control-Allow-Origin", origin.origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "*");
    } catch (error) {
      console.error("Error parsing origin:", error);
    }
  }
}

/**
 * Handles common endpoints like health check and ping
 * @returns true if the request was handled, false otherwise
 */
function handleCommonEndpoints(
  req: IncomingMessage,
  res: ServerResponse
): boolean {
  //* check if the request has a url
  if (!req.url) {
    res.writeHead(400).end("No URL");
    return true;
  }
  //* health check endpoint
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" }).end("OK");
    return true;
  }
  //* ping endpoint
  if (req.method === "GET" && req.url === "/ping") {
    res.writeHead(200).end("pong");
    return true;
  }

  return false;
}

// 跟踪信号监听器状态
let signalHandlersSetup = false;
let signalCleanupHandlers: (() => void)[] = [];

/**
 * Sets up signal handlers for graceful shutdown
 */
function setupCleanupHandlers(
  httpServer: http.Server,
  customCleanup?: () => void
): () => void {
  const cleanup = () => {
    console.log("\nClosing server...");

    // Execute custom cleanup if provided
    if (customCleanup) customCleanup();

    httpServer.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  };

  // 避免重复添加监听器
  if (!signalHandlersSetup) {
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
    signalHandlersSetup = true;
  }

  // 返回清理函数
  const removeHandlers = () => {
    if (signalHandlersSetup) {
      process.removeListener("SIGINT", cleanup);
      process.removeListener("SIGTERM", cleanup);
      signalHandlersSetup = false;
    }
  };

  signalCleanupHandlers.push(removeHandlers);
  return removeHandlers;
}

/**
 * 清理所有信号监听器
 */
export function cleanupAllSignalHandlers(): void {
  signalCleanupHandlers.forEach(cleanup => cleanup());
  signalCleanupHandlers = [];
}

/**
 * Logs server startup information with formatted URLs
 */
function logServerStartup(
  serverType: string,
  port: number,
  endpoint: string
): void {
  const serverUrl = `http://localhost:${port}${endpoint}`;
  const healthUrl = `http://localhost:${port}/health`;
  const pingUrl = `http://localhost:${port}/ping`;

  console.log(
    `${serverType} running on: \x1b[32m\u001B[4m${serverUrl}\u001B[0m\x1b[0m`
  );
  console.log("\nTest endpoints:");
  console.log(`• Health check: \u001B[4m${healthUrl}\u001B[0m`);
  console.log(`• Ping test: \u001B[4m${pingUrl}\u001B[0m`);
}

export function createBaseHttpServer(
  port: number,
  endpoint: string,
  handlers: RequestHandlers
): http.Server {
  const server = http.createServer(async (req, res) => {
    handleCORS(req, res);

    if (handleCommonEndpoints(req, res)) {
      return;
    }

    try {
      await handlers.handleRequest(req, res);
    } catch (error) {
      console.error("Request handling error:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  });

  server.listen(port, () => {
    logServerStartup(handlers.serverType, port, endpoint);
  });

  // 设置清理处理器并保存清理函数
  const cleanupHandler = setupCleanupHandlers(server, handlers.cleanup);

  // 在服务器关闭时清理监听器
  server.on('close', () => {
    cleanupHandler();
  });

  return server;
}
