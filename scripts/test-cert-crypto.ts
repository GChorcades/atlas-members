import { encryptSecret, decryptSecret } from '../lib/nfse/cert-crypto.js';

process.env.AUTH_SECRET ??= 'test-secret-para-rodar-o-script';
const original = 'conteúdo-sensível-do-certificado-12345';
const enc = encryptSecret(original);
if (enc === original) throw new Error('não cifrou');
const dec = decryptSecret(enc);
if (dec !== original) throw new Error(`decifrou errado: ${dec}`);
console.log('OK cert-crypto: round-trip íntegro');
