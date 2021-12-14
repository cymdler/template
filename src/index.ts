import { Server } from "./server";

Server.addHandler("GET", "/", () => ({ hello: "world" }));
Server.listen(8080);
