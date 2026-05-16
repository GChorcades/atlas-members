import crypto from "node:crypto";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import type { Document as XmlDocument, Node as XmlNode, Element as XmlElement } from "@xmldom/xmldom";
import xpath from "xpath";
import type { FiscalCompany, IssueInput } from './types';
import { DPS_TEMPLATE } from './template';

function selectOne(doc: XmlDocument, expression: string) {
  return xpath.select1(expression, doc as unknown as Node) as unknown as XmlNode | undefined;
}

function setText(doc: XmlDocument, expression: string, value: string) {
  const node = selectOne(doc, expression);
  if (node) {
    node.textContent = value;
  }
}

function removeNodes(doc: XmlDocument, expression: string) {
  const nodes = xpath.select(expression, doc as unknown as Node) as unknown as XmlNode[];
  for (const node of nodes) {
    node.parentNode?.removeChild(node);
  }
}

function ensureNode(doc: XmlDocument, parentExpression: string, name: string, namespaceUri?: string) {
  const parent = selectOne(doc, parentExpression);
  if (!parent) return null;
  const existing = selectOne(doc, `${parentExpression}/*[local-name()='${name}']`);
  if (existing) return existing as XmlElement;
  const element = namespaceUri
    ? doc.createElementNS(namespaceUri, name)
    : doc.createElement(name);
  (parent as XmlElement).appendChild(element);
  return element as XmlElement;
}

function normalizeDoc(value?: string | number | null) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizePhone(value?: string | number | null) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  const trimmed = digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits;
  if (trimmed.length < 8 || trimmed.length > 11) return "";
  return trimmed;
}

function formatDateTime(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  const tz = -date.getTimezoneOffset();
  const tzSign = tz >= 0 ? "+" : "-";
  const tzHours = pad(Math.floor(Math.abs(tz) / 60));
  const tzMinutes = pad(Math.abs(tz) % 60);
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}${tzSign}${tzHours}:${tzMinutes}`;
}

function formatDate(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

function randomDigits(length: number) {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (byte) => (byte % 10).toString()).join("").slice(0, length);
}

function padNumber(value: string | number, length: number) {
  return String(value).replace(/\D/g, "").padStart(length, "0").slice(0, length);
}

function formatCEP(cep?: string | number | null) {
  return String(cep ?? "").replace(/\D/g, "");
}

function normalizeCep(value?: string) {
  return formatCEP(value ?? "");
}

function mod11Dv(base: string) {
  const weights = [2, 3, 4, 5, 6, 7, 8, 9];
  let sum = 0;
  for (let i = 0; i < base.length; i += 1) {
    const digit = Number(base[base.length - 1 - i]);
    sum += digit * weights[i % weights.length];
  }
  const mod = sum % 11;
  if (mod === 0 || mod === 1) return "0";
  return String(11 - mod);
}

function buildIds(params: {
  cLoc: string;
  inscr: string;
  ambGer: string;
  serie: string;
  nDps: string;
  nNfse: string;
}) {
  const tipoInscricao = params.inscr.length === 11 ? "1" : "2";
  const inscr14 = padNumber(params.inscr, 14);
  const serie5 = padNumber(params.serie, 5);
  const nDps15 = padNumber(params.nDps, 15);

  const dpsId = `DPS${params.cLoc}${tipoInscricao}${inscr14}${serie5}${nDps15}`;

  const nNfse13 = padNumber(params.nNfse, 13);
  const anoMes = formatDate().slice(2, 7).replace("-", "");
  const codNum = randomDigits(9);
  const base = `${params.cLoc}${params.ambGer}${tipoInscricao}${inscr14}${nNfse13}${anoMes}${codNum}`;
  const dv = mod11Dv(base);
  const nfseId = `NFS${base}${dv}`;

  return { nfseId, dpsId, nNfse13, nDps15, codNum };
}

export function buildXml(input: IssueInput, company: FiscalCompany) {
  const xml = DPS_TEMPLATE;
  const doc = new DOMParser().parseFromString(xml, "text/xml") as unknown as XmlDocument;

  removeNodes(doc, "//*[local-name()='Signature']");

  const cnpj = company.cnpj;
  const serie = input.meta?.serie ?? company.serie;
  const nDps = String(input.meta?.nDPS ?? `${Date.now()}${randomDigits(2)}`);
  const nNFSe = String(input.meta?.nNFSe ?? Date.now());

  const { nfseId, dpsId, nNfse13, nDps15 } = buildIds({
    cLoc: company.cLocIncid,
    inscr: cnpj,
    ambGer: company.tpAmb,
    serie,
    nDps,
    nNfse: nNFSe
  });

  const infNFSe = selectOne(doc, "/*[local-name()='NFSe']/*[local-name()='infNFSe']") as XmlElement | undefined;
  if (infNFSe) {
    infNFSe.setAttribute("Id", nfseId);
  }
  const infDps = selectOne(doc, "//*[local-name()='infDPS']") as XmlElement | undefined;
  if (infDps) {
    infDps.setAttribute("Id", dpsId);
  }

  setText(doc, "//*[local-name()='xLocEmi']", company.xLocEmi);
  setText(doc, "//*[local-name()='xLocPrestacao']", company.xLocPrestacao);
  setText(doc, "//*[local-name()='cLocIncid']", company.cLocIncid);
  setText(doc, "//*[local-name()='xLocIncid']", company.xLocIncid);
  setText(doc, "//*[local-name()='xTribNac']", company.xTribNac);
  setText(doc, "//*[local-name()='xTribMun']", company.xTribMun);
  if (company.xNBS) setText(doc, "//*[local-name()='xNBS']", company.xNBS);

  setText(doc, "//*[local-name()='nNFSe']", String(Number(nNfse13)));
  setText(doc, "//*[local-name()='tpAmb']", company.tpAmb);
  setText(doc, "//*[local-name()='ambGer']", company.tpAmb);
  setText(doc, "//*[local-name()='serie']", serie);
  setText(doc, "//*[local-name()='nDPS']", String(Number(nDps15)));
  setText(doc, "//*[local-name()='dhEmi']", formatDateTime());
  setText(doc, "//*[local-name()='dCompet']", formatDate());
  setText(doc, "//*[local-name()='cLocEmi']", company.cLocIncid);

  setText(doc, "//*[local-name()='emit']/*[local-name()='CNPJ']", cnpj);
  setText(doc, "//*[local-name()='emit']/*[local-name()='xNome']", company.razaoSocial);
  const companyPhone = normalizePhone(company.fone);
  if (companyPhone) setText(doc, "//*[local-name()='emit']//*[local-name()='fone']", companyPhone);
  if (company.email) setText(doc, "//*[local-name()='emit']//*[local-name()='email']", company.email);
  setText(doc, "//*[local-name()='emit']//*[local-name()='xLgr']", company.enderNac.xLgr);
  setText(doc, "//*[local-name()='emit']//*[local-name()='nro']", company.enderNac.nro);
  setText(doc, "//*[local-name()='emit']//*[local-name()='xBairro']", company.enderNac.xBairro);
  setText(doc, "//*[local-name()='emit']//*[local-name()='cMun']", company.enderNac.cMun);
  setText(doc, "//*[local-name()='emit']//*[local-name()='UF']", company.enderNac.uf);
  setText(doc, "//*[local-name()='emit']//*[local-name()='CEP']", formatCEP(company.enderNac.cep));

  setText(doc, "//*[local-name()='prest']/*[local-name()='CNPJ']", cnpj);
  setText(doc, "//*[local-name()='prest']//*//*[local-name()='cMun']", company.enderNac.cMun);
  setText(doc, "//*[local-name()='prest']//*//*[local-name()='CEP']", formatCEP(company.enderNac.cep));
  setText(doc, "//*[local-name()='prest']//*[local-name()='xLgr']", company.enderNac.xLgr);
  setText(doc, "//*[local-name()='prest']//*[local-name()='nro']", company.enderNac.nro);
  setText(doc, "//*[local-name()='prest']//*[local-name()='xBairro']", company.enderNac.xBairro);
  if (companyPhone) setText(doc, "//*[local-name()='prest']//*[local-name()='fone']", companyPhone);
  if (company.email) setText(doc, "//*[local-name()='prest']//*[local-name()='email']", company.email);
  setText(doc, "//*[local-name()='regTrib']/*[local-name()='opSimpNac']", company.regTrib.opSimpNac);
  setText(doc, "//*[local-name()='regTrib']/*[local-name()='regApTribSN']", company.regTrib.regApTribSN);
  setText(doc, "//*[local-name()='regTrib']/*[local-name()='regEspTrib']", company.regTrib.regEspTrib);

  const tomaNodeExpression = "//*[local-name()='toma']";
  const tomaNode = selectOne(doc, tomaNodeExpression) as XmlElement | undefined;
  if (tomaNode) {
    removeNodes(doc, `${tomaNodeExpression}/*[local-name()='CPF']`);
    removeNodes(doc, `${tomaNodeExpression}/*[local-name()='CNPJ']`);
    const docDigits = normalizeDoc(input.toma.doc);
    if (!docDigits) {
      throw new Error("Documento do tomador inválido.");
    }
    let docTag: "CPF" | "CNPJ";
    let docValue = docDigits;
    if (docDigits.length <= 11) {
      docTag = "CPF";
      docValue = docDigits.padStart(11, "0");
    } else if (docDigits.length <= 14) {
      docTag = "CNPJ";
      docValue = docDigits.padStart(14, "0");
    } else {
      throw new Error("Documento do tomador inválido.");
    }
    const docElement = doc.createElement(docTag);
    docElement.textContent = docValue;
    const firstChild = tomaNode.firstChild;
    if (firstChild) {
      tomaNode.insertBefore(docElement, firstChild);
    } else {
      tomaNode.appendChild(docElement);
    }
  }

  setText(doc, `${tomaNodeExpression}/*[local-name()='xNome']`, input.toma.nome);
  removeNodes(doc, `${tomaNodeExpression}/*[local-name()='fone']`);
  removeNodes(doc, `${tomaNodeExpression}/*[local-name()='email']`);

  removeNodes(doc, `${tomaNodeExpression}/*[local-name()='enderNac']`);
  removeNodes(doc, `${tomaNodeExpression}/*[local-name()='end']`);

  const endereco = input.toma.endereco;
  const cepNormalized = normalizeCep(endereco?.cep);
  const cMunTomador = String(endereco?.cMun ?? "").trim();
  const xLgrTomador = String(endereco?.xLgr ?? "").trim();
  const nroTomador = String(endereco?.nro ?? "").trim();
  const xBairroTomador = String(endereco?.xBairro ?? "").trim();
  const hasEndereco = Boolean(
    xLgrTomador &&
      nroTomador &&
      xBairroTomador &&
      cepNormalized.length === 8 &&
      cMunTomador
  );
  if (endereco && hasEndereco && tomaNode) {
    const endElement = doc.createElement("end");
    const endNacElement = doc.createElement("endNac");
    const cMun = doc.createElement("cMun");
    cMun.textContent = cMunTomador!;
    const cep = doc.createElement("CEP");
    cep.textContent = cepNormalized;
    endNacElement.appendChild(cMun);
    endNacElement.appendChild(cep);
    endElement.appendChild(endNacElement);

    const xLgr = doc.createElement("xLgr");
    xLgr.textContent = xLgrTomador;
    const nro = doc.createElement("nro");
    nro.textContent = nroTomador;
    const xBairro = doc.createElement("xBairro");
    xBairro.textContent = xBairroTomador;
    endElement.appendChild(xLgr);
    endElement.appendChild(nro);
    const xCplTomador = String(endereco.xCpl ?? "").trim();
    if (xCplTomador) {
      const xCpl = doc.createElement("xCpl");
      xCpl.textContent = xCplTomador;
      endElement.appendChild(xCpl);
    }
    endElement.appendChild(xBairro);

    tomaNode.appendChild(endElement);
  }

  const foneTomador = normalizePhone(input.toma.fone);
  const emailTomador = String(input.toma.email ?? "").trim();
  if (foneTomador) {
    ensureNode(doc, tomaNodeExpression, "fone")!.textContent = foneTomador;
  }
  if (emailTomador) {
    ensureNode(doc, tomaNodeExpression, "email")!.textContent = emailTomador;
  }

  setText(doc, "//*[local-name()='cTribNac']", company.cTribNac);
  setText(doc, "//*[local-name()='cTribMun']", company.cTribMun);
  if (company.cNBS) setText(doc, "//*[local-name()='cNBS']", company.cNBS);
  setText(doc, "//*[local-name()='xDescServ']", input.serv.xDescServ);

  setText(doc, "//*[local-name()='tribISSQN']", company.regTrib.tribISSQN);
  setText(doc, "//*[local-name()='tpRetISSQN']", company.regTrib.tpRetISSQN);

  const vServ = Number(input.valores.vServ);
  const vLiq = Number(input.valores.vLiq ?? input.valores.vServ);
  setText(doc, "//*[local-name()='vServ']", vServ.toFixed(2));
  setText(doc, "//*[local-name()='vLiq']", vLiq.toFixed(2));

  const dpsNode = selectOne(doc, "//*[local-name()='DPS']") as XmlElement | undefined;
  if (!dpsNode) {
    throw new Error("DPS node not found in template");
  }
  const dpsXml = new XMLSerializer().serializeToString(dpsNode as unknown as XmlNode);
  const xmlOut = `<?xml version=\"1.0\" encoding=\"utf-8\"?>${dpsXml}`;
  return {
    xml: xmlOut,
    nfseId,
    dpsId,
    referenceXPath: "//*[local-name()='infDPS']",
    signatureParentXPath: "//*[local-name()='DPS']"
  };
}
