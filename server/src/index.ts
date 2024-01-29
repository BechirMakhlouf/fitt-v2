import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { AuthInterface } from "./auth";

const SERVER_PORT: number = 3000;

// is-authenticated how are we going to do that

const authRoute = (auth: AuthInterface) => new Elysia({ name: "auth-route" })
  .get("/sign-in", ({ store }) => `signing in ${store}`, {
    body: t.Object({
      providerId: t.String(),
      providerUserId: t.String({}),
      password: t.String(),
    }),
  })
  .get("/sign-up", () => "signing up")
  .get("/sign-out", () => "signing out");

const app = new Elysia()
  .state("hello", 1)
  .use(cors())
  // .mount("/auth", authRoute("injecting auth"))
  .listen(
    SERVER_PORT,
    () => console.log("Server starting at PORT:", SERVER_PORT),
  );


export type ServerApp = typeof app;
