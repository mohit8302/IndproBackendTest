import { Router, Request, Response } from "express";
import {
  approve,
  getCustomers,
  searchCustomer,
} from "../controllers/customerController";
const router = Router();

router.get("/", getCustomers);
router.post("/approve", approve);
router.post("/search", searchCustomer);

export default router;
