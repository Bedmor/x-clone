import { execFileSync } from "node:child_process";

const noEngineEnv = process.env.PRISMA_GENERATE_NO_ENGINE;
const isProduction = process.env.NODE_ENV === "production";
const shouldUseNoEngine =
  noEngineEnv === "1" ||
  noEngineEnv === "true" ||
  (isProduction && noEngineEnv !== "0" && noEngineEnv !== "false");

const args = ["generate"];
if (shouldUseNoEngine) {
  args.push("--no-engine");
}

execFileSync("prisma", args, {
  stdio: "inherit",
  env: process.env,
});
