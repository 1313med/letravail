import type { PrismaClient } from '@prisma/client';
import { slugifyEntity } from '../utils/slug.js';

export class TagRepository {
  constructor(private readonly db: PrismaClient) {}

  async upsertMany(names: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    for (const name of [...new Set(names.filter(Boolean))]) {
      const slug = slugifyEntity(name);
      const tag = await this.db.tag.upsert({
        where: { name },
        create: { name, slug },
        update: { slug },
      });
      map.set(name, tag.id);
    }
    return map;
  }
}
