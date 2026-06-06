import { loadEnvConfig } from "@next/env";
import path from "node:path";

const repoRoot = path.resolve(process.cwd(), "..");

loadEnvConfig(repoRoot);

export function getServerEnv(name: string): string | undefined {
  return process.env[name];
}
