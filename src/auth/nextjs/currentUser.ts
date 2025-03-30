import { cookies } from "next/headers";
import { cache } from "react";
import { getUserFromSession } from "../core/session";
import { db } from "@/drizzle/db";
import { UserTable } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

type FullUser = Exclude<
  Awaited<ReturnType<typeof getUserFromDb>>,
  undefined | null
>

type User = Exclude<
  Awaited<ReturnType<typeof getUserFromSession>>,
  undefined | null
>

function _getCurrentUser(options: {
  withFullUser: true
  redirectIfNotFound: true
}): Promise<FullUser>
function _getCurrentUser(options: {
  withFullUser: true
  redirectIfNotFound?: false
}): Promise<FullUser | null>
function _getCurrentUser(options: {
  withFullUser?: false
  redirectIfNotFound: true
}): Promise<User>
function _getCurrentUser(options?: {
  withFullUser: false
  redirectIfNotFound: false
}): Promise<User | null>

async function _getCurrentUser({
  withFullUser = false,
  redirectIfNotFound = false,
} = {}) {
  const user = await getUserFromSession(await cookies());
  if (user == null) {
    if (redirectIfNotFound) return redirect("/sign-in");
    return null;
  }

  const fullUser = withFullUser ? await getUserFromDb(user.id) : null

  if(withFullUser) {
    if(fullUser == null) throw new Error("User not found in database")
    return fullUser
  }

  return user;
}

export const getCurrentUser = cache(_getCurrentUser);

async function getUserFromDb(id: string) {
  return await db.query.UserTable.findFirst({
    columns: {name: true, id: true, role: true, email: true},
    where: eq(UserTable.id, id)
  })
}