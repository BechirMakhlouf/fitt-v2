import { Elysia } from "elysia";
import { auth } from "./auth";
import { authRoute } from "./routes/authRoute";
import ENV from "./env";

const app = new Elysia()
  // .use(cors())
  .use(authRoute("/auth", auth))
  .listen(
    ENV.PORT,
    () => console.log("Server starting at PORT:", ENV.PORT),
  );

export type ServerApp = typeof app;
