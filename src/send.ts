import { ServerResponse } from "node:http";
import { Stream } from "node:stream";

import { developmentMode } from "./env";
import { sendError } from "./send_error";
import { Server } from "./server";

const jsonStringify = developmentMode
  ? (obj: unknown) => JSON.stringify(obj, void 0, 2)
  : (obj: unknown) => JSON.stringify(obj);

export function send(
  res: ServerResponse,
  // TODO: Statuses.
  status: number,
  data?: unknown | string | number | Stream | Buffer
) {
  if (!Server.isWriteable(res)) {
    console.error(
      new Error(
        "Tried to write to a response that had already been written to"
      ),
      { status, data },
      res
    );

    return;
  }

  res.statusCode = status;

  if (!data) {
    res.end();
    return;
  }

  if (Buffer.isBuffer(data)) {
    if (!res.getHeader("Content-Type")) {
      res.setHeader("Content-Type", "application/octet-stream");
    }

    res.setHeader("Content-Length", data.length);
    res.end(data);
    return;
  }

  if (data instanceof Stream) {
    if (!res.getHeader("Content-Type")) {
      res.setHeader("Content-Type", "application/octet-stream");
    }

    data.pipe(res);
    return;
  }

  let stringRespBody: string;
  if (typeof data === "object" || typeof data === "number") {
    // We stringify before setting the header
    // in case `JSON.stringify` throws and a
    // 500 has to be sent instead
    stringRespBody = jsonStringify(data);

    if (!res.getHeader("Content-Type")) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
    }
  } else if (typeof data === "string") {
    stringRespBody = data;
  } else {
    const err = new TypeError(
      "Failed to create a string representation of data"
    );

    sendError(res, err);
    console.log(err, data);
    res.end();
    return;
  }

  res.setHeader("Content-Length", Buffer.byteLength(stringRespBody));
  res.end(stringRespBody);
}
