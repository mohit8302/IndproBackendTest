import { Router, Request, Response } from "express";
import { getInvolvements, getExpertiseAndTechnology } from "../controllers/utilityController";

const router = Router();

router.get("/data", getExpertiseAndTechnology);
router.get("/involvements", getInvolvements);

export default router;
