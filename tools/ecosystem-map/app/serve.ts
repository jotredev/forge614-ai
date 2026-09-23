import page from "./index.html";

const port = Number(process.env.MAP_PORT ?? 4614);
const server = Bun.serve({ port, development: true, routes: { "/": page } });

process.stdout.write(`${JSON.stringify({ schemaVersion: 1, url: server.url.href })}\n`);
