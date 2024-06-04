import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import { authenticateToken, checkApproval } from "./authRoutes";
import { getCandidates, getCandidate, filterCandidates, importCandidates, searchCandidates, exportCandidatesToExcel, uploadCandidateResources } from "../controllers/candidateController";

const prisma = new PrismaClient();
const router = Router();
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 1 * 1024 * 1024 * 1024 } // 1 GB limit
});

router.get("/all", async (req: Request, res: Response) => {
  const candidates = await prisma.candidate.findMany();
  res.json(candidates);
});

router.get("/", authenticateToken, checkApproval, getCandidates);
router.get('/:id', authenticateToken, checkApproval, getCandidate);

router.post("/search", authenticateToken, checkApproval, searchCandidates);
router.post("/filter", authenticateToken, checkApproval, filterCandidates);

router.post("/import", upload.single("file"), importCandidates);
router.post('/export/excel', exportCandidatesToExcel);
router.post('/upload-resources', upload.single('file'), uploadCandidateResources);

export default router;
