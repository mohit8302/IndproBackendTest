import { Request, Response } from "express";
import { upsertCandidate } from "../../services/candidateService";
import xlsx from "xlsx";
import ExcelJS from "exceljs";
import { PrismaClient, Candidate } from "@prisma/client";
import { AuthRequest } from "../routes/authRoutes";
import { Decimal } from "@prisma/client/runtime/library";
import { format } from "date-fns";
import unzipper from "unzipper";
import NodeCache from "node-cache";
import path from "path";
import fs from "fs";
import s3 from "../../config/awsConfig";
import { emailToFilename, getRandomString } from "../../utils/utilities";

const prisma = new PrismaClient();

const cache = new NodeCache({ stdTTL: 300, checkperiod: 150 });

export const getCandidates = async (req: AuthRequest, res: Response) => {
  try {
    const cacheKey = req.user?.isApproved
      ? "approvedCandidates"
      : "publicCandidates";
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    let candidates;

    if (req.user?.isApproved) {
      // Show all candidates if user is approved
      candidates = await prisma.candidate.findMany();
    } else {
      // Show only non-private candidates for unauthenticated or non-approved users
      candidates = await prisma.candidate.findMany({
        where: {
          isPrivate: false,
        },
      });
    }
    cache.set(cacheKey, candidates);

    res.json(candidates);
  } catch (error) {
    console.error("Error fetching candidates:", error);
    res.status(500).send("Error fetching candidates");
  }
};

export const importCandidates = async (req: Request, res: Response) => {
  if (!(req as any).file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const workbook = xlsx.readFile((req as any).file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);

    for (const row of rows) {
      await upsertCandidate(row);
    }

    res.status(200).json({ message: "Candidates imported successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error processing file" });
  }
};

// [caching[min=5]]
const getall = async () => {
  return await prisma.candidate.findMany();
};
interface FilterParams {
  technology?: string[];
  experience?: Decimal;
  expertise?: string[];
}
interface TechStack {
  tech: string;
  experience: {
    years: number;
    months: number;
  };
}
interface CandidateWithBestOption extends Candidate {
  bestChoice?: boolean;
}

export const getCandidate = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    // Validate the ID
    const candidateId = parseInt(id, 10);
    if (isNaN(candidateId)) {
      return res.status(400).json({ error: 'Invalid candidate ID' });
    }

    // Fetch the candidate details from the database
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Respond with the candidate details
    return res.json({ candidate });
  } catch (error) {
    console.error('Error fetching candidate:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const filterCandidates = async (req: AuthRequest, res: Response) => {
  const { technology, experience, expertise }: FilterParams = req.body;

  let filteredCollection: CandidateWithBestOption[] = [];

  // Fetch candidates based on user approval status
  let candidates: CandidateWithBestOption[];
  if (!req.user?.isApproved) {
    candidates = (await prisma.candidate.findMany({
      where: { isPrivate: false },
    })) as CandidateWithBestOption[];
  } else {
    candidates =
      (await prisma.candidate.findMany()) as CandidateWithBestOption[];
  }

  const technologyFilterSelected = technology && technology.length > 0;
  const expertiseFilterSelected = expertise && expertise.length > 0;
  const experienceFilterSelected = experience && Array.isArray(experience) && experience.length > 0;

  // Function to check if candidate experience matches any of the provided ranges
  const matchesExperience = (
    candidateExperienceValue: number,
    experienceRanges: number[]
  ): boolean => {
    return experienceRanges.some((exp) => {
      const min = exp - 1;
      const max = exp + 1;
      return exp == 20 ? candidateExperienceValue > min : candidateExperienceValue > min && candidateExperienceValue < max;
    });
  };

  // Filter candidates based on technology, experience, expertise, and rating
  for (const candidate of candidates) {
    let candidateTechStack: TechStack[] | undefined;
    if (Array.isArray(candidate.techStack)) {
      candidateTechStack = candidate.techStack as unknown as TechStack[];
    } else {
      candidateTechStack = undefined;
    }

    const technologyMatched = technologyFilterSelected
      ? technology.some((tech: string) =>
        candidateTechStack?.some((ts) => ts.tech === tech)
      )
      : true;

    const candidateExpertise = candidate.expertise as string[] | undefined;
    const expertiseMatched = expertiseFilterSelected
      ? expertise.some((exp: string) => candidateExpertise?.includes(exp))
      : true;

    const candidateExperience = Number(candidate.experience);
    const experienceMatched = experienceFilterSelected
      ? matchesExperience(candidateExperience, experience)
      : true;

    // Candidate should match all filters to be marked as bestChoice
    if (technologyMatched && experienceMatched && expertiseMatched && candidate.rating >= 4) {
      candidate.bestChoice = true;
    } else {
      candidate.bestChoice = false;
    }

    // Candidate should match all the filters
    if (technologyMatched && experienceMatched && expertiseMatched) {
      filteredCollection.push(candidate);
    }
  }

  filteredCollection = filteredCollection.sort((a, b) => {
    if (a.bestChoice && !b.bestChoice) {
      return -1;
    } else if (!a.bestChoice && b.bestChoice) {
      return 1;
    } else {
      return 0;
    }
  });

  return res.json({ count: filteredCollection.length, candidates: filteredCollection });
};

export const searchCandidates = async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  const filterConditions: any = {};

  // Name search filter
  if (name) {
    filterConditions.name = {
      contains: name,
      mode: "insensitive", // Case-insensitive search
    };
  }

  // Check if the user is authenticated and approved
  if (!req.user || !req.user.isApproved) {
    // If not authenticated or not approved, only show public candidates
    filterConditions.isPrivate = false;
  }
  try {
    const filteredCandidates = await prisma.candidate.findMany({
      where: filterConditions,
    });
    res.json(filteredCandidates);
  } catch (error) {
    console.error("Error fetching candidates:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const stringifyTechStack = (techStack: any) => {
  if (!techStack) return null;

  return techStack
    .map((tech: any) => {
      if (tech.experience) {
        const { years, months } = tech.experience;
        return `${tech.tech}=${years}.${months}`;
      }
      return tech.tech;
    })
    .join(", ");
};

const formatDate = (date: Date | null) => {
  return date ? format(date, "yyyy-MM-dd HH:mm") : null;
};

export const exportCandidatesToExcel = async (req: Request, res: Response) => {
  try {
    const candidates = await prisma.candidate.findMany({
      orderBy: {
        id: 'asc'
      }
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Candidates");

    worksheet.columns = [
      { header: "id", key: "id", width: 15 },
      { header: "name", key: "name", width: 25 },
      { header: "email", key: "email", width: 30 },
      { header: "description", key: "description", width: 30 },
      { header: "availability", key: "availability", width: 20 },
      { header: "imageUrl", key: "imageUrl", width: 30 },
      { header: "videoUrl", key: "videoUrl", width: 30 },
      { header: "resumeUrl", key: "resumeUrl", width: 30 },
      { header: "techStack", key: "techStack", width: 30 },
      { header: "experience", key: "experience", width: 20 },
      { header: "expertise", key: "expertise", width: 30 },
      { header: "rating", key: "rating", width: 15 },
      { header: "longTermCommitment", key: "longTermCommitment", width: 20 },
      { header: "isPrivate", key: "isPrivate", width: 10 },
      { header: "activities", key: "activities", width: 30 },
      { header: "languages", key: "languages", width: 30 },
      { header: "createdOn", key: "createdOn", width: 20 },
      { header: "modifiedOn", key: "modifiedOn", width: 20 },
      { header: "removedOn", key: "removedOn", width: 20 },
    ];

    candidates.forEach((candidate) => {
      worksheet.addRow({
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        description: candidate.description,
        availability: candidate.availability,
        imageUrl: candidate.imageUrl,
        videoUrl: candidate.videoUrl,
        resumeUrl: candidate.resumeUrl,
        techStack: stringifyTechStack(candidate.techStack),
        experience: parseFloat(candidate.experience.toFixed(2)),
        expertise: candidate.expertise.join(", "),
        rating: candidate.rating,
        longTermCommitment: candidate.longTermCommitment,
        isPrivate: candidate.isPrivate,
        activities: candidate.activities,
        languages: candidate.languages,
        createdOn: formatDate(candidate.createdOn),
        modifiedOn: formatDate(candidate.modifiedOn),
        removedOn: formatDate(candidate.removedOn),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=candidates.xlsx"
    );
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const fileTypes = {
  videoFileTypes: [
    "MP4",
    "AVI",
    "MOV",
    "WMV",
    "MKV",
    "FLV",
    "WEBM",
    "MPEG",
    "3GP",
    "OGG",
  ],
  profileImageFileTypes: [
    "JPG",
    "JPEG",
    "PNG",
    "GIF",
    "BMP",
    "TIFF",
    "WEBP",
    "SVG",
  ],
  resumeFileTypes: ["DOC", "DOCX", "PDF", "RTF", "TXT", "ODT", "HTML"],
};

const getFileTypeKey = (
  extension: string
): "imageUrl" | "videoUrl" | "resumeUrl" | null => {
  const ext = extension.toUpperCase();
  if (fileTypes.videoFileTypes.includes(ext)) {
    return "videoUrl";
  } else if (fileTypes.profileImageFileTypes.includes(ext)) {
    return "imageUrl";
  } else if (fileTypes.resumeFileTypes.includes(ext)) {
    return "resumeUrl";
  }
  return null;
};

export const uploadCandidateResources = async (req: Request, res: Response) => {
  const uploadResults: string[] = [];
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).send("No file uploaded");
    }

    const zip = fs
      .createReadStream(file.path)
      .pipe(unzipper.Parse({ forceStream: true }));

    for await (const entry of zip) {
      const fileName = entry.path;
      const fileExtension = path.extname(fileName).substring(1);
      const id = path.basename(fileName, path.extname(fileName));
      const fileTypeKey = getFileTypeKey(fileExtension);

      if (fileTypeKey) {
        const candidate = await prisma.candidate.findUnique({
          where: { id: parseInt(id) },
        });

        if (candidate) {
          const randomString = getRandomString(4);
          const params = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: `candidates/${emailToFilename(candidate.email)}_${randomString}${candidate.id}.${fileExtension}`,
            Body: entry,
            ContentType: `application/octet-stream`,
            ACL: "public-read",
          };

          try {
            const uploadResult = await s3
              .upload(params as AWS.S3.PutObjectRequest)
              .promise();
            const updateData: { [key: string]: string } = {};
            updateData[fileTypeKey] = uploadResult.Location.replace(
              `s3.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_S3_BUCKET_NAME}`,
              `${process.env.CANDIDATES_FILES_URL}`
            );

            await prisma.candidate.update({
              where: { id: parseInt(id) },
              data: updateData,
            });
            uploadResults.push(
              `${fileName} - candidate ${fileTypeKey} uploaded`
            );
          } catch (error) {
            console.error(`Error uploading ${fileName}:`, error);
            uploadResults.push(`${fileName} - error uploading ${fileTypeKey}`);
          }
        } else {
          entry.autodrain();
          uploadResults.push(`${fileName} - candidate not found`);
        }
      } else {
        entry.autodrain();
        uploadResults.push(`${fileName} - unsupported file type`);
      }
    }

    res.status(200).json(uploadResults);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) {
          console.error(`Error deleting file`, err);
        } else {
          console.log(`Uploaded zip file deleted successfully`);
        }
      });
    }
  }
};
