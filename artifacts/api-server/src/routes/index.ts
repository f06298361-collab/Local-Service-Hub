import { Router } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import driversRouter from "./drivers";
import tripsRouter from "./trips";
import vehiclesRouter from "./vehicles";
import notificationsRouter from "./notifications";
import serviceTypesRouter from "./serviceTypes";
import adminRouter from "./admin";

const router = Router();

router.use(healthRouter);
router.use("/users", usersRouter);
router.use("/drivers", driversRouter);
router.use("/trips", tripsRouter);
router.use("/vehicles", vehiclesRouter);
router.use("/notifications", notificationsRouter);
router.use("/service-types", serviceTypesRouter);
router.use("/admin", adminRouter);

export default router;
