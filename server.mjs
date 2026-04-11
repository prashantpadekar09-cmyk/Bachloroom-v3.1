import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { createServer } from "node:http";

const distDir = join(process.cwd(), "dist");
const port = Number(process.env.PORT || 10000);
const host = "0.0.0.0";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

const safePath = (urlPath) => {
  const cleanedPath = normalize(decodeURIComponent(urlPath.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
  const fullPath = join(distDir, cleanedPath);
  return fullPath.startsWith(distDir) ? fullPath : join(distDir, "index.html");
};

createServer((req, res) => {
  const requestedPath = req.url === "/" ? "/index.html" : req.url || "/index.html";
  let filePath = safePath(requestedPath);

  if (!existsSync(filePath) || (existsSync(filePath) && statSync(filePath).isDirectory())) {
    filePath = join(distDir, "index.html");
  }

  const extension = extname(filePath).toLowerCase();
  res.setHeader("Content-Type", contentTypes[extension] || "application/octet-stream");

  const stream = createReadStream(filePath);
  stream.on("error", () => {
    res.statusCode = 404;
    res.end("Not found");
  });
  stream.pipe(res);
}).listen(port, host, () => {
  console.log(`bachloroom is serving dist on http://${host}:${port}`);
});
