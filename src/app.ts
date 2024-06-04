import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import candidateRoutes from "./api/routes/candidateRoutes";
import customerRoutes from "./api/routes/customerRoutes";
import bookingRoutes from "./api/routes/bookingRoutes";
import authRouter from "./api/routes/authRoutes";
import utilityRoues from "./api/routes/utilityRoutes";
import translateRoutes from './api/routes/translateRoutes';

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  'http://localhost:5173',
  'https://indpro.io',
  /\.indpro\.io$/
];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some((pattern) => pattern instanceof RegExp ? pattern.test(origin) : pattern === origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  methods: ['HEAD', 'OPTIONS', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Origin', 'Accept', 'Content-Type', 'Authorization'],
  credentials: true
};

app.set('trust proxy', true);

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/candidates", candidateRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/util", utilityRoues);
app.use('/api/translate', translateRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
