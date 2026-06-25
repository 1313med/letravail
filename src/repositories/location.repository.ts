import type { PrismaClient } from '@prisma/client';
import { slugifyEntity } from '../utils/slug.js';

export interface LocationMeta {
  region?: string;
  canonicalCity?: string;
}

export class LocationRepository {
  constructor(private readonly db: PrismaClient) {}

  async upsert(city: string, country: string, meta?: LocationMeta): Promise<string> {
    const existing = await this.db.location.findUnique({
      where: { city_country: { city, country } },
    });

    if (existing) {
      if (meta?.region || meta?.canonicalCity) {
        await this.db.location.update({
          where: { id: existing.id },
          data: {
            ...(meta.region && { region: meta.region }),
            ...(meta.canonicalCity && { canonicalCity: meta.canonicalCity }),
          },
        });
      }
      return existing.id;
    }

    let slug = slugifyEntity(`${city}-${country}`);
    const slugConflict = await this.db.location.findUnique({ where: { slug } });
    if (slugConflict) {
      slug = slugifyEntity(`${city}-${country}-${slugifyEntity(city).slice(0, 20)}`);
    }

    const location = await this.db.location.create({
      data: {
        city,
        country,
        slug,
        region: meta?.region,
        canonicalCity: meta?.canonicalCity ?? city,
      },
    });
    return location.id;
  }
}
