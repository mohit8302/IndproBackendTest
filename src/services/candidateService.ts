import prisma from "../config/dbConfig";
import { techCorrectionMap } from "../data/techCorrectionMap";

export class CandidateService {
  // Method to get all candidates
  static async getAll() {
    return await prisma.candidate.findMany();
  }

  // Method to find a candidate by ID
  static async getById(id: number) {
    return await prisma.candidate.findUnique({
      where: { id: id },
    });
  }

  // Method to delete a candidate
  static async delete(id: number) {
    return await prisma.candidate.delete({
      where: { id: id },
    });
  }
}

// Helper function to parse candidateTechStack
const parseTechStack = (techStack: string) => {
  if (!techStack) return null;

  return techStack.split(",").map((tech) => {
    let trimmedTech = tech.trim();
    const [techName, experience] = trimmedTech.split("=");

    // Find and correct techName if needed
    Object.keys(techCorrectionMap).forEach(key => {
      if (techCorrectionMap[key].includes(techName)) {
        trimmedTech = key;
      }
    });

    if (experience) {
      const [years, months] = experience.split(".").map(Number);
      return {
        tech: trimmedTech,
        experience: {
          years: years || 0,
          months: months || 0,
        },
      };
    }
    return { tech: trimmedTech };
  });
};

export const upsertCandidate = async (candidateData: any) => {
  const updateData: any = {};
  const createData: any = {};

  const keys = [
    "name", "email", "description", "availability", "imageUrl", "videoUrl", "resumeUrl",
    "techStack", "experience", "expertise", "rating", "longTermCommitment", "isPrivate",
    "activities", "languages"
  ];

  keys.forEach(key => {
    if (candidateData.hasOwnProperty(key)) {
      switch (key) {
        case "techStack":
          updateData[key] = parseTechStack(String(candidateData[key])) || [];
          createData[key] = parseTechStack(String(candidateData[key])) || [];
          break;
        case "expertise":
          updateData[key] = String(candidateData[key]).split(",").map((e) => e.trim());
          createData[key] = String(candidateData[key]).split(",").map((e) => e.trim());
          break;
        case "longTermCommitment":
        case "isPrivate":
          updateData[key] = Boolean(candidateData[key]);
          createData[key] = Boolean(candidateData[key]);
          break;
        case "experience":
        case "rating":
          updateData[key] = Number(candidateData[key]);
          createData[key] = Number(candidateData[key]);
          break;
        default:
          updateData[key] = candidateData[key] ? String(candidateData[key]) : null;
          createData[key] = candidateData[key] ? String(candidateData[key]) : null;
      }
    }
  });

  await prisma.candidate.upsert({
    where: { email: String(candidateData.email) },
    update: updateData,
    create: createData,
  });
};
