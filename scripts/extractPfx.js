// ... existing code ...
const fs = require('fs');
const path = require('path');
const forge = require('node-forge');

function usage() {
  console.log(
    'Uso: node scripts\\extractPfx.js <rutaP12> <passwordP12> [passphraseClavePrivada]'
  );
  console.log('Ejemplos:');
  console.log(
    '  node scripts\\extractPfx.js .\\anfes\\Certifica.p12 "PASSWORD_P12"'
  );
  console.log(
    '  node scripts\\extractPfx.js .\\anfes\\Certifica.p12 "PASSWORD_P12" "PASS_CLAVE_PRIVADA"'
  );
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFileNonEmpty(filePath, content, label) {
  if (!content || !content.trim()) {
    throw new Error(`${label} está vacío; no se escribirá en ${filePath}`);
  }
  fs.writeFileSync(filePath, content, { encoding: 'utf-8' });
  const size = fs.statSync(filePath).size;
  if (size === 0) {
    throw new Error(
      `${label} tiene tamaño 0 después de escribir en ${filePath}`
    );
  }
}

function certToBase64(cert) {
  const asn1Cert = forge.pki.certificateToAsn1(cert);
  const derBytes = forge.asn1.toDer(asn1Cert).getBytes();
  return forge.util.encode64(derBytes);
}

function extractPrivateKeyFromP12(p12) {
  const pkcs8Bags =
    p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
      forge.pki.oids.pkcs8ShroudedKeyBag
    ] || [];
  if (pkcs8Bags.length > 0 && pkcs8Bags[0].key) {
    return pkcs8Bags[0].key;
  }
  const keyBags =
    p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] ||
    [];
  if (keyBags.length > 0 && keyBags[0].key) {
    return keyBags[0].key;
  }
  throw new Error(
    'No se encontró ninguna clave privada en el .p12 (pkcs8ShroudedKeyBag ni keyBag).'
  );
}

function exportPrivateKeyPem(privKey, passphrase) {
  if (!passphrase) {
    return forge.pki.privateKeyToPem(privKey);
  }
  try {
    return forge.pki.encryptRsaPrivateKey(privKey, passphrase, {
      algorithm: 'aes256',
    });
  } catch (e) {
    console.warn(
      'No se pudo cifrar la clave como RSA; se exportará sin cifrado.'
    );
    return forge.pki.privateKeyToPem(privKey);
  }
}

function main() {
  const [p12PathArg, p12Password, keyPassphrase] = process.argv.slice(2);
  if (!p12PathArg || !p12Password) {
    usage();
    process.exit(1);
  }

  const projectRoot = path.resolve(__dirname, '..');
  const outputDir = path.join(projectRoot, 'andes');
  ensureDir(outputDir);

  const p12Path = path.isAbsolute(p12PathArg)
    ? p12PathArg
    : path.join(projectRoot, p12PathArg);

  if (!fs.existsSync(p12Path)) {
    throw new Error(`No existe el archivo .p12 en: ${p12Path}`);
  }

  console.log(`Leyendo .p12: ${p12Path}`);
  const p12Der = fs.readFileSync(p12Path, { encoding: 'binary' });
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, p12Password);

  const certBags =
    p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ||
    [];
  if (certBags.length === 0 || !certBags[0].cert) {
    throw new Error('No se encontró un certificado (certBag) dentro del .p12.');
  }
  const cert = certBags[0].cert;

  const certPem = forge.pki.certificateToPem(cert);
  const certBase64 = certToBase64(cert);

  const certPemPath = path.join(outputDir, 'certificate.pem');
  const certBase64Path = path.join(outputDir, 'cert_base64.txt');

  writeFileNonEmpty(certPemPath, certPem, 'El certificado (PEM)');
  writeFileNonEmpty(certBase64Path, certBase64, 'El certificado (Base64 DER)');

  console.log(`Certificado escrito en: ${certPemPath}`);
  console.log(
    `Certificado Base64 para BinarySecurityToken en: ${certBase64Path}`
  );

  const privKey = extractPrivateKeyFromP12(p12);
  const privKeyPem = exportPrivateKeyPem(privKey, keyPassphrase);

  const privKeyPath = path.join(outputDir, 'private_key.pem');
  writeFileNonEmpty(privKeyPath, privKeyPem, 'La clave privada (PEM)');

  const firstLine = fs.readFileSync(privKeyPath, 'utf-8').split(/\r?\n/)[0];
  const validHeader =
    /^-----BEGIN (ENCRYPTED )?PRIVATE KEY-----$/.test(firstLine) ||
    /^-----BEGIN RSA PRIVATE KEY-----$/.test(firstLine);
  if (!validHeader) {
    throw new Error(
      `La clave privada en ${privKeyPath} no tiene un encabezado PEM válido: ${firstLine}`
    );
  }

  console.log(`Clave privada escrita en: ${privKeyPath}`);
  if (keyPassphrase) {
    console.log(
      'La clave privada está cifrada; añade ANDES_KEY_PASSPHRASE en tu .env.'
    );
  }

  console.log('Todo OK. Archivos generados en ./andes.');
}

try {
  main();
} catch (err) {
  console.error('Fallo al extraer .p12:', err.message);
  process.exit(1);
}
// ... existing code ... ... existing code ...
