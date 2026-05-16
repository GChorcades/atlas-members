import { buildXml } from '../lib/nfse/xml.js';
import type { FiscalCompany } from '../lib/nfse/types.js';

const company: FiscalCompany = {
  cnpj: '00000000000191', razaoSocial: 'Empresa Teste', inscricaoMunicipal: '123',
  enderNac: { xLgr: 'Rua A', nro: '1', xBairro: 'Centro', cMun: '3304557', uf: 'RJ', cep: '20000000' },
  regTrib: { opSimpNac: '1', regApTribSN: '1', regEspTrib: '0', tribISSQN: '1', tpRetISSQN: '1' },
  cLocIncid: '3304557', xLocIncid: 'Rio', xLocEmi: 'Rio', xLocPrestacao: 'Rio',
  cTribNac: '010701', cTribMun: '0', xTribNac: 'Curso', xTribMun: 'Curso',
  serie: '1', tpAmb: '2', pfxBuffer: Buffer.alloc(0), pfxPassword: '',
};
const { xml, dpsId } = buildXml(
  { toma: { nome: 'Aluno Teste', doc: '11144477735', email: 'a@b.com' },
    serv: { xDescServ: 'Acesso ao curso' }, valores: { vServ: 100 } },
  company,
);
if (!xml.includes('Acesso ao curso')) throw new Error('xDescServ ausente no XML');
if (!dpsId.startsWith('DPS')) throw new Error('dpsId inválido: ' + dpsId);
console.log('OK nfse-xml: XML montado, dpsId =', dpsId);
