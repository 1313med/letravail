import type { PrismaClient } from '@prisma/client';
import { getAllCanonicalAliases } from '../platform/company-resolver.js';

export class CompanyAliasRepository {
  constructor(private readonly db: PrismaClient) {}

  async seedCanonicalAliases(): Promise<number> {
    let seeded = 0;
    const aliases = getAllCanonicalAliases();

    for (const { canonical, alias } of aliases) {
      const company = await this.db.company.findUnique({ where: { name: canonical } });
      if (!company) continue;

      const key = alias.toLowerCase().trim();
      try {
        await this.db.companyAlias.upsert({
          where: { alias: key },
          create: { alias: key, companyId: company.id, confidence: 1, isManual: false },
          update: { companyId: company.id },
        });
        seeded++;
      } catch {
        /* skip conflicts */
      }
    }
    return seeded;
  }

  async findCompanyIdByAlias(alias: string): Promise<string | null> {
    const record = await this.db.companyAlias.findUnique({
      where: { alias: alias.toLowerCase().trim() },
    });
    return record?.companyId ?? null;
  }
}
