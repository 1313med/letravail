const NON_JOB_URL_PATTERNS = [
  /particulier/i,
  /professionnel/i,
  /nos-offres/i,
  /offres-mobile/i,
  /boutique\./i,
  /recharges?\//i,
  /forfait/i,
  /cartes?\//i,
  /comptes?\//i,
  /financement/i,
  /epargn/i,
  /bancassurance/i,
  /factures?-impots/i,
  /mentions?-legales/i,
  /a-propos/i,
  /apropos/i,
  /politique/i,
  /confidentialit/i,
  /protection-des-donnees/i,
  /cookies/i,
  /cgu/i,
  /reclamation/i,
  /contact/i,
  /aide/i,
  /login/i,
  /identifier/i,
  /inscription/i,
  /createprofile/i,
  /privacy/i,
  /legal/i,
  /faq/i,
  /news/i,
  /actualites/i,
  /blog/i,
  /facebook|twitter|linkedin|instagram|youtube/i,
  /#$/,
  /\?monthly_payment=/i,
  /offre-fonctionnaires/i,
  /offre-intelak/i,
  /gerer-mes-comptes/i,
  /payer-factures/i,
];

const JOB_URL_PATTERNS = [
  /offre-emploi/i,
  /\/requisition\/\d+/i,
  /\/jobs?\//i,
  /\/job\//i,
  /\/poste/i,
  /\/vacanc/i,
  /front-offres/i,
  /recrutement\.[a-z0-9-]+\.[a-z]+\/\d+_/i,
  /emploi-public\.ma\/offre/i,
  /anapec\.org.*offre/i,
  /rekrute\.com\/offre/i,
  /csod\.com.*requisition/i,
  /careers\.dxc\.com\/job/i,
  /cgi\.com.*job/i,
  /capgemini\.com.*job/i,
];

const NON_JOB_TITLE_PATTERNS = [
  /^accueil$/i,
  /^contact$/i,
  /^a propos$/i,
  /^à propos$/i,
  /^mentions? l[eé]gales$/i,
  /^informations? l[eé]gales$/i,
  /^besoin d.?aide$/i,
  /^en savoir plus$/i,
  /^consultez/i,
  /^nos offres/i,
  /^candidature spontan[eé]e$/i,
  /^se connecter$/i,
  /^cr[eé]er un profil$/i,
  /^connexion/i,
  /^revenir à/i,
  /^r[eé]initialiser$/i,
  /^comptes?$/i,
  /^cartes?$/i,
  /^forfait/i,
  /^recharge/i,
  /^financer/i,
  /^epargner/i,
  /^bancassurance/i,
  /^payer mes/i,
  /^protection des donn[eé]es/i,
  /^politique de/i,
  /^cookies$/i,
  /^g[eé]rer mes comptes$/i,
  /^offre fonctionnaires$/i,
  /^intelak/i,
  /^\d+$/,
  /^page \d+$/i,
];

const JOB_TITLE_HINTS =
  /\b(charg[eé]|responsable|manager|analyste|ing[eé]nieur|d[eé]veloppeur|consultant|directeur|assistant|technicien|auditeur|contr[oô]leur|gestionnaire|conseiller|commercial|chef|expert|architecte|product owner|stage|stagiaire|cdi|cdd)\b/i;

export function isLikelyJobUrl(url: string): boolean {
  if (NON_JOB_URL_PATTERNS.some((p) => p.test(url))) return false;
  return JOB_URL_PATTERNS.some((p) => p.test(url));
}

export function isLikelyJobTitle(title: string): boolean {
  const cleaned = title.trim();
  if (cleaned.length < 5 || cleaned.length > 200) return false;
  if (NON_JOB_TITLE_PATTERNS.some((p) => p.test(cleaned))) return false;
  if (/^\d+$/.test(cleaned)) return false;
  return JOB_TITLE_HINTS.test(cleaned) || /[A-Z]{2,}.*[A-Z]{2,}/.test(cleaned);
}

/** LinkedIn titles are often in English — skip French-keyword requirement. */
export function isLikelyLinkedInJobTitle(title: string): boolean {
  const cleaned = title.trim();
  if (cleaned.length < 4 || cleaned.length > 200) return false;
  if (NON_JOB_TITLE_PATTERNS.some((p) => p.test(cleaned))) return false;
  if (/^\d+$/.test(cleaned)) return false;
  if (/^(view|see|show|linkedin)\b/i.test(cleaned)) return false;
  return true;
}

export function isLikelyJobPosting(title: string, url: string): boolean {
  return isLikelyJobUrl(url) && isLikelyJobTitle(title);
}

export function filterJobCandidates<
  T extends { title: string; applicationUrl: string },
>(items: T[]): T[] {
  return items.filter((item) => isLikelyJobPosting(item.title, item.applicationUrl));
}
