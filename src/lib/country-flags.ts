const COUNTRY_CODE_MAP: Record<string, string> = {
  mexico: "mx",
  "south africa": "za",
  sudafrica: "za",
  "south korea": "kr",
  "corea del sur": "kr",
  czechia: "cz",
  "czech republic": "cz",
  "republica checa": "cz",
  canada: "ca",
  "bosnia and herzegovina": "ba",
  "bosnia y herzegovina": "ba",
  "united states": "us",
  "estados unidos": "us",
  paraguay: "py",
  qatar: "qa",
  catar: "qa",
  switzerland: "ch",
  suiza: "ch",
  brazil: "br",
  brasil: "br",
  morocco: "ma",
  marruecos: "ma",
  haiti: "ht",
  australia: "au",
  turkey: "tr",
  turquia: "tr",
  germany: "de",
  alemania: "de",
  curacao: "cw",
  netherlands: "nl",
  "paises bajos": "nl",
  japan: "jp",
  japon: "jp",
  "ivory coast": "ci",
  "costa de marfil": "ci",
  ecuador: "ec",
  sweden: "se",
  suecia: "se",
  tunisia: "tn",
  tunez: "tn",
  spain: "es",
  espana: "es",
  "cape verde": "cv",
  "cabo verde": "cv",
  belgium: "be",
  belgica: "be",
  egypt: "eg",
  egipto: "eg",
  "saudi arabia": "sa",
  "arabia saudita": "sa",
  uruguay: "uy",
  iran: "ir",
  "new zealand": "nz",
  "nueva zelanda": "nz",
  france: "fr",
  francia: "fr",
  senegal: "sn",
  iraq: "iq",
  irak: "iq",
  norway: "no",
  noruega: "no",
  argentina: "ar",
  algeria: "dz",
  argelia: "dz",
  austria: "at",
  jordan: "jo",
  jordania: "jo",
  portugal: "pt",
  "dr congo": "cd",
  "republica democratica del congo": "cd",
  croatia: "hr",
  croacia: "hr",
  ghana: "gh",
  panama: "pa",
  uzbekistan: "uz",
  colombia: "co",
  england: "gb",
  inglaterra: "gb",
  scotland: "gb-sct",
  escocia: "gb-sct",
  wales: "gb-wls",
  gales: "gb-wls",
  "northern ireland": "gb-nir",
  "irlanda del norte": "gb-nir",
  usa: "us",
  uk: "gb",
  ksa: "sa",
  rsa: "za",
  cze: "cz",
  sui: "ch",
  bra: "br",
  civ: "ci",
  cod: "cd",
  nzl: "nz",
  eng: "gb",
  kor: "kr",
  por: "pt",
  ned: "nl",
  cro: "hr",
  ger: "de",
};

const COUNTRY_DISPLAY_NAME_MAP: Record<string, string> = {
  mexico: "México",
  "south africa": "Sudáfrica",
  sudafrica: "Sudáfrica",
  "south korea": "Corea del Sur",
  "corea del sur": "Corea del Sur",
  czechia: "República Checa",
  "czech republic": "República Checa",
  "republica checa": "República Checa",
  canada: "Canadá",
  "bosnia and herzegovina": "Bosnia y Herzegovina",
  "bosnia y herzegovina": "Bosnia y Herzegovina",
  "united states": "Estados Unidos",
  "estados unidos": "Estados Unidos",
  paraguay: "Paraguay",
  qatar: "Catar",
  catar: "Catar",
  switzerland: "Suiza",
  suiza: "Suiza",
  brazil: "Brasil",
  brasil: "Brasil",
  morocco: "Marruecos",
  marruecos: "Marruecos",
  haiti: "Haití",
  australia: "Australia",
  turkey: "Turquía",
  turquia: "Turquía",
  germany: "Alemania",
  alemania: "Alemania",
  curacao: "Curaçao",
  netherlands: "Países Bajos",
  "paises bajos": "Países Bajos",
  japan: "Japón",
  japon: "Japón",
  "ivory coast": "Costa de Marfil",
  "costa de marfil": "Costa de Marfil",
  ecuador: "Ecuador",
  sweden: "Suecia",
  suecia: "Suecia",
  tunisia: "Túnez",
  tunez: "Túnez",
  spain: "España",
  espana: "España",
  "cape verde": "Cabo Verde",
  "cabo verde": "Cabo Verde",
  belgium: "Bélgica",
  belgica: "Bélgica",
  egypt: "Egipto",
  egipto: "Egipto",
  "saudi arabia": "Arabia Saudita",
  "arabia saudita": "Arabia Saudita",
  uruguay: "Uruguay",
  iran: "Irán",
  "new zealand": "Nueva Zelanda",
  "nueva zelanda": "Nueva Zelanda",
  france: "Francia",
  francia: "Francia",
  senegal: "Senegal",
  iraq: "Irak",
  irak: "Irak",
  norway: "Noruega",
  noruega: "Noruega",
  argentina: "Argentina",
  algeria: "Argelia",
  argelia: "Argelia",
  austria: "Austria",
  jordan: "Jordania",
  jordania: "Jordania",
  portugal: "Portugal",
  "dr congo": "República Democrática del Congo",
  "republica democratica del congo": "República Democrática del Congo",
  croatia: "Croacia",
  croacia: "Croacia",
  ghana: "Ghana",
  panama: "Panamá",
  uzbekistan: "Uzbekistán",
  colombia: "Colombia",
  england: "Inglaterra",
  inglaterra: "Inglaterra",
  scotland: "Escocia",
  escocia: "Escocia",
  wales: "Gales",
  gales: "Gales",
  "northern ireland": "Irlanda del Norte",
  "irlanda del norte": "Irlanda del Norte",
  usa: "Estados Unidos",
  uk: "Reino Unido",
  ksa: "Arabia Saudita",
  rsa: "Sudáfrica",
  cze: "República Checa",
  sui: "Suiza",
  bra: "Brasil",
  civ: "Costa de Marfil",
  cod: "República Democrática del Congo",
  nzl: "Nueva Zelanda",
  eng: "Inglaterra",
  kor: "Corea del Sur",
  por: "Portugal",
  ned: "Países Bajos",
  cro: "Croacia",
  ger: "Alemania",
};

const COUNTRY_FLAG_SVGS: Record<string, string> = {
  england:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" role="img" aria-labelledby="englandFlagTitle"><title id="englandFlagTitle">England flag</title><rect width="60" height="30" fill="#fff"/><rect x="24" width="12" height="30" fill="#CF142B"/><rect y="9" width="60" height="12" fill="#CF142B"/></svg>',
  inglaterra:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" role="img" aria-labelledby="englandFlagTitle"><title id="englandFlagTitle">England flag</title><rect width="60" height="30" fill="#fff"/><rect x="24" width="12" height="30" fill="#CF142B"/><rect y="9" width="60" height="12" fill="#CF142B"/></svg>',
  scotland:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" role="img" aria-labelledby="scotlandFlagTitle"><title id="scotlandFlagTitle">Scotland flag</title><rect width="60" height="30" fill="#0065BD"/><polygon points="0,0 15,0 30,12 45,0 60,0 60,7.5 40,15 60,22.5 60,30 45,30 30,17.5 15,30 0,30 0,22.5 20,15 0,7.5" fill="#fff"/></svg>',
  escocia:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" role="img" aria-labelledby="scotlandFlagTitle"><title id="scotlandFlagTitle">Scotland flag</title><rect width="60" height="30" fill="#0065BD"/><polygon points="0,0 15,0 30,12 45,0 60,0 60,7.5 40,15 60,22.5 60,30 45,30 30,17.5 15,30 0,30 0,22.5 20,15 0,7.5" fill="#fff"/></svg>',
  wales:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" role="img" aria-labelledby="walesFlagTitle"><title id="walesFlagTitle">Wales flag</title><rect width="60" height="30" fill="#fff"/><rect width="60" height="15" fill="#DA291C"/><path d="M8 15c8-10 22-8 30 0 10 10 18 10 20 5 2-4 1-15-12-15-9 0-10 5-12 5-3 0-3-5-8-5C20 5 18 15 8 15Z" fill="#005A32"/></svg>',
  gales:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" role="img" aria-labelledby="walesFlagTitle"><title id="walesFlagTitle">Wales flag</title><rect width="60" height="30" fill="#fff"/><rect width="60" height="15" fill="#DA291C"/><path d="M8 15c8-10 22-8 30 0 10 10 18 10 20 5 2-4 1-15-12-15-9 0-10 5-12 5-3 0-3-5-8-5C20 5 18 15 8 15Z" fill="#005A32"/></svg>',
  "northern ireland":
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" role="img" aria-labelledby="niFlagTitle"><title id="niFlagTitle">Northern Ireland flag</title><rect width="60" height="30" fill="#fff"/><rect x="24" width="12" height="30" fill="#CF142B"/><rect y="9" width="60" height="12" fill="#CF142B"/><polygon points="30,8 34,14 40,15 34,16 30,22 26,16 20,15 26,14" fill="#FCD116"/><circle cx="30" cy="15" r="2.5" fill="#CF142B"/></svg>',
  "irlanda del norte":
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" role="img" aria-labelledby="niFlagTitle"><title id="niFlagTitle">Northern Ireland flag</title><rect width="60" height="30" fill="#fff"/><rect x="24" width="12" height="30" fill="#CF142B"/><rect y="9" width="60" height="12" fill="#CF142B"/><polygon points="30,8 34,14 40,15 34,16 30,22 26,16 20,15 26,14" fill="#FCD116"/><circle cx="30" cy="15" r="2.5" fill="#CF142B"/></svg>',
};

function encodeSvgDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function normalizeCountryLookupKey(countryName: string): string {
  return countryName
    .trim()
    .toLowerCase()
    .replace(/Ã¡/g, "a")
    .replace(/Ã©/g, "e")
    .replace(/Ã­/g, "i")
    .replace(/Ã³/g, "o")
    .replace(/Ãº/g, "u")
    .replace(/Ã±/g, "n")
    .replace(/Ã§/g, "c")
    .replace(/Ã¼/g, "u")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function resolveCountryCode(countryName: string): string | null {
  const normalized = normalizeCountryLookupKey(countryName);
  const direct = COUNTRY_CODE_MAP[normalized];
  if (direct) {
    return direct;
  }

  if (normalized.length === 2 && /^[a-z]{2}$/.test(normalized)) {
    return normalized;
  }

  return null;
}

export function getDisplayCountryName(countryName: string): string {
  const normalized = normalizeCountryLookupKey(countryName);
  return COUNTRY_DISPLAY_NAME_MAP[normalized] ?? countryName.trim();
}

export function getCountryFlagUrl(countryName: string): string {
  const normalized = normalizeCountryLookupKey(countryName);
  const overrideSvg = COUNTRY_FLAG_SVGS[normalized];
  if (overrideSvg) {
    return encodeSvgDataUrl(overrideSvg);
  }

  const countryCode = resolveCountryCode(countryName);
  if (!countryCode) {
    return "";
  }

  return `https://flagcdn.com/w40/${countryCode}.png`;
}
