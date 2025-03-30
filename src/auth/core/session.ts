import { userRoles } from "@/drizzle/schema";
import { z } from "zod";
import crypto from 'crypto';
import { redisClient } from "@/redis/redis";

const sessionSchema = z.object({
  id: z.string(),
  role: z.enum(userRoles),
})

const SESSION_EXPIRATION_SECONDS = 60 * 60 * 24 * 7;
const COOKIES_SESSION_KEY = "session-id";

type UserSession = z.infer<typeof sessionSchema>
export type Cookies = {
  set: (
    key: string,
    value:  string,
    options: {
      secure?: boolean,
      httpOnly?: boolean,
      sameSite?: "strict" | "lax"
      expires?: number,
    }
  ) => void
  get: (key: string) => {name: string; value: string} | undefined
  delete: (key: string) => void
}

export function getUserFromSession(cookies: Pick<Cookies, "get">) {
  const sessionId = cookies.get(COOKIES_SESSION_KEY)?.value;
  if(sessionId == null) return null;
  return getuserSessionById(sessionId);
}

export async function createUserSession(user: UserSession, cookies: Cookies){
  const sessionId = crypto.randomBytes(512).toString('hex').normalize();
  await redisClient.set(`session:${sessionId}`, sessionSchema.parse(user), {
    ex: SESSION_EXPIRATION_SECONDS
  })

  setCookie(sessionId, cookies);
}

export async function removeUserFromSession(cookies: Pick<Cookies, "get" | "delete">) {
  const sessionId = cookies.get(COOKIES_SESSION_KEY)?.value;
  if(sessionId == null) return null;

  await redisClient.del(`session:${sessionId}`);
  cookies.delete(COOKIES_SESSION_KEY);
}

function setCookie(sessionId: string, cookies: Pick<Cookies, "set">) {
  cookies.set(COOKIES_SESSION_KEY, sessionId, {
    secure: true,
    httpOnly: true,
    sameSite: "lax",
    expires: Date.now() + SESSION_EXPIRATION_SECONDS * 1000,
  })
}

async function getuserSessionById(sessionId: string){
  const rawUser = await redisClient.get(`session:${sessionId}`);
  const {success, data: user } = sessionSchema.safeParse(rawUser);

  return success ? user : null;
}