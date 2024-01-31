import { Static, t } from "elysia";
import { Value } from "@sinclair/typebox/value";

const EnvSchema = t.Object({
  PORT: t.Number(),
  JWT_SECRET: t.String(),
});

type EnvType = Static<typeof EnvSchema>;

const ENV: EnvType = {
  PORT: Number(process.env.PORT!),
  JWT_SECRET: process.env.JWT_SECRET!,
};

if (!Value.Check(EnvSchema, ENV)) {
  throw new Error("environment variable missing.");
}

export default ENV;
