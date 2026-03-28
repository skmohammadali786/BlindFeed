import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import postsRouter from "./posts";
import commentsRouter from "./comments";
import storageRouter from "./storage";
import notificationsRouter from "./notifications";
import reportsRouter from "./reports";
import ratingsRouter from "./ratings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(postsRouter);
router.use(commentsRouter);
router.use(storageRouter);
router.use(notificationsRouter);
router.use(reportsRouter);
router.use(ratingsRouter);

export default router;
