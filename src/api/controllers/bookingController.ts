import { Request, Response } from 'express';
import multer from 'multer';
import s3 from '../../config/awsConfig';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import ExcelJS from 'exceljs';
import { format } from "date-fns";

const prisma = new PrismaClient();

// Configure multer to store files in memory
const storage = multer.memoryStorage();
export const upload = multer({ storage }).single('file');

const formatDate = (date: Date | null) => {
    return date ? format(date, "yyyy-MM-dd HH:mm") : null;
  };
  

export const book = async (req: Request, res: Response) => {
    const file = req.file;

    try {
        const candidateIds = req.body.candidateIds ? JSON.parse(req.body.candidateIds) : [];

        const newBooking = await prisma.booking.create({
            data: {
                name: req.body.bookingName,
                email: req.body.bookingEmail,
                phone: req.body.bookingPhone,
                message: req.body.bookingMessage || null,
                involvementId: parseInt(req.body.bookingInvolvementId, 10),
                customerId: parseInt(req.body.bookingCustomerId, 10),
            },
        });
        const id = newBooking.id;

        // Create BookedCandidates entries
        for (const candidateId of candidateIds) {
            await prisma.bookedCandidates.create({
                data: {
                    id,
                    candidateId: parseInt(candidateId, 10)
                },
            });
        }

        if (file) {
            const s3BucketResources = process.env.AWS_S3_BUCKET_NAME || '';
            const uploadParams = {
                Bucket: s3BucketResources,
                Key: `${uuidv4()}-${file.originalname}`,
                Body: file.buffer,
                ACL: 'public-read',
            };

            const data = await s3.upload(uploadParams).promise();
            await prisma.booking.update({
                where: { id: id },
                data: { fileAttachment: data.Location },
            });

            res.status(200).json({ message: 'File uploaded successfully', url: data.Location });
        } else {
            res.status(200).json({ message: 'No file uploaded, booking updated/created successfully' });
        }
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Error processing request', details: err });
    }
};


export const exportBookingsToExcel = async (req: Request, res: Response) => {
    try {
        const bookings = await prisma.booking.findMany({
            include: {
                customer: true,
                involvement: true,
                bookedCandidates: {
                    include: {
                        candidate: true
                    }
                }
            }
        });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Bookings');

        worksheet.columns = [
            { header: 'Customer ID', key: 'customerId', width: 15 },
            { header: 'Customer Name', key: 'customerName', width: 25 },
            { header: 'Company Name', key: 'customerCompanyName', width: 25 },
            { header: 'Customer Phone', key: 'customerPhone', width: 20 },
            { header: 'Customer Email', key: 'customerEmail', width: 30 },
            { header: 'Approval Date', key: 'customerApprovedOn', width: 20 },
            { header: 'Booking ID', key: 'bookingId', width: 15 },
            { header: 'BookedBy Name', key: 'bookingName', width: 25 },
            { header: 'BookedBy Phone', key: 'bookingPhone', width: 20 },
            { header: 'Message', key: 'bookingMessage', width: 30 },
            { header: 'File Attachment', key: 'bookingFileAttachment', width: 30 },
            { header: 'Involvement', key: 'bookingInvolvement', width: 25 },
            { header: 'Involvement Type', key: 'bookingInvolvementType', width: 25 },
            { header: 'Created On', key: 'bookingCreatedOn', width: 20 },
            { header: 'Candidates', key: 'bookingCandidates', width: 40 },
        ];

        bookings.forEach(booking => {
            worksheet.addRow({
                customerId: booking.customer.id,
                customerName: booking.customer.name,
                customerCompanyName: booking.customer.companyName,
                customerPhone: booking.customer.phone,
                customerEmail: booking.customer.email,
                customerApprovedOn: booking.customer.approvedOn,
                bookingId: booking.id,
                bookingName: booking.name,
                bookingPhone: booking.phone,
                bookingMessage: booking.message,
                bookingFileAttachment: booking.fileAttachment,
                bookingInvolvement: booking.involvement.name,
                bookingInvolvementType: booking.involvement.involvementType,
                bookingCreatedOn: formatDate(booking.createdOn),
                bookingCandidates: booking.bookedCandidates.map(bc => bc.candidate.email).join(', ')
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=bookings.xlsx');
        res.send(buffer);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};