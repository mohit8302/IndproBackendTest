import express from 'express';
import { upload, book, exportBookingsToExcel } from '../controllers/bookingController';

const router = express.Router();

router.post('/book', upload, book);
router.post('/export/excel', exportBookingsToExcel);

export default router;
