import { ServerResponse, STATUS_CODES } from "node:http";
import { inspect } from "node:util";

import { developmentMode } from "./env";
import { send } from "./send";
import { Server } from "./server";

export enum Status {
  BadRequest = 400,
  Unauthorized = 401,
  PaymentRequired = 402,
  Forbidden = 403,
  NotFound = 404,
  MethodNotAllowed = 405,
  NotAcceptable = 406,
  ProxyAuthenticationRequired = 407,
  RequestTimeout = 408,
  Conflict = 409,
  Gone = 410,
  LengthRequired = 411,
  PreconditionFailed = 412,
  PayloadTooLarge = 413,
  URITooLong = 414,
  UnsupportedMediaType = 415,
  RangeNotSatisfiable = 416,
  ExpectationFailed = 417,
  ImATeapot = 418,
  MisdirectedRequest = 421,
  UnprocessableEntity = 422,
  Locked = 423,
  FailedDependency = 424,
  UnorderedCollection = 425,
  UpgradeRequired = 426,
  PreconditionRequired = 428,
  TooManyRequests = 429,
  RequestHeaderFieldsTooLarge = 431,
  UnavailableForLegalReasons = 451,
  InternalServerError = 500,
  NotImplemented = 501,
  BadGateway = 502,
  ServiceUnavailable = 503,
  GatewayTimeout = 504,
  HTTPVersionNotSupported = 505,
  VariantAlsoNegotiates = 506,
  InsufficientStorage = 507,
  LoopDetected = 508,
  BandwidthLimitExceeded = 509,
  NotExtended = 510,
  NetworkAuthenticationRequire = 511,
}

interface HttpErrorBody {
  status: Status;
  message: string;
  stack?: string;
}

export function sendError(res: ServerResponse, error?: Error): void;
export function sendError(
  res: ServerResponse,
  status: Status,
  error?: Error
): void;
export function sendError(
  res: ServerResponse,
  message: string,
  error?: Error
): void;
export function sendError(
  res: ServerResponse,
  status: Status,
  message: string,
  error?: Error
): void;
export function sendError(
  res: ServerResponse,
  statusOrMessageOrError: Status | Error | string = Status.InternalServerError,
  messageOrError: Error | string = statusOrMessageOrError instanceof Error
    ? STATUS_CODES[Status.InternalServerError]!
    : STATUS_CODES[statusOrMessageOrError as Status] ??
      STATUS_CODES[Status.InternalServerError]!,
  error?: Error
) {
  const status =
    typeof statusOrMessageOrError === "number"
      ? statusOrMessageOrError
      : Status.InternalServerError;

  const message = ([messageOrError, statusOrMessageOrError].find(
    $arg => typeof $arg === "string"
  ) ?? STATUS_CODES[status]) as string;

  error = [error, messageOrError, statusOrMessageOrError].find(
    $arg => $arg instanceof Error
  ) as Error | undefined;

  const body: HttpErrorBody = {
    status,
    message,
  };

  const internalError = status < 500;
  if (!internalError) {
    console.error(
      `internal error: req id = ${Server.getRequestId(res.req)} status = ${
        res.statusCode
      } body = ${inspect(body)} res = ${inspect(res)} error = ${inspect(error)}`
    );
    if (error && developmentMode) {
      body.stack = error.stack;
    }
  }

  send(res, status, body);
}
