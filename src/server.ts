import { createServer, IncomingMessage, ServerResponse } from "node:http";

import Router = require("find-my-way");
import type { HTTPMethod } from "find-my-way";

import { send } from "./send";
import { sendError, Status } from "./send_error";
import parseurl = require("parseurl");
import { randomUUID } from "node:crypto";

type Handler = (
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string | undefined>
) => Parameters<typeof send>[2];

export namespace Server {
  const router = Router<Router.HTTPVersion.V1>();
  const writeable = new WeakSet<ServerResponse>();
  const reqIds = new WeakMap<IncomingMessage, string>();

  const server = createServer(onRequestHandler);

  function onRequestHandler(req: IncomingMessage, res: ServerResponse) {
    const reqId = randomUUID();
    reqIds.set(req, reqId);
    console.log(
      `incoming request: req id = ${reqId} method = ${
        req.method || "unknown-method"
      } path = ${req.url || "unknown-path"} time = ${new Date().toISOString()}`
    );

    writeable.add(res);
    res.on("finish", () => {
      markAsWritten(res);

      console.log(
        `response sent: req id = ${reqId} status = ${
          res.statusCode
        } time = ${new Date().toISOString()}`
      );
    });

    const url = parseurl(req);
    const path = url?.pathname ?? req.url;
    if (!path) return sendError(res, Status.BadRequest);

    const route = router.find(req.method as HTTPMethod, path);
    if (!route) return sendError(res, Status.NotFound);

    new Promise(resolve =>
      resolve(route.handler(req, res, route.params, route.store))
    )
      .then(val =>
        val || isWriteable(res)
          ? send(res, !val ? 204 : res.statusCode ?? 200, val)
          : void 0
      )
      .catch(err => sendError(res, Status.InternalServerError, err as Error))
      .finally(() => {
        reqIds.delete(req);
      });
  }

  export function getRequestId(req: IncomingMessage) {
    return reqIds.get(req) ?? "unknown-request";
  }

  export function isWriteable(res: ServerResponse) {
    return writeable.has(res);
  }

  export function markAsWritten(res: ServerResponse) {
    writeable.delete(res);
  }

  export function addHandler(
    method: HTTPMethod | HTTPMethod[],
    path: string,
    handler: Handler
  ): void;
  export function addHandler(
    method: HTTPMethod | HTTPMethod[],
    path: string,
    options: Router.RouteOptions,
    handler: Handler
  ): void;
  export function addHandler(
    method: HTTPMethod | HTTPMethod[],
    path: string,
    handler: Handler,
    store: unknown
  ): void;
  export function addHandler(
    method: HTTPMethod | HTTPMethod[],
    path: string,
    options: Router.RouteOptions,
    handler: Handler,
    store: unknown
  ): void;
  export function addHandler(
    method: HTTPMethod | HTTPMethod[],
    path: string,
    options: Router.RouteOptions | Handler,
    handler?: Handler | unknown,
    store?: unknown
  ) {
    router.on(
      method,
      path,
      options as Router.RouteOptions,
      handler as Router.Handler<Router.HTTPVersion.V1>,
      store
    );
  }

  export function listen(
    port = process.env.PORT ? parseInt(process.env.PORT) : 3000
  ) {
    console.log("?");
    server.listen(port);
  }
}
