import type { PrismaClient } from '@prisma/client';
import { slugifyEntity } from '../utils/slug.js';

export class CompanyRepository {
  constructor(private readonly db: PrismaClient) {}

  async upsert(name: string): Promise<string> {
    const slug = slugifyEntity(name);
    const company = await this.db.company.upsert({
      where: { name },
      create: { name, slug },
      update: { slug },
    });
    return company.id;
  }
}
