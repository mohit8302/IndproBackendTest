import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

import { AuthRequest } from "../routes/authRoutes";

export const getCustomers = async (req: Request, res: Response) => {
  const candidates = await prisma.customer.findMany();
  res.json(candidates);
};

export const approve = async (req: Request, res: Response) => {
  try {
    // Extract customer emails from the request body
    const { customer_emails } = req.body;

    // Validate the input: ensure customer_emails is provided
    if (!customer_emails || !Array.isArray(customer_emails)) {
      return res.status(400).json({
        error: "Invalid input. Please provide an array of customer emails.",
      });
    }

    // Update customer_approved_on for the provided emails
    await prisma.customer.updateMany({
      where: {
        email: { in: customer_emails },
        approvedOn: null, // Only update if not already approved
      },
      data: {
        approvedOn: new Date(), // Set to current date and time
      },
    });

    // Return success response
    return res
      .status(200)
      .json({ message: "Customers approved successfully." });
  } catch (error) {
    console.log(error);
    console.error("Error approving customers:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const searchCustomer = async (req: Request, res: Response) => {
  const { searchText } = req.body;
  try {
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          {
            name: {
              contains: searchText as string,
              mode: "insensitive",
            },
          },
          {
            email: {
              contains: searchText as string,
              mode: "insensitive",
            },
          },
          {
            companyName: {
              contains: searchText as string,
              mode: "insensitive",
            },
          },
        ],
      },
    });
    res.json(customers);
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while searching for customers" });
  }
};