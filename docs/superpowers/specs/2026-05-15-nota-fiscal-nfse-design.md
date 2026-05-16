# Design — Emissão de NFS-e (Nota Fiscal de Serviço eletrônica)

Data: 2026-05-15
Status: aprovado (aguardando revisão do spec)

## Objetivo

Emitir nota fiscal de serviço (NFS-e) automaticamente a partir das compras
da plataforma, integrando direto com o **Sistema Nacional de NFS-e**
(SEFIN Nacional / ADN gov.br), assinando com o certificado digital do
tenant. A nota fica salva no sistema, é enviada ao comprador por e-mail
(PDF) e WhatsApp, e visível no painel admin.

O núcleo de emissão é **portado do app CODEX** (já testado e funcional),
adaptado para rodar dentro do atlas-members (Vercel serverless, multi-tenant).

## Decisões (definidas no brainstorming)

- **Caminho de emissão**: integração direta com o Sistema Nacional de NFS-e
  (NÃO via Asaas).
- **Gatilho**: automático ao confirmar o pagamento + botão manual no painel.
- **Escopo**: toda cobrança paga gera nota (checkout, cobrança avulsa,
  renovação de assinatura).
- **Cancelamento**: automático no estorno/chargeback + botão manual.
- **Entrega**: e-mail (PDF) + WhatsApp (link).
- **Certificado**: arquivo `.pfx` + senha guardados criptografados no banco
  (chave derivada do `AUTH_SECRET`), por tenant.
- **PDF**: baixado do endpoint DANFSE do governo. Se falhar, a nota fica
  `autorizada` mesmo assim (o XML é o documento legal) e o PDF é
  re-tentável pelo painel.
- **Endereço no checkout**: passa a ser **obrigatório** e salvo no cadastro
  do aluno, para a NFS-e sempre ter o endereço do tomador.
- **Multi-tenant**: configuração fiscal por tenant; cada tenant emite com o
  próprio CNPJ e certificado.

## Fora de escopo (presente no CODEX, não vem)

- Importação de notas em lote por Excel.
- Geração de PDF própria via Java/Jasper (usamos o DANFSE do governo).
- Telas de consulta/histórico elaboradas.
- Multi-empresa dentro de um login (cada tenant já é uma empresa).
- Lista de "atividades"/presets de serviço — cada tenant tem uma config
  fiscal única.

## Arquitetura

### Tabelas novas (escopadas por tenant)

**`fiscal_config`** — uma linha por tenant. Campos exigidos pelo XML da DPS:

- `tenantId` (único), `enabled` (bool), `tpAmb` (`1` produção / `2` homologação)
- Emitente: `cnpj`, `inscricaoMunicipal`, `razaoSocial`, `email`, `fone`
- Endereço do emitente: `logradouro`, `numero`, `bairro`, `codMunicipio`,
  `uf`, `cep`, `complemento`
- Regime tributário: `opSimpNac`, `regApTribSN`, `regEspTrib`, `tribISSQN`,
  `tpRetISSQN`
- Local de incidência: `cLocIncid`, `xLocIncid`, `xLocEmi`, `xLocPrestacao`
- Tributação do serviço: `cTribNac`, `cTribMun`, `cNBS`, `xTribNac`,
  `xTribMun`, `xNBS`
- `serie`, `descricaoServicoPadrao`
- Certificado: `pfxData` (base64 criptografado), `pfxPassword` (criptografado),
  `certSubject`, `certValidoAte` (metadados para exibição)

Sensível: `pfxData`/`pfxPassword` nunca são enviados ao navegador (mesmo
padrão de mascaramento da chave Asaas).

**`invoices`** — uma linha por nota emitida:

- `id`, `tenantId`, `paymentId` (FK → `payments`), `userId` (comprador)
- `status`: `pendente` | `autorizada` | `erro` | `cancelada`
- `chaveAcesso`, `numero`, `serie`
- `dpsXml`, `nfseXml` (XML final)
- `pdfUrl` (Vercel Blob), `valor`, `errorMessage`, `responseJson`
- `createdAt`, `canceledAt`

### Núcleo de emissão — `lib/nfse/` (portado do CODEX)

- `sign.ts` — carrega o `.pfx` (node-forge), assina o XML (xml-crypto,
  XML-DSig RSA-SHA256, enveloped + c14n).
- `xml.ts` — monta o XML da DPS a partir de um template + `fiscal_config` +
  dados do comprador. IDs (`infDPS`/`infNFSe`) no padrão XSD v1.01 (DV mod11).
- `client.ts` — cliente mTLS para o Sistema Nacional: `enviarDps`,
  `baixarDanfse`, `baixarXmlNfse`, `enviarEvento`. O certificado é a
  identidade TLS (`https.Agent` com key+cert).
- `event.ts` — XML do evento de cancelamento (tipo 101101).
- `cert-crypto.ts` — cifra/decifra o `.pfx` e a senha com chave derivada do
  `AUTH_SECRET`.
- Template XML da DPS versionado no repositório.

Dependências npm novas: `@xmldom/xmldom`, `xml-crypto`, `xpath`,
`node-forge` (e tipos).

### Bibliotecas auxiliares

- `lib/nfse/emit.ts` — orquestra a emissão de uma nota para um pagamento:
  monta → assina → envia → salva `invoice` → baixa PDF → guarda no Blob.
- `lib/nfse/cancel.ts` — orquestra o cancelamento.

## Fluxos

### Emissão

Disparo (tenant com `fiscal_config.enabled`):
- **Automático**: webhook Asaas (`PAYMENT_RECEIVED`/`PAYMENT_CONFIRMED`) e
  confirmação imediata em `createPublicCheckoutCharge`.
- **Manual**: botão "Emitir nota" num pagamento (detalhe do aluno).

Passos: monta DPS → assina → `enviarDps` (mTLS) → recebe `chaveAcesso` →
salva `invoice` (`autorizada`) → `baixarDanfse` → Blob → envia ao comprador.

Resiliência:
- Falha em qualquer passo → `invoice` salva como `erro` + mensagem; **não
  quebra o fluxo do pagamento**; reemissão pelo painel.
- Falha só no PDF → nota continua `autorizada`, `pdfUrl` nulo, botão
  "baixar PDF" re-tenta.
- Emissão roda inline no webhook/checkout; `maxDuration` da função ajustado.

### Cancelamento

- **Automático**: webhook `PAYMENT_REFUNDED` / chargeback → se existe
  `invoice` `autorizada` para o pagamento, envia evento de cancelamento.
- **Manual**: botão "Cancelar nota".
- Sucesso → `invoice.status = cancelada`.

### Envio ao comprador

Após emitida: e-mail (Brevo) com o PDF + WhatsApp (Z-API) com o link.
Novo template `notifyInvoice` em `lib/notifications.ts`.

## Mudanças no checkout

- Campos de endereço (logradouro, número, bairro, cidade, UF, CEP) passam a
  ser **obrigatórios** no formulário de checkout.
- `createPublicCheckoutCharge` passa a receber e **persistir** o endereço
  completo no cadastro do aluno.
- `users` ganha colunas de endereço estruturado: `addrLogradouro`,
  `addrNumero`, `addrComplemento`, `addrBairro`, `addrCidade`, `addrUf`,
  `addrCep`.

## Telas

- **Admin → Configurações → aba "Nota Fiscal"**:
  - Formulário de configuração fiscal (todos os campos do `fiscal_config`).
  - Upload do certificado `.pfx` + senha (mascarado; mostra validade).
  - Lista das notas emitidas (status, valor, PDF, cancelar).
- **Admin → Alunos → detalhe do aluno**: notas fiscais daquele aluno, com
  baixar PDF / reemitir / cancelar.

## Implementação em fases

1. Schema (`fiscal_config`, `invoices`, endereço em `users`) + criptografia
   do certificado + aba "Nota Fiscal" com config fiscal e upload do `.pfx`.
2. Núcleo NFS-e portado (`lib/nfse/*`) + emissão manual de um pagamento.
3. Gatilhos automáticos (webhook/checkout) + cancelamento + endereço
   obrigatório no checkout.
4. Download do PDF (DANFSE) + envio por e-mail/WhatsApp + exibição das notas
   no detalhe do aluno.

## Riscos e observações

- O endpoint DANFSE do governo é instável — por isso o PDF é re-tentável e
  não bloqueia a emissão.
- Os códigos de tributação (cTribNac/cTribMun/cNBS) e o regime tributário
  dependem do município e da atividade; config errada → nota rejeitada. O
  formulário deve deixar claro o que cada campo é. Valor padrão sugerido:
  ambiente **homologação** até o tenant validar.
- Emissão inline pode levar alguns segundos; monitorar o timeout da função.
- Certificado é dado sensível: criptografado no banco, nunca devolvido ao
  cliente, e validado contra o CNPJ da config (igual ao CODEX).
