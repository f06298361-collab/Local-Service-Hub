import { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface AuthenticatedRequest extends Request {
  user?: typeof usersTable.$inferSelect;
}

/**
 * Middleware: require a valid Clerk session, auto-create user if new.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Find or create user in our DB
    let [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, userId))
      .limit(1);

    if (!user) {
      // Create a minimal user record; profile update fills in the rest
      const [created] = await db
        .insert(usersTable)
        .values({
          clerkId: userId,
          email: `${userId}@pending.local`,
          firstName: "",
          lastName: "",
          role: "customer",
        })
        .returning();
      user = created;
    }

    if (!user.isActive) {
      res.status(403).json({ error: "Account suspended" });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    req.log?.error(err, "requireAuth error");
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Middleware: require admin or super_admin role.
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "super_admin")) {
    res.status(403).json({ error: "Forbidden: admin only" });
    return;
  }
  next();
}

/**
 * Middleware: require super_admin role exclusively.
 */
export function requireSuperAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user || req.user.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden: super admin only" });
    return;
  }
  next();
}
