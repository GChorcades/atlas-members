import { SignedXml } from "xml-crypto";
import forge from "node-forge";

export type CertMaterial = {
  privateKeyPem: string;
  certificatePem: string;
  certificateBase64: string;
  subject: string | null;
  serialNumber: string | null;
  validFrom: string | null;
  validTo: string | null;
  documentNumber: string | null;
};

type CompanyIdentity = {
  nome?: string | null;
  cnpj?: string | null;
};

function normalizeDigits(value?: string | null) {
  return String(value ?? "").replace(/\D+/g, "");
}

function extractDigitCandidates(value?: string | null) {
  const text = String(value ?? "");
  const matches = text.match(/\d{11,14}/g) ?? [];
  return matches.filter((item) => item.length === 11 || item.length === 14);
}

function pickDocumentNumber(values: Array<string | undefined | null>) {
  for (const value of values) {
    const candidate = extractDigitCandidates(value).find((item) => item.length === 14);
    if (candidate) return candidate;
  }
  for (const value of values) {
    const candidate = extractDigitCandidates(value).find((item) => item.length === 11);
    if (candidate) return candidate;
  }
  for (const value of values) {
    const digits = normalizeDigits(value);
    if (digits.length === 14 || digits.length === 11) return digits;
  }
  return null;
}

function getCertificateMetadata(cert: forge.pki.Certificate) {
  const attributes = (cert.subject.attributes ?? []) as Array<{
    shortName?: string;
    name?: string;
    value?: unknown;
  }>;
  const subject = attributes
    .map((attr) => `${attr.shortName ?? attr.name}=${attr.value}`)
    .join(", ");
  const highPriorityValues = attributes
    .filter((attr) => {
      const key = String(attr.shortName ?? attr.name ?? "").toLowerCase();
      return key === "cn" || key === "commonname" || key === "serialnumber";
    })
    .map((attr) => String(attr.value ?? ""));
  const fallbackValues = attributes
    .filter((attr) => {
      const key = String(attr.shortName ?? attr.name ?? "").toLowerCase();
      return key !== "cn" && key !== "commonname" && key !== "serialnumber";
    })
    .map((attr) => String(attr.value ?? ""));
  const documentNumber = pickDocumentNumber([
    ...highPriorityValues,
    cert.serialNumber,
    ...fallbackValues
  ]);

  return {
    subject: subject || null,
    serialNumber: cert.serialNumber ?? null,
    validFrom: cert.validity?.notBefore?.toISOString?.() ?? null,
    validTo: cert.validity?.notAfter?.toISOString?.() ?? null,
    documentNumber
  };
}

export function loadPfxFromBuffer(pfxBuffer: Buffer, passphrase: string): CertMaterial {
  const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString("binary"));
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, passphrase);

  const pkcs8Bags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
    forge.pki.oids.pkcs8ShroudedKeyBag
  ] ?? [];
  const keyBags = p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] ?? [];
  const keyBag = pkcs8Bags[0] ?? keyBags[0];
  if (!keyBag?.key) {
    throw new Error("Private key not found in PFX");
  }
  const privateKeyPem = forge.pki.privateKeyToPem(keyBag.key as forge.pki.PrivateKey);

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certBag = certBags[forge.pki.oids.certBag]?.[0];
  if (!certBag) {
    throw new Error("Certificate not found in PFX");
  }
  const certificate = certBag.cert as forge.pki.Certificate;
  const certificatePem = forge.pki.certificateToPem(certificate);
  const certificateBase64 = certificatePem
    .replace("-----BEGIN CERTIFICATE-----", "")
    .replace("-----END CERTIFICATE-----", "")
    .replace(/\s+/g, "");
  const metadata = getCertificateMetadata(certificate);

  return { privateKeyPem, certificatePem, certificateBase64, ...metadata };
}

export function ensureCertificateMatchesCompany(cert: CertMaterial, company: CompanyIdentity) {
  const companyCnpj = normalizeDigits(company.cnpj);
  if (!companyCnpj || !cert.documentNumber) return;
  if (cert.documentNumber === companyCnpj) return;

  throw new Error(
    `O certificado cadastrado pertence ao documento ${cert.documentNumber}, mas a empresa ativa ${company.nome ?? ""} usa o CNPJ ${companyCnpj}.`
  );
}

export function signXml(
  xml: string,
  referenceId: string,
  cert: CertMaterial,
  referenceXPath = "//*[local-name()='infNFSe']",
  signatureParentXPath = "//*[local-name()='NFSe']"
) {
  const sig = new SignedXml({
    canonicalizationAlgorithm: "http://www.w3.org/2001/10/xml-exc-c14n#WithComments",
    signatureAlgorithm: "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"
  });

  sig.addReference({
    xpath: referenceXPath,
    transforms: [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/2001/10/xml-exc-c14n#WithComments"
    ],
    digestAlgorithm: "http://www.w3.org/2001/04/xmlenc#sha256",
    uri: `#${referenceId}`
  });

  // xml-crypto v6 uses `privateKey` and `publicCert`.
  (sig as unknown as { privateKey: string }).privateKey = cert.privateKeyPem;
  (sig as unknown as { publicCert: string }).publicCert = cert.certificatePem;
  sig.idAttributes = ["Id"];

  sig.computeSignature(xml, {
    location: { reference: signatureParentXPath, action: "append" }
  });

  return sig.getSignedXml();
}
