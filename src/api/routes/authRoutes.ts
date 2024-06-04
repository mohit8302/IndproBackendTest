import express, { Request, Response, NextFunction } from "express";
import { z } from "zod";
import jwt, { JwtPayload } from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import router from "./candidateRoutes";
import { capitalizeFirstLetter } from "../../utils/utilities";
require("dotenv").config();

const authRouter = express.Router();
const prisma = new PrismaClient();

// Define the schema for signup input validation
const signupSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  company_name: z.string(),
  password: z.string().min(6),
});
const signInSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Secret key for JWT token generation (replace this with your actual secret)
const JWT_SECRET = "indpro123";
const COOKIE_NAME = "token";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
};

// Signup route
authRouter.post("/signup", async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { name, email, company_name, password } = signupSchema.parse(
      req.body
    );

    // Check if the user with the provided email already exists
    const existingUser = await prisma.customer.findFirst({
      where: {
        email: email,
      },
    });
    if (existingUser) {
      return res
        .status(409)
        .json({ error: "User with this email already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in database
    const newUser = await prisma.customer.create({
      data: {
        name: name,
        email: email,
        companyName: company_name,
        password: hashedPassword,
      },
    });

    // Generate JWT token
    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, {
      expiresIn: "15d",
    });

    // Send token in response
    res.status(200).cookie(COOKIE_NAME, token, COOKIE_OPTIONS).json({ token });
  } catch (error) {
    // Input validation failed
    if (error instanceof z.ZodError) {
      const { errors } = error;
      const combinedErrors = errors
        .map(err => {
          const errorPath = err.path.length > 0 ? capitalizeFirstLetter(err.path[0] as string) + ': ' : '';
          return `${errorPath}${err.message}`;
        })
        .join('. ');
    
      return res.status(400).json({ error: combinedErrors, details: errors });
    }
    // Other errors
    console.error("Error while signing up:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

authRouter.post("/signin", async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { email, password } = signInSchema.parse(req.body);

    // Find the user by email
    const user = await prisma.customer.findFirst({
      where: { email: email },
    });

    // If user doesn't exist or password doesn't match, return error
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const customer = {
      id: user.id,
      name: user.name,
      email: user.email,
      companyName: user.companyName,
      approvedOn: user.approvedOn,
      phone: user.phone,
    };

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "15d",
    });

    // Send token in response
    res
      .status(200)
      .cookie(COOKIE_NAME, token, COOKIE_OPTIONS)
      .json({ token, customer });
  } catch (error) {
    // Input validation failed
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Invalid input", details: error.errors });
    }
    // Other errors
    console.error("Error while signing in:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

authRouter.post("/logout", (req: Request, res: Response) => {
  return res
    .clearCookie(COOKIE_NAME, COOKIE_OPTIONS)
    .json({ message: "Logged out successfully" });
});

// get token details
authRouter.get("/user", async (req: Request, res: Response) => {
  const token = getToken(req);
  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    // Fetch user details from the database using the user ID
    const user = await prisma.customer.findUnique({
      where: { id: decoded.userId },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Send user details in the response
    const userDetails = {
      id: user.id,
      name: user.name,
      email: user.email,
      companyName: user.companyName,
      approvedOn: user.approvedOn,
      phone: user.phone,
    };

    res.status(200).json(userDetails);
  } catch (error) {
    res.status(401).json({ message: "Invalid token", error });
  }
});

// Middleware to authenticate token

// Define AuthRequest to extend Request and include user property
export interface AuthRequest extends Request {
  user?: {
    userId: number;
    isApproved?: boolean;
  };
}
export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  let token = getToken(req);
  if (!token) {
    console.log("No token provided");
    return next();
  }

  jwt.verify(
    token,
    JWT_SECRET as string,
    (err: Error | null, decoded: string | JwtPayload | undefined) => {
      if (err || !decoded) {
        console.log("Token verification failed", err);
        return next();
      }
      req.user = decoded as { userId: number };
      next();
    }
  );
};

export const checkApproval = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || !req.user.userId) {
    console.log("No user found in request or user ID is missing");
    return next();
  }

  try {
    const user = await prisma.customer.findUnique({
      where: { id: req.user.userId },
    });

    if (!user || !user.approvedOn) {
      console.log("User not approved or does not exist");
      return next();
    }

    req.user.isApproved = true;
    next();
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export default authRouter;
function getToken(req: AuthRequest) {
  let token = null;
  const authorization = req.headers["authorization"];
  if (authorization) {
    const authorizationArray = authorization.split(" ");
    if (authorizationArray.length === 2) {
      token = authorizationArray[1];
    }
  }
  return token;
}
