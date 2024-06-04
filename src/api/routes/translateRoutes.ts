import { Router } from 'express';
import { translateTexts } from '../controllers/translateController';

const router = Router();

router.post('/', translateTexts);

export default router;
