import { Request, Response } from "express";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 300, checkperiod: 150 });

interface Experience {
  years: number;
  months: number;
}

interface TechStack {
  tech: string;
  experience: Experience;
}

interface Candidate {
  expertise: string[] | null;
  techStack: string | TechStack[] | null;
}

export const getExpertiseAndTechnology = async (
  req: Request,
  res: Response
) => {
  try {
    const cacheKey = "expertiseAndTechnology";
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    const candidates: Candidate[] = await prisma.candidate.findMany({
      select: {
        expertise: true,
        techStack: true,
      },
    });

    // Extract and collect distinct expertise and technologies
    const expertiseSet = new Set<string>();
    const techSet = new Set<string>();

    candidates.forEach((candidate: Candidate) => {
      // Collect expertise
      if (candidate.expertise) {
        candidate.expertise.forEach((expertise: string) => {
          expertiseSet.add(expertise);
        });
      }

      // Collect technologies
      if (candidate.techStack) {
        let techStack: TechStack[];
        if (typeof candidate.techStack === "string") {
          techStack = JSON.parse(candidate.techStack);
        } else {
          techStack = candidate.techStack;
        }
        techStack.forEach((tech: TechStack) => {
          techSet.add(tech.tech);
        });
      }
    });

    // Convert sets to arrays
    const distinctExpertise = Array.from(expertiseSet).sort();
    const distinctTechnologies = Array.from(techSet).sort();
    const response = {
      expertise: distinctExpertise,
      tech: distinctTechnologies,
    };
    cache.set(cacheKey, response);

    // Send response
    res
      .status(200)
      .json({ expertise: distinctExpertise, tech: distinctTechnologies });
  } catch (error) {
    console.error("Error fetching expertise and technologies:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

interface Involvement {
  id: number;
  name: string;
  involvementType: string;
}

export const getInvolvements = async (req: Request, res: Response) => {
  try {
    // Fetch all involvements from the database
    const involvements = await prisma.involvement.findMany({
      select: {
        id: true,
        name: true,
        involvementType: true,
      },
    });

    // Format the response to match the example output
    const formattedInvolvements = involvements.map((inv: Involvement) => ({
      id: inv.id,
      name: inv.name,
      type: inv.involvementType,
    }));

    // Send response
    res.status(200).json(formattedInvolvements);
  } catch (error) {
    console.error("Error fetching involvements:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
