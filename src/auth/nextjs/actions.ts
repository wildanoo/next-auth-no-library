"use server"

import { z } from "zod"
import { redirect } from "next/navigation"
import { signInSchema, signUpSchema } from "./schemas"
import { generateSalt, hashPassword } from "../core/passwordHasher"
import { db } from "@/drizzle/db"
import { UserTable } from "@/drizzle/schema"
import { eq } from "drizzle-orm"

export async function signIn(unsafeData: z.infer<typeof signInSchema>) {
  const { success, data } = signInSchema.safeParse(unsafeData)

  if (!success) return "Unable to log you in"

  redirect("/")
}

export async function signUp(unsafeData: z.infer<typeof signUpSchema>) {
  const { success, data } = signUpSchema.safeParse(unsafeData)

  if (!success) return "Unable to create account"

  const existingUser = await db.query.UserTable.findFirst({
    where: eq(UserTable.email, data.email)
  })

  if(existingUser != null) return "Account already exist for this email"

  const hashedPassword = await hashPassword(data.password, generateSalt())

  redirect("/")
}

export async function logOut() {
  redirect("/")
}
