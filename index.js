const cp = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");

const WebSocket = require("ws");

const readFile = promisify(fs.readFile);

const wss = new WebSocket.Server({
  port: 8080
});

const port = 3000;
const devServer = http.createServer((req, res) => {
  res.writeHead(200);
  readFile(path.join("client", req.url))
    .catch(e => {
      if (req.url.includes("bundle.js")) {
        return readFile(path.resolve("bundle", "index.js"));
      }
      return readFile(path.resolve("client", "index.html"));
    })
    .then(file => {
      res.end(file);
    })
    .catch(e => console.error(e));
});

const fpack = cp.spawn("fpack", [
  "--development",
  "--report=json",
  "-w",
  "./client/index.js"
]);

fpack.stdout.on("data", data => {
  console.info(data.toString("utf8"));
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send("new bundle");
    }
  });
});

fpack.stderr.on("data", data => {
  console.warn(JSON.stringify(data.toString("utf8")));
});

fpack.on("close", code => {
  console.log(`child process exited with code ${code}`);
});

devServer.listen(port, () => {
  console.log(`Started devServer on ${port}`);
});
