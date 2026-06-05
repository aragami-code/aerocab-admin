// Référentiel pays (ISO 3166-1 alpha-2) pour le sélecteur du wizard.
// Le drapeau emoji est calculé depuis le code (indicateurs régionaux) — pas stocké.
// name = FR, dial = indicatif E.164, currency = ISO 4217.

export interface CountryInfo {
  code: string;
  name: string;
  dial: string;
  currency: string;
}

/** Drapeau emoji depuis un code pays 2 lettres (ex. 'CM' → 🇨🇲). */
export function flagEmoji(code: string): string {
  if (!code || code.length !== 2) return '🏳️';
  return code
    .toUpperCase()
    .replace(/[A-Z]/g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

export const COUNTRIES: CountryInfo[] = [
  // ── Afrique ──
  { code: 'DZ', name: 'Algérie', dial: '+213', currency: 'DZD' },
  { code: 'AO', name: 'Angola', dial: '+244', currency: 'AOA' },
  { code: 'BJ', name: 'Bénin', dial: '+229', currency: 'XOF' },
  { code: 'BW', name: 'Botswana', dial: '+267', currency: 'BWP' },
  { code: 'BF', name: 'Burkina Faso', dial: '+226', currency: 'XOF' },
  { code: 'BI', name: 'Burundi', dial: '+257', currency: 'BIF' },
  { code: 'CM', name: 'Cameroun', dial: '+237', currency: 'XAF' },
  { code: 'CV', name: 'Cap-Vert', dial: '+238', currency: 'CVE' },
  { code: 'CF', name: 'Centrafrique', dial: '+236', currency: 'XAF' },
  { code: 'TD', name: 'Tchad', dial: '+235', currency: 'XAF' },
  { code: 'KM', name: 'Comores', dial: '+269', currency: 'KMF' },
  { code: 'CG', name: 'Congo-Brazzaville', dial: '+242', currency: 'XAF' },
  { code: 'CD', name: 'RD Congo', dial: '+243', currency: 'CDF' },
  { code: 'CI', name: "Côte d'Ivoire", dial: '+225', currency: 'XOF' },
  { code: 'DJ', name: 'Djibouti', dial: '+253', currency: 'DJF' },
  { code: 'EG', name: 'Égypte', dial: '+20', currency: 'EGP' },
  { code: 'GQ', name: 'Guinée Équatoriale', dial: '+240', currency: 'XAF' },
  { code: 'ER', name: 'Érythrée', dial: '+291', currency: 'ERN' },
  { code: 'SZ', name: 'Eswatini', dial: '+268', currency: 'SZL' },
  { code: 'ET', name: 'Éthiopie', dial: '+251', currency: 'ETB' },
  { code: 'GA', name: 'Gabon', dial: '+241', currency: 'XAF' },
  { code: 'GM', name: 'Gambie', dial: '+220', currency: 'GMD' },
  { code: 'GH', name: 'Ghana', dial: '+233', currency: 'GHS' },
  { code: 'GN', name: 'Guinée', dial: '+224', currency: 'GNF' },
  { code: 'GW', name: 'Guinée-Bissau', dial: '+245', currency: 'XOF' },
  { code: 'KE', name: 'Kenya', dial: '+254', currency: 'KES' },
  { code: 'LS', name: 'Lesotho', dial: '+266', currency: 'LSL' },
  { code: 'LR', name: 'Libéria', dial: '+231', currency: 'LRD' },
  { code: 'LY', name: 'Libye', dial: '+218', currency: 'LYD' },
  { code: 'MG', name: 'Madagascar', dial: '+261', currency: 'MGA' },
  { code: 'MW', name: 'Malawi', dial: '+265', currency: 'MWK' },
  { code: 'ML', name: 'Mali', dial: '+223', currency: 'XOF' },
  { code: 'MR', name: 'Mauritanie', dial: '+222', currency: 'MRU' },
  { code: 'MU', name: 'Maurice', dial: '+230', currency: 'MUR' },
  { code: 'MA', name: 'Maroc', dial: '+212', currency: 'MAD' },
  { code: 'MZ', name: 'Mozambique', dial: '+258', currency: 'MZN' },
  { code: 'NA', name: 'Namibie', dial: '+264', currency: 'NAD' },
  { code: 'NE', name: 'Niger', dial: '+227', currency: 'XOF' },
  { code: 'NG', name: 'Nigeria', dial: '+234', currency: 'NGN' },
  { code: 'RW', name: 'Rwanda', dial: '+250', currency: 'RWF' },
  { code: 'ST', name: 'Sao Tomé-et-Principe', dial: '+239', currency: 'STN' },
  { code: 'SN', name: 'Sénégal', dial: '+221', currency: 'XOF' },
  { code: 'SC', name: 'Seychelles', dial: '+248', currency: 'SCR' },
  { code: 'SL', name: 'Sierra Leone', dial: '+232', currency: 'SLE' },
  { code: 'SO', name: 'Somalie', dial: '+252', currency: 'SOS' },
  { code: 'ZA', name: 'Afrique du Sud', dial: '+27', currency: 'ZAR' },
  { code: 'SS', name: 'Soudan du Sud', dial: '+211', currency: 'SSP' },
  { code: 'SD', name: 'Soudan', dial: '+249', currency: 'SDG' },
  { code: 'TZ', name: 'Tanzanie', dial: '+255', currency: 'TZS' },
  { code: 'TG', name: 'Togo', dial: '+228', currency: 'XOF' },
  { code: 'TN', name: 'Tunisie', dial: '+216', currency: 'TND' },
  { code: 'UG', name: 'Ouganda', dial: '+256', currency: 'UGX' },
  { code: 'ZM', name: 'Zambie', dial: '+260', currency: 'ZMW' },
  { code: 'ZW', name: 'Zimbabwe', dial: '+263', currency: 'ZWL' },
  // ── Europe ──
  { code: 'FR', name: 'France', dial: '+33', currency: 'EUR' },
  { code: 'BE', name: 'Belgique', dial: '+32', currency: 'EUR' },
  { code: 'DE', name: 'Allemagne', dial: '+49', currency: 'EUR' },
  { code: 'ES', name: 'Espagne', dial: '+34', currency: 'EUR' },
  { code: 'IT', name: 'Italie', dial: '+39', currency: 'EUR' },
  { code: 'PT', name: 'Portugal', dial: '+351', currency: 'EUR' },
  { code: 'NL', name: 'Pays-Bas', dial: '+31', currency: 'EUR' },
  { code: 'CH', name: 'Suisse', dial: '+41', currency: 'CHF' },
  { code: 'GB', name: 'Royaume-Uni', dial: '+44', currency: 'GBP' },
  { code: 'IE', name: 'Irlande', dial: '+353', currency: 'EUR' },
  { code: 'LU', name: 'Luxembourg', dial: '+352', currency: 'EUR' },
  { code: 'SE', name: 'Suède', dial: '+46', currency: 'SEK' },
  { code: 'NO', name: 'Norvège', dial: '+47', currency: 'NOK' },
  { code: 'DK', name: 'Danemark', dial: '+45', currency: 'DKK' },
  { code: 'PL', name: 'Pologne', dial: '+48', currency: 'PLN' },
  { code: 'GR', name: 'Grèce', dial: '+30', currency: 'EUR' },
  { code: 'TR', name: 'Turquie', dial: '+90', currency: 'TRY' },
  { code: 'RU', name: 'Russie', dial: '+7', currency: 'RUB' },
  // ── Amériques ──
  { code: 'US', name: 'États-Unis', dial: '+1', currency: 'USD' },
  { code: 'CA', name: 'Canada', dial: '+1', currency: 'CAD' },
  { code: 'MX', name: 'Mexique', dial: '+52', currency: 'MXN' },
  { code: 'BR', name: 'Brésil', dial: '+55', currency: 'BRL' },
  { code: 'AR', name: 'Argentine', dial: '+54', currency: 'ARS' },
  { code: 'CO', name: 'Colombie', dial: '+57', currency: 'COP' },
  { code: 'CL', name: 'Chili', dial: '+56', currency: 'CLP' },
  { code: 'PE', name: 'Pérou', dial: '+51', currency: 'PEN' },
  { code: 'HT', name: 'Haïti', dial: '+509', currency: 'HTG' },
  // ── Moyen-Orient & Asie ──
  { code: 'AE', name: 'Émirats Arabes Unis', dial: '+971', currency: 'AED' },
  { code: 'SA', name: 'Arabie Saoudite', dial: '+966', currency: 'SAR' },
  { code: 'QA', name: 'Qatar', dial: '+974', currency: 'QAR' },
  { code: 'LB', name: 'Liban', dial: '+961', currency: 'LBP' },
  { code: 'IL', name: 'Israël', dial: '+972', currency: 'ILS' },
  { code: 'IN', name: 'Inde', dial: '+91', currency: 'INR' },
  { code: 'CN', name: 'Chine', dial: '+86', currency: 'CNY' },
  { code: 'JP', name: 'Japon', dial: '+81', currency: 'JPY' },
  { code: 'KR', name: 'Corée du Sud', dial: '+82', currency: 'KRW' },
  { code: 'TH', name: 'Thaïlande', dial: '+66', currency: 'THB' },
  { code: 'ID', name: 'Indonésie', dial: '+62', currency: 'IDR' },
  { code: 'MY', name: 'Malaisie', dial: '+60', currency: 'MYR' },
  { code: 'PH', name: 'Philippines', dial: '+63', currency: 'PHP' },
  { code: 'PK', name: 'Pakistan', dial: '+92', currency: 'PKR' },
  { code: 'BD', name: 'Bangladesh', dial: '+880', currency: 'BDT' },
  // ── Océanie ──
  { code: 'AU', name: 'Australie', dial: '+61', currency: 'AUD' },
  { code: 'NZ', name: 'Nouvelle-Zélande', dial: '+64', currency: 'NZD' },
];
