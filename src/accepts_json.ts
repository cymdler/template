import { IncomingHttpHeaders } from "node:http2";

import contentType = require("content-type");

export function acceptsJson(headers: IncomingHttpHeaders) {
  if (headers.accept === "application/json") return true;

  let type = "*/*";

  if (headers.accept) {
    try {
      type = contentType.parse(headers.accept).type || type;
    } catch {
      /* noop */
    }
  }

  return type === "*/*" || type === "application/json";
}
