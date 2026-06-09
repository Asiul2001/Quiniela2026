const COUNTRY_CODE_MAP: Record<string, string> = {
  México: "mx",
  "Sudáfrica": "za",
  "Corea del Sur": "kr",
  "República Checa": "cz",
  Canadá: "ca",
  "Bosnia y Herzegovina": "ba",
  "Estados Unidos": "us",
  Paraguay: "py",
  Catar: "qa",
  Suiza: "ch",
  Brasil: "br",
  Marruecos: "ma",
  Haití: "ht",
  Australia: "au",
  Turquía: "tr",
  Alemania: "de",
  Curaçao: "cw",
  "Países Bajos": "nl",
  Japón: "jp",
  "Costa de Marfil": "ci",
  Ecuador: "ec",
  Suecia: "se",
  Túnez: "tn",
  España: "es",
  "Cabo Verde": "cv",
  Bélgica: "be",
  Egipto: "eg",
  "Arabia Saudita": "sa",
  Uruguay: "uy",
  Irán: "ir",
  "Nueva Zelanda": "nz",
  Francia: "fr",
  Senegal: "sn",
  Irak: "iq",
  Noruega: "no",
  Argentina: "ar",
  Algeria: "dz",
  Austria: "at",
  Jordania: "jo",
  Portugal: "pt",
  "República Democrática del Congo": "cd",
  Croacia: "hr",
  Ghana: "gh",
  Panamá: "pa",
  Uzbekistán: "uz",
  Colombia: "co",
  USA: "us",
  UK: "gb",
  KSA: "sa",
  RSA: "za",
  CZE: "cz",
  SUI: "ch",
  BRA: "br",
  CIV: "ci",
  COD: "cd",
  NZL: "nz",
  ENG: "gb",
  KOR: "kr",
  POR: "pt",
  NED: "nl",
  CRO: "hr",
  GER: "de",
};

const COUNTRY_FLAG_SVGS: Record<string, string> = {
  Inglaterra:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" role="img" aria-labelledby="englandFlagTitle"><title id="englandFlagTitle">England flag</title><rect width="60" height="30" fill="#fff"/><rect x="24" width="12" height="30" fill="#CF142B"/><rect y="9" width="60" height="12" fill="#CF142B"/></svg>',
  Escocia:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" role="img" aria-labelledby="scotlandFlagTitle"><title id="scotlandFlagTitle">Scotland flag</title><rect width="60" height="30" fill="#0065BD"/><polygon points="0,0 15,0 30,12 45,0 60,0 60,7.5 40,15 60,22.5 60,30 45,30 30,17.5 15,30 0,30 0,22.5 20,15 0,7.5" fill="#fff"/></svg>',
  Gales:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" role="img" aria-labelledby="walesFlagTitle"><title id="walesFlagTitle">Wales flag</title><rect width="60" height="30" fill="#fff"/><rect width="60" height="15" fill="#DA291C"/><path d="M8 15c8-10 22-8 30 0 10 10 18 10 20 5 2-4 1-15-12-15-9 0-10 5-12 5-3 0-3-5-8-5C20 5 18 15 8 15Z" fill="#005A32"/></svg>',
  "Irlanda del Norte":
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" role="img" aria-labelledby="niFlagTitle"><title id="niFlagTitle">Northern Ireland flag</title><rect width="60" height="30" fill="#fff"/><rect x="24" width="12" height="30" fill="#CF142B"/><rect y="9" width="60" height="12" fill="#CF142B"/><polygon points="30,8 34,14 40,15 34,16 30,22 26,16 20,15 26,14" fill="#FCD116"/><circle cx="30" cy="15" r="2.5" fill="#CF142B"/></svg>',
};

const COUNTRY_CODE_MAP_NORMALIZED: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_CODE_MAP).map(([name, code]) => [name.toLowerCase(), code]),
);

const COUNTRY_FLAG_SVGS_NORMALIZED: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_FLAG_SVGS).map(([name, svg]) => [name.toLowerCase(), svg]),
);

function encodeSvgDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function resolveCountryCode(countryName: string): string | null {
  const normalized = countryName.trim().toLowerCase();
  const direct = COUNTRY_CODE_MAP_NORMALIZED[normalized];
  if (direct) {
    return direct;
  }

  if (normalized.length === 2 && /^[a-z]{2}$/.test(normalized)) {
    return normalized;
  }

  return null;
}

export function getCountryFlagUrl(countryName: string): string {
  const normalized = countryName.trim().toLowerCase();
  const overrideSvg = COUNTRY_FLAG_SVGS_NORMALIZED[normalized];
  if (overrideSvg) {
    return encodeSvgDataUrl(overrideSvg);
  }

  const countryCode = resolveCountryCode(countryName);
  if (!countryCode) {
    return "";
  }

  return `https://flagcdn.com/w40/${countryCode}.png`;
}
