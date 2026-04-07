import { spawn } from "node:child_process";

function run(name: string, command: string, args: string[]) {
  const child = spawn(command, args, {
    stdio: "inherit",
    env: process.env
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      process.exit(code);
    }
  });

  child.on("error", (error) => {
    console.error(`[${name}] failed:`, error.message);
    process.exit(1);
  });

  return child;
}

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const server = run("server", npmCmd, ["run", "dev:server"]);
const client = run("client", npmCmd, ["run", "dev:client"]);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.kill(signal);
    client.kill(signal);
    process.exit(0);
  });
}
