import fsPromise from "node:fs/promises";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";

const argv = process.argv.slice(2);

const parameters = argv.reduce((acc, arg) => {
  const [keyName, value] = arg.split("=");

  if (!keyName.startsWith("--")) {
    return acc;
  }

  return {
    ...acc,
    [keyName]: value,
  };
}, {});

const username = parameters["--username"] || "Unknown username";

process.chdir(os.homedir());

process.stdin.write(`Welcome to the File Manager, ${username}!\n`);

process.stdin.on("data", async (chunk) => {
  const [msg, arg1, arg2] = chunk.toString().replace("\n", "").split(" ");

  try {
    switch (msg) {
      case "up":
        changeDir(path.resolve("..", process.cwd()));

        break;
      case "cd":
        changeDir(path.resolve(arg1));

        break;
      case "ls":
        const entries = await fsPromise.readdir(process.cwd(), {
          withFileTypes: true,
        });

        const directories = entries
          .filter((entry) => entry.isDirectory())
          .map(({ name }) => name)
          .sort((a, b) => (a > b ? 1 : -1));
        const files = entries
          .filter((entry) => entry.isFile())
          .map(({ name }) => name)
          .sort((a, b) => (a > b ? 1 : -1));

        directories.forEach((dir) =>
          process.stdin.write(`${dir} - directory\n`)
        );
        files.forEach((file) => process.stdin.write(`${file} - file\n`));

        break;
      case "cat":
        await new Promise((res, rej) => {
          const fileStream = fs.createReadStream(path.resolve(arg1));

          fileStream.pipe(process.stdout);

          fileStream.on("end", res);
        });

        process.stdin.write("\n")

        break;
      case "rn":
        await fsPromise.rename(path.resolve(arg1), path.resolve(arg2));

        break;
      case "add":
        await fsPromise.writeFile(arg1);
        break;
      case "cp":
        await new Promise((res, rej) => {
          const rStream = fs.createReadStream(path.resolve(arg1));
          const wStream = fs.createWriteStream(path.resolve(arg2));

          rStream.pipe(wStream);

          wStream.on("close", res);
        });
        break;
      case "mv":
        const fileName = path.basename(path.resolve(arg1));

        await new Promise((res, rej) => {
          const rStream = fs.createReadStream(path.resolve(arg1));
          const wStream = fs.createWriteStream(path.resolve(arg2, fileName));

          rStream.pipe(wStream);

          wStream.on("close", res);
        });

        await fsPromise.rm(path.resolve(arg1));

        break;
      case "rm":
        await fsPromise.rm(path.resolve(arg1));
      case "os":
        if (arg1 === "--EOL") {
          process.stdin.write(os.EOL + "\n");
        }

        if (arg1 === "--cpus") {
          process.stdin.write(`total: ${os.cpus().length}
${os
  .cpus()
  .map(({ model }) => model)
  .join("\n")
  .trim()}
`);
        }

        if (arg1 === "--homedir") {
          process.stdin.write(os.homedir() + "\n");
        }

        if (arg1 === "--username") {
          process.stdin.write(os.userInfo().username + "\n");
        }

        if (arg1 === "--architecture") {
          process.stdin.write(os.arch() + "\n");
        }

        break;
      case "hash":
        const data = await fsPromise.readFile(path.resolve(arg1));

        const hash = crypto
          .createHash("sha256")
          .update(data)
          .copy()
          .digest("hex");

        process.stdin.write(hash + "\n");
        break;
      case "compress":
        await new Promise((res) => {
          const brotli = zlib.createBrotliCompress();

          const rStream = fs.createReadStream(arg1);
          const wStream = fs.createWriteStream(arg2);

          rStream.pipe(brotli).pipe(wStream);

          wStream.on("close", res);
        });

        break;
      case "decompress":
        await new Promise((res) => {
          const brotli = zlib.createBrotliDecompress();

          const rStream = fs.createReadStream(arg1);
          const wStream = fs.createWriteStream(arg2);

          rStream.pipe(brotli).pipe(wStream);

          wStream.on("close", res);
        });
        break;
      case ".exit":
        process.exit(0);
      default:
        process.stdin.write("Invalid input\n");
    }
  } catch (e) {
    console.error(e);
    process.stdin.write("Operation failed\n");
  }

  process.stdin.write(`You are currently in ${process.cwd()}\n`);
});

process.on("end", () => {
  process.stdin.write(
    `Thank you for using File Manager, ${username}, goodbye!\n`
  );
});

// move to modules

function changeDir(dir) {
  if (dir === os.homedir() || !dir) {
    return;
  }

  process.chdir(dir);
}
