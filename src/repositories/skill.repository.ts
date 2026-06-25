import type { PrismaClient } from '@prisma/client';
import type { JobSkillInput } from '../types/job.js';
import { slugifyEntity } from '../utils/slug.js';

export class SkillRepository {
  constructor(private readonly db: PrismaClient) {}

  async upsertMany(skills: JobSkillInput[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();

    for (const skill of skills) {
      const slug = skill.slug || slugifyEntity(skill.name);
      const record = await this.db.skill.upsert({
        where: { slug },
        create: {
          name: skill.name,
          slug,
          category: skill.category,
        },
        update: {
          name: skill.name,
          ...(skill.category && { category: skill.category }),
        },
      });
      map.set(slug, record.id);
    }

    return map;
  }

  async linkToJob(
    jobId: string,
    skills: JobSkillInput[],
    skillIdMap: Map<string, string>,
  ): Promise<void> {
    await this.db.jobSkill.deleteMany({ where: { jobId } });

    const data = skills
      .map((skill) => {
        const slug = skill.slug || slugifyEntity(skill.name);
        const skillId = skillIdMap.get(slug);
        if (!skillId) return null;
        return { jobId, skillId, confidence: skill.confidence };
      })
      .filter((row): row is { jobId: string; skillId: string; confidence: number } => row !== null);

    if (data.length > 0) {
      await this.db.jobSkill.createMany({ data });
    }
  }

  async updateProfessionSkills(profession: string, skillSlugs: string[]): Promise<void> {
    for (const slug of skillSlugs) {
      const skill = await this.db.skill.findUnique({ where: { slug } });
      if (!skill) continue;

      await this.db.professionSkill.upsert({
        where: { profession_skillId: { profession, skillId: skill.id } },
        create: { profession, skillId: skill.id, jobCount: 1 },
        update: { jobCount: { increment: 1 } },
      });
    }
  }
}
