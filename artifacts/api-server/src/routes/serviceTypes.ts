import { Router } from "express";
import { db, serviceTypesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/authMiddleware";

const router = Router();

// GET /api/service-types
router.get("/", requireAuth, async (req, res) => {
  const types = await db
    .select()
    .from(serviceTypesTable)
    .where(eq(serviceTypesTable.isActive, true));
  res.json(types);
});

export default router;
