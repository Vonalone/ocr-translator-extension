import { appendFile, mkdir, rename, rm, stat } from "node:fs/promises";
import { dirname } from "node:path";

const MAX_LOG_BYTES = 2 * 1024 * 1024;

export function createFileLog(path: string, secrets: () => string[]) {
  let queue = Promise.resolve();

  function write(level: "INFO" | "ERROR", event: string, detail = ""): Promise<void> {
    let safeDetail = detail;
    for (const secret of secrets()) {
      if (secret.length >= 3) safeDetail = safeDetail.replaceAll(secret, "[redacted]");
    }
    safeDetail = safeDetail.replace(/[\r\n]+/g, " ").slice(0, 2000);
    const safeEvent = event.replace(/[^a-zA-Z0-9:_-]/g, "_").slice(0, 80);
    const line = `${new Date().toISOString()} ${level} ${safeEvent}${safeDetail ? ` ${safeDetail}` : ""}\n`;

    const task = queue.then(async () => {
      await mkdir(dirname(path), { recursive: true });
      const size = await stat(path).then((file) => file.size, () => 0);
      if (size + Buffer.byteLength(line) > MAX_LOG_BYTES) {
        await rm(`${path}.1`, { force: true });
        await rename(path, `${path}.1`).catch(() => {});
      }
      await appendFile(path, line, { mode: 0o600 });
    });
    queue = task.catch((error) => console.error("Desktop log write failed:", error));
    return task;
  }

  return { path, write };
}
