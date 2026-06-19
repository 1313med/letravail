import type { PrismaClient } from '@prisma/client';
import { slugifyEntity } from '../utils/slug.js';

export class LocationRepository {
  constructor(private readonly db: PrismaClient) {}

  async upsert(city: string, country: string): Promise<string> {
    const existing = await this.db.location.findUnique({
      where: { city_country: { city, country } },
    });
    if (existing) return existing.id;

    let slug = slugifyEntity(`${city}-${country}`);
    const slugConflict = await this.db.location.findUnique({ where: { slug } });
    if (slugConflict) {
      slug = slugifyEntity(`${city}-${country}-${slugifyEntity(city).slice(0, 20)}`);
    }

    const location = await this.db.location.create({
      data: { city, country, slug },
    });
    return location.id;
  }
}
