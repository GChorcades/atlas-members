import type { FiscalCompany } from './types';

type CancelEventParams = {
  chaveAcesso: string;
  motivoCodigo: "1" | "2" | "9";
  motivoDescricao: string;
  company: FiscalCompany;
};

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

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function buildCancelEventXml(params: CancelEventParams) {
  const versao = "1.01";
  const tipoEvento = "101101";
  const nPedRegEvento = "001";
  const nSeqEvento = "1";
  const chave = normalizeDigits(params.chaveAcesso);
  const idEvento = `EVT${chave}${tipoEvento}${nPedRegEvento}`;
  const idPedReg = `PRE${chave}${tipoEvento}${nPedRegEvento}`;
  const nDFe = String(Date.now()).slice(0, 13);
  const dhEvento = formatDateTime();
  const dhProc = formatDateTime();
  const cnpjAutor = normalizeDigits(params.company.cnpj);
  const motivoDescricao = escapeXml(params.motivoDescricao.trim());

  const xml = `<?xml version="1.0" encoding="utf-8"?>` +
    `<evento xmlns="http://www.sped.fazenda.gov.br/nfse" versao="${versao}">` +
      `<infEvento Id="${idEvento}">` +
        `<verAplic>NFSe Studio</verAplic>` +
        `<ambGer>${params.company.tpAmb}</ambGer>` +
        `<nSeqEvento>${nSeqEvento}</nSeqEvento>` +
        `<dhProc>${dhProc}</dhProc>` +
        `<nDFe>${nDFe}</nDFe>` +
        `<pedRegEvento versao="${versao}">` +
          `<infPedReg Id="${idPedReg}">` +
            `<tpAmb>${params.company.tpAmb}</tpAmb>` +
            `<verAplic>NFSe Studio</verAplic>` +
            `<dhEvento>${dhEvento}</dhEvento>` +
            `<CNPJAutor>${cnpjAutor}</CNPJAutor>` +
            `<chNFSe>${chave}</chNFSe>` +
            `<nPedRegEvento>${nPedRegEvento}</nPedRegEvento>` +
            `<e101101>` +
              `<xDesc>Cancelamento de NFS-e</xDesc>` +
              `<cMotivo>${params.motivoCodigo}</cMotivo>` +
              `<xMotivo>${motivoDescricao}</xMotivo>` +
            `</e101101>` +
          `</infPedReg>` +
        `</pedRegEvento>` +
      `</infEvento>` +
    `</evento>`;

  return { xml, idEvento };
}
