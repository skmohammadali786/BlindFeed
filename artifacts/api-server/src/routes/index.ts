import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import postsRouter from "./posts";
import commentsRouter from "./comments";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(postsRouter);
router.use(commentsRouter);
router.use(storageRouter);

export default router;
