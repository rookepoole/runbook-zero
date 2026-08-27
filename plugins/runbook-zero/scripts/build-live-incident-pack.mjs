#!/usr/bin/env node

/* global process */

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildIncidentPack, rejectCapture } from "./site-capture-core.mjs";

const MAX_INPUT_BYTES = 1_000_000;

const parseArguments = (argv) => {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!new Set(["--input", "--output"]).has(flag) || value === undefined) {
      rejectCapture(
        "usage: --input <capture.json> --output <incident-pack.json>",
      );
    }
    result[flag.slice(2)] = value;
  }
  if (!result.input || !result.output) {
    rejectCapture(
      "usage: --input <capture.json> --output <incident-pack.json>",
    );
  }
  return result;
};

const main = async () => {
  const args = parseArguments(process.argv.slice(2));
  const inputPath = resolve(args.input);
  const outputPath = resolve(args.output);
  const input = await readFile(inputPath);
  if (input.byteLength > MAX_INPUT_BYTES) {
    rejectCapture("input must be 1 MB or smaller");
  }
  let capture;
  try {
    capture = JSON.parse(input.toString("utf8"));
  } catch {
    rejectCapture("input must contain valid JSON");
  }
  const pack = buildIncidentPack(capture);
  await writeFile(outputPath, `${JSON.stringify(pack, null, 2)}\n`, "utf8");
  process.stdout.write(
    `${JSON.stringify({ ok: true, output: outputPath, packId: pack.packId })}\n`,
  );
};

export { buildIncidentPack };

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
