export type IssueInput = {
  toma: {
    nome: string; doc: string; email: string; fone?: string;
    endereco?: { xLgr?: string; nro?: string; xCpl?: string; xBairro?: string; cMun?: string; uf?: string; cep?: string };
  };
  serv: { xDescServ: string };
  valores: { vServ: number; vLiq?: number };
  meta?: { nDPS?: number; nNFSe?: number; serie?: string };
};

/** Espelha a linha de fiscal_config já decifrada e pronta para emitir. */
export type FiscalCompany = {
  cnpj: string; razaoSocial: string; inscricaoMunicipal?: string;
  email?: string; fone?: string;
  enderNac: { xLgr: string; nro: string; xBairro: string; cMun: string; uf: string; cep: string; xCpl?: string };
  regTrib: { opSimpNac: string; regApTribSN: string; regEspTrib: string; tribISSQN: string; tpRetISSQN: string };
  cLocIncid: string; xLocIncid: string; xLocEmi: string; xLocPrestacao: string;
  cTribNac: string; cTribMun: string; cNBS?: string;
  xTribNac: string; xTribMun: string; xNBS?: string;
  serie: string; tpAmb: string;
  pfxBuffer: Buffer; pfxPassword: string;
};
