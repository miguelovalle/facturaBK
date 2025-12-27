const { SignedXml } = require('xmldsigjs');

const buildAttached = (
  signed,
  responseDian,
  ambient,
  NoFra,
  cufe,
  CodeValidation,
  fechaFactura,
  fechaAppRes,
  horaAppRes,
  nameCliente,
  nitCliente,
  dvCliente,
  tipoDocCliente
) => {
  function stripBom(text) {
    return text.replace(/^\uFEFF/, '');
  }

  function toSafeCdata(text) {
    return text.replace(/]]>/g, ']]]]><![CDATA[>');
  }

  const signedSafe = toSafeCdata(stripBom(signed));
  const responseSafe = toSafeCdata(stripBom(responseDian));

  // Obtener fecha y hora actual en zona horaria de Colombia
  const now = new Date();
  const colombiaTime = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/Bogota' })
  );

  // Formatear fecha en formato yyyy-mm-dd
  const currentDate = colombiaTime.toISOString().split('T')[0];

  // Formatear hora en formato HH:MM:SS-05:00
  const timeString = colombiaTime.toTimeString().split(' ')[0]; // HH:MM:SS
  const currentTime = `${timeString}-05:00`;

  const attached = `<?xml version='1.0' encoding='UTF-8' standalone='no'?>
<AttachedDocument xmlns='urn:oasis:names:specification:ubl:schema:xsd:AttachedDocument-2'
  xmlns:ds='http://www.w3.org/2000/09/xmldsig#'
  xmlns:cac='urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2'
  xmlns:cbc='urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2'
  xmlns:ccts='urn:un:unece:uncefact:data:specification:CoreComponentTypeSchemaModule:2'
  xmlns:ext='urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2'
  xmlns:xades='http://uri.etsi.org/01903/v1.3.2#'
  xmlns:xades141='http://uri.etsi.org/01903/v1.4.1#'>
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>Documentos adjuntos</cbc:CustomizationID>
  <cbc:ProfileID>DIAN 2.1</cbc:ProfileID>
  <cbc:ProfileExecutionID>${ambient}</cbc:ProfileExecutionID>
  <cbc:ID>${NoFra}</cbc:ID>
  <cbc:IssueDate>${currentDate}</cbc:IssueDate>
  <cbc:IssueTime>${currentTime}</cbc:IssueTime>
  <cbc:DocumentType>Contenedor de Factura Electrónica</cbc:DocumentType>
  <cbc:ParentDocumentID>${NoFra}</cbc:ParentDocumentID>
  <cac:SenderParty>
    <cac:PartyTaxScheme>
      <cbc:RegistrationName>MARINO'S BAR PESCADERO RESTAURANTE</cbc:RegistrationName>
      <cbc:CompanyID schemeAgencyID='195' schemeID='1' schemeName='31'>900415503</cbc:CompanyID>
      <cbc:TaxLevelCode>R-99-PN</cbc:TaxLevelCode>
      <cac:TaxScheme>
        <cbc:ID>ZA</cbc:ID>
        <cbc:Name>IVA e INC</cbc:Name>
      </cac:TaxScheme>
    </cac:PartyTaxScheme>
  </cac:SenderParty>
  <cac:ReceiverParty>
    <cac:PartyTaxScheme>
      <cbc:RegistrationName>${nameCliente}</cbc:RegistrationName>
      <cbc:CompanyID schemeAgencyID='195' schemeID='${dvCliente}' schemeName='${tipoDocCliente}'>${nitCliente}</cbc:CompanyID>
      <cbc:TaxLevelCode>R-99-PN</cbc:TaxLevelCode>
      <cac:TaxScheme>
        <cbc:ID>ZA</cbc:ID>
        <cbc:Name>IVA e INC</cbc:Name>
      </cac:TaxScheme>
    </cac:PartyTaxScheme>
  </cac:ReceiverParty>
  <cac:Attachment>
    <cac:ExternalReference>
      <cbc:MimeCode>text/xml</cbc:MimeCode>
      <cbc:EncodingCode>UTF-8</cbc:EncodingCode>
      <cbc:Description>
        <![CDATA[${signedSafe}]]>
      </cbc:Description>
    </cac:ExternalReference>
  </cac:Attachment>
  <cac:ParentDocumentLineReference>
    <cbc:LineID>1</cbc:LineID>
    <cac:DocumentReference>
      <cbc:ID>${NoFra}</cbc:ID>
      <cbc:UUID schemeName='CUFE-SHA384'>${cufe}</cbc:UUID>
      <cbc:IssueDate>${fechaFactura}</cbc:IssueDate>
      <cbc:DocumentType>ApplicationResponse</cbc:DocumentType>
      <cac:Attachment>
        <cac:ExternalReference>
          <cbc:MimeCode>text/xml</cbc:MimeCode>
          <cbc:EncodingCode>UTF-8</cbc:EncodingCode>
          <cbc:Description>
            <![CDATA[${responseSafe}]]>
          </cbc:Description>
        </cac:ExternalReference>
      </cac:Attachment>
      <cac:ResultOfVerification>
        <cbc:ValidatorID>Unidad Especial Dirección de Impuestos y Aduanas Nacionales</cbc:ValidatorID>
        <cbc:ValidationResultCode>${CodeValidation}</cbc:ValidationResultCode>
        <cbc:ValidationDate>${fechaAppRes}</cbc:ValidationDate>
        <cbc:ValidationTime>${horaAppRes}</cbc:ValidationTime>
      </cac:ResultOfVerification>
    </cac:DocumentReference>
  </cac:ParentDocumentLineReference>
</AttachedDocument>
`;

  return attached;
};

module.exports = { buildAttached };
