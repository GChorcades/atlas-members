import https from "node:https";
import axios from "axios";
import zlib from "node:zlib";
import type { FiscalCompany } from './types';
import { loadPfxFromBuffer } from './sign';

const DEFAULT_PROD_URLS = {
  recepcao: "https://adn.nfse.gov.br/adn",
  contribuinte: "https://adn.nfse.gov.br/contribuintes",
  danfse: "https://adn.nfse.gov.br/danfse",
  sefin: "https://sefin.nfse.gov.br/SefinNacional"
};

const DEFAULT_HOMOLOG_URLS = {
  recepcao: "https://adn.producaorestrita.nfse.gov.br/adn",
  contribuinte: "https://adn.producaorestrita.nfse.gov.br/contribuintes",
  danfse: "https://adn.producaorestrita.nfse.gov.br/danfse",
  sefin: "https://sefin.producaorestrita.nfse.gov.br/SefinNacional"
};

function createAgent(company: FiscalCompany) {
  const cert = loadPfxFromBuffer(company.pfxBuffer, company.pfxPassword);
  return new https.Agent({
    key: cert.privateKeyPem,
    cert: cert.certificatePem,
    rejectUnauthorized: true
  });
}

function createApi(baseURL: string, company: FiscalCompany, responseType?: "arraybuffer") {
  return axios.create({
    baseURL,
    httpsAgent: createAgent(company),
    responseType,
    headers: { "Content-Type": "application/json" }
  });
}

function getBaseUrls(company: FiscalCompany) {
  if (company.tpAmb === "1") {
    return DEFAULT_PROD_URLS;
  }
  return DEFAULT_HOMOLOG_URLS;
}

export function xmlToGzipBase64(xml: string) {
  const gz = zlib.gzipSync(xml);
  return gz.toString("base64");
}

export async function enviarDps(xml: string, company: FiscalCompany) {
  const baseUrls = getBaseUrls(company);
  const sefinApi = createApi(baseUrls.sefin, company);
  const payload = { dpsXmlGZipB64: xmlToGzipBase64(xml) };
  try {
    const response = await sefinApi.post("/nfse", payload);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      throw new Error(`SEFIN error: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

export async function baixarDanfse(chaveAcesso: string, company: FiscalCompany) {
  const baseUrls = getBaseUrls(company);
  const danfseApi = createApi(baseUrls.danfse, company, "arraybuffer");
  const response = await danfseApi.get(`/${encodeURIComponent(chaveAcesso)}`);
  return Buffer.from(response.data as ArrayBuffer);
}

function decodeGzipBase64(payload: string) {
  const decoded = Buffer.from(payload, "base64");
  try {
    return zlib.gunzipSync(decoded).toString("utf-8");
  } catch {
    return decoded.toString("utf-8");
  }
}

export function extractXmlFromResponse(response: any): string | null {
  if (!response || typeof response !== "object") return null;
  const candidates = [
    response.nfseXmlGZipB64,
    response.nfseXmlGzipB64,
    response.nfseXmlB64,
    response.xml,
    response.xmlNfse,
    response.nfseXml,
    response.xmlNFSe,
    response.docXml,
    response.docXmlB64,
    response.xmlBase64,
    response.docXmlGZipB64,
    response.docXmlGzipB64
  ];
  for (const item of candidates) {
    if (!item || typeof item !== "string") continue;
    const xml = decodeGzipBase64(item).trim();
    if (xml.startsWith("<")) return xml;
  }
  return null;
}

function tryExtractXml(payload: string): string | null {
  const trimmed = payload.trim();
  if (trimmed.startsWith("<")) return trimmed;
  try {
    const json = JSON.parse(payload);
    const candidates = [
      json?.nfseXmlGZipB64,
      json?.nfseXmlGzipB64,
      json?.nfseXmlB64,
      json?.xml,
      json?.xmlNfse,
      json?.nfseXml,
      json?.xmlNFSe,
      json?.docXml,
      json?.docXmlB64,
      json?.xmlBase64,
      json?.docXmlGZipB64,
      json?.docXmlGzipB64
    ];
    for (const item of candidates) {
      if (!item || typeof item !== "string") continue;
      if (item.trim().startsWith("<")) return item.trim();
      try {
        const xml = decodeGzipBase64(item).trim();
        if (xml.startsWith("<")) return xml;
      } catch {
        // ignore decode failures
      }
    }
  } catch {
    // ignore json failures
  }
  return null;
}

export async function baixarXmlNfse(chaveAcesso: string, company: FiscalCompany) {
  const baseUrls = getBaseUrls(company);
  const contribApi = createApi(baseUrls.contribuinte, company, "arraybuffer");
  const paths = [
    `/NFSe/${encodeURIComponent(chaveAcesso)}`,
    `/NFSe/${encodeURIComponent(chaveAcesso)}/XML`,
    `/NFSe/${encodeURIComponent(chaveAcesso)}/Xml`,
    `/NFSe/${encodeURIComponent(chaveAcesso)}/Documento`,
    `/NFSe/${encodeURIComponent(chaveAcesso)}/documento`
  ];

  let lastError: unknown;
  for (const path of paths) {
    try {
      const response = await contribApi.get(path);
      const data = Buffer.from(response.data as ArrayBuffer).toString("utf-8");
      const xml = tryExtractXml(data);
      if (xml) return xml;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("XML not found");
}

export async function consultarNsu(nsu: string, cnpjConsulta?: string, company?: FiscalCompany) {
  if (!company) throw new Error("company is required");
  const baseUrls = getBaseUrls(company);
  const contribApi = createApi(baseUrls.contribuinte, company);
  const response = await contribApi.get(`/DFe/${encodeURIComponent(nsu)}`, {
    params: { cnpjConsulta, lote: true }
  });
  return response.data;
}

export async function consultarEventos(chaveAcesso: string, company: FiscalCompany) {
  const baseUrls = getBaseUrls(company);
  const contribApi = createApi(baseUrls.contribuinte, company);
  try {
    const response = await contribApi.get(`/NFSe/${encodeURIComponent(chaveAcesso)}/Eventos`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      throw new Error(`Contribuinte error: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

export async function enviarEvento(xml: string, company: FiscalCompany) {
  const baseUrls = getBaseUrls(company);
  const recepcaoApi = createApi(baseUrls.recepcao, company);
  const payload = { LoteXmlGZipB64: [xmlToGzipBase64(xml)] };
  try {
    const response = await recepcaoApi.post("/DFe", payload);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      throw new Error(`Recepcao error: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}
