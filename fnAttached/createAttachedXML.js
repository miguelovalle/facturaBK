const createAttachedXML = (data) => {
  const { DateTime } = require('luxon');
  const fs = require('fs');

  const formattedDate = DateTime.now().toFormat('yyyy-MM-dd');

  const formattedTime = DateTime.now().toFormat('HH:mm:ss ZZZZ');

  const signedBill = fs.readFile('data.nameFra', (err, data) => {
    if (err) {
      console.error(err);
      return;
    }

    // FALTA OBTENER EL APPRESPONSE ENVIADO POR LA DIAN VALIDANDO ESTA FACTURA

    const attached = `
    <?xml version='1.0' encoding='UTF-8' standalone='no'?>
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
    <cbc:ProfileExecutionID>1</cbc:ProfileExecutionID>
    <cbc:ID>${data.noFactura}R09E201717</cbc:ID>
    <cbc:IssueDate>${formattedDate}</cbc:IssueDate>
    <cbc:IssueTime>${formattedTime}</cbc:IssueTime>
    <cbc:DocumentType>Contenedor de Factura Electrónica</cbc:DocumentType>
    <cbc:ParentDocumentID>${data.noFactura}R09E201717</cbc:ParentDocumentID>
    <cac:SenderParty>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${data.nombreEmisor}</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID='195' schemeID='1' schemeName='31'>${data.nitEmisor}</cbc:CompanyID>
        <cbc:TaxLevelCode>R-99-PN</cbc:TaxLevelCode>
        <cac:TaxScheme>
          <cbc:ID>ZA</cbc:ID>
          <cbc:Name>IVA e INC</cbc:Name>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:SenderParty>
    <cac:ReceiverParty>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${data.nombreCliente}</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID='195' schemeID='${data.dvCliente}' schemeName='${data.tipoDcto}'${data.nitCliente}</cbc:CompanyID>
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
          <![CDATA[${signedBill}]]>
        </cbc:Description>
      </cac:ExternalReference>
    </cac:Attachment>
    <cac:ParentDocumentLineReference>
      <cbc:LineID>1</cbc:LineID>
      <cac:DocumentReference>
        <cbc:ID>${data.noFactura}</cbc:ID>
        <cbc:UUID schemeName='CUFE-SHA384'>${data.cufeFra}</cbc:UUID>
        <cbc:IssueDate>${data.fechaFactura}</cbc:IssueDate>
        <cbc:DocumentType>ApplicationResponse</cbc:DocumentType>
        <cac:Attachment>
          <cac:ExternalReference>
            <cbc:MimeCode>text/xml</cbc:MimeCode>
            <cbc:EncodingCode>UTF-8</cbc:EncodingCode>
            <cbc:Description>
              <![CDATA[ <?xml version='1.0' encoding='utf-8' standalone='no'?><ApplicationResponse xmlns:cac='urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2' xmlns:cbc='urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2' xmlns:ext='urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2' xmlns:sts='dian:gov:co:facturaelectronica:Structures-2-1' xmlns:ds='http://www.w3.org/2000/09/xmldsig#' xmlns='urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2'> <ext:UBLExtensions> <ext:UBLExtension> <ext:ExtensionContent> <sts:DianExtensions> <sts:InvoiceSource> <cbc:IdentificationCode listAgencyID='6' listAgencyName='United Nations Economic Commission for Europe' listSchemeURI='urn:oasis:names:specification:ubl:codelist:gc:CountryIdentificationCode-2.1'>CO</cbc:IdentificationCode> </sts:InvoiceSource> <sts:SoftwareProvider> <sts:ProviderID schemeID='4' schemeName='31' schemeAgencyID='195' schemeAgencyName='CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)'>800197268</sts:ProviderID> <sts:SoftwareID schemeAgencyID='195' schemeAgencyName='CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)'>...</sts:SoftwareID> </sts:SoftwareProvider> <sts:SoftwareSecurityCode schemeAgencyID='195' schemeAgencyName='CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)'>...</sts:SoftwareSecurityCode> <sts:AuthorizationProvider> <sts:AuthorizationProviderID schemeID='4' schemeName='31' schemeAgencyID='195' schemeAgencyName='CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)'>800197268</sts:AuthorizationProviderID> </sts:AuthorizationProvider> </sts:DianExtensions> </ext:ExtensionContent> </ext:UBLExtension> <ext:UBLExtension> <ext:ExtensionContent><ds:Signature xmlns:ds='http://www.w3.org/2000/09/xmldsig#' Id='Signature-1eedfc78-b973-40f2-b839-6688500c1d40'><ds:SignedInfo><ds:CanonicalizationMethod Algorithm='http://www.w3.org/TR/2001/REC-xml-c14n-20010315' /><ds:SignatureMethod Algorithm='http://www.w3.org/2001/04/xmldsig-more#rsa-sha256' /><ds:Reference Id='Reference-4a73c5d3-099b-4a5c-a274-c617f0f7a0c8' URI=''><ds:Transforms><ds:Transform Algorithm='http://www.w3.org/2000/09/xmldsig#enveloped-signature' /></ds:Transforms><ds:DigestMethod Algorithm='http://www.w3.org/2001/04/xmlenc#sha256' /><ds:DigestValue>v/JDnwxu61dzTlWvHpXUu4EYGizEG5VjGqSfKEMf4qI=</ds:DigestValue></ds:Reference><ds:Reference Id='ReferenceKeyInfo' URI='#Signature-1eedfc78-b973-40f2-b839-6688500c1d40-KeyInfo'><ds:DigestMethod Algorithm='http://www.w3.org/2001/04/xmlenc#sha256' /><ds:DigestValue>cg9IRTi+sXEwfjJiTi9TKM25TNeoeN5mx4EpURb+/4k=</ds:DigestValue></ds:Reference><ds:Reference Type='http://uri.etsi.org/01903#SignedProperties' URI='#xmldsig-Signature-1eedfc78-b973-40f2-b839-6688500c1d40-signedprops'><ds:DigestMethod Algorithm='http://www.w3.org/2001/04/xmlenc#sha256' /><ds:DigestValue>QDEV7Ji9NSLhUjUsyUKx2iZdnB9gUprCygO3yal3YUY=</ds:DigestValue></ds:Reference></ds:SignedInfo><ds:SignatureValue Id='SignatureValue-1eedfc78-b973-40f2-b839-6688500c1d40'>RqLHYtJJhLKbPPxaIIthHWXAG3Q1PlRh3BW78+SyVyremxwmuPswxyB3enXpL5Osk6L6JV3sbZAzZvgceSVzA4AKi13h453gPDVxybiHg84jzWIs1GHWe4idVT8/K58Lu9EzXuJyh1Qvy82kfToEH84ycVygl3Cp8qwg57zUXW4nUg6VEpykSezUXg2E37+sdyAQbedPDvSJBfuEoeKKkv3Q17JkSg5dqF2O8p4M+4K3F/rw54/NBSsgBIM/yx3X8+pBp3divR3EeLWb3HU28wjSX5NnaOaaIyWvexmuMYwnp3J8OBKgwuuE0AFqcg8s3HGDdaIWJyfzEXSimNtj/g==</ds:SignatureValue><ds:KeyInfo Id='Signature-1eedfc78-b973-40f2-b839-6688500c1d40-KeyInfo'><ds:X509Data><ds:X509Certificate>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</ds:X509Certificate></ds:X509Data><ds:KeyValue><ds:RSAKeyValue><ds:Modulus>tWs5fz5itJqoQso9/1bjGCG5QmXB+fap4mQmdIE5NDUV+swjUcz7Na0gcTIAOxejr9XPybN1dbyZlI871J2sB67VUSJ9Mt+kF0n6w25sr1gGqEp36RCHCprqmpJPwWitLLrflpp+xNnu2BPOpO365RjjaPqnX7uu3uOEFxzJZqyLu7bGuB9Ob/pQww1KlHbQ8ThHMzRQ/aHIR1DU0NRo9D3Z7u/IyTvbpBrRXy6UWqrlHyS/uDzct2RZvUH6hwt1TlZWRJp6oa0IwcewJ1cRRvuzBwXO/FtQTvkv10x1sjhi906JMqUZivilIpo72H/7i4uhjF0Jwo8iwLSTYH1/Bw==</ds:Modulus><ds:Exponent>AQAB</ds:Exponent></ds:RSAKeyValue></ds:KeyValue></ds:KeyInfo><ds:Object Id='XadesObjectId-be385f00-b689-4df9-9b52-3da25a3b859b'><xades:QualifyingProperties xmlns:xades='http://uri.etsi.org/01903/v1.3.2#' Id='QualifyingProperties-0bc715a7-54a4-4648-bace-d136a10af9f2' Target='#Signature-1eedfc78-b973-40f2-b839-6688500c1d40'><xades:SignedProperties Id='xmldsig-Signature-1eedfc78-b973-40f2-b839-6688500c1d40-signedprops'><xades:SignedSignatureProperties><xades:SigningTime>2024-08-02T15:21:36+00:00</xades:SigningTime><xades:SigningCertificate><xades:Cert><xades:CertDigest><ds:DigestMethod Algorithm='http://www.w3.org/2001/04/xmlenc#sha256' /><ds:DigestValue>BJbBGalZ6U+wEJrRUD69hteZS82kztgHYNSMJsw4P5I=</ds:DigestValue></xades:CertDigest><xades:IssuerSerial><ds:X509IssuerName>C=CO, L=Bogota D.C., O=GSE, OU=PKI, CN=Autoridad Subordinada 01 GSE, E=info@gse.com.co</ds:X509IssuerName><ds:X509SerialNumber>198088280759436681347400</ds:X509SerialNumber></xades:IssuerSerial></xades:Cert></xades:SigningCertificate><xades:SignaturePolicyIdentifier><xades:SignaturePolicyId><xades:SigPolicyId><xades:Identifier>https://facturaelectronica.dian.gov.co/politicadefirma/v2/politicadefirmav2.pdf</xades:Identifier><xades:Description /></xades:SigPolicyId><xades:SigPolicyHash><ds:DigestMethod Algorithm='http://www.w3.org/2001/04/xmlenc#sha256' /><ds:DigestValue>dMoMvtcG5aIzgYo0tIsSQeVJBDnUnfSOfBpxXrmor0Y=</ds:DigestValue></xades:SigPolicyHash></xades:SignaturePolicyId></xades:SignaturePolicyIdentifier><xades:SignerRole><xades:ClaimedRoles><xades:ClaimedRole>supplier</xades:ClaimedRole></xades:ClaimedRoles></xades:SignerRole></xades:SignedSignatureProperties><xades:SignedDataObjectProperties><xades:DataObjectFormat ObjectReference='#Reference-4a73c5d3-099b-4a5c-a274-c617f0f7a0c8'><xades:MimeType>text/xml</xades:MimeType><xades:Encoding>UTF-8</xades:Encoding></xades:DataObjectFormat></xades:SignedDataObjectProperties></xades:SignedProperties></xades:QualifyingProperties></ds:Object></ds:Signature></ext:ExtensionContent> </ext:UBLExtension> </ext:UBLExtensions> <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID> <cbc:CustomizationID>1</cbc:CustomizationID> <cbc:ProfileID>DIAN 2.1</cbc:ProfileID> <cbc:ProfileExecutionID>1</cbc:ProfileExecutionID> <cbc:ID>93246510</cbc:ID> <cbc:UUID schemeName='CUDE-SHA384'>4a2bfa254fefd028ac5020d425b8d4cb1f7c45ed01fbe5cb8bbdb35d0e70db877ddc50d2d14353371f0ee173695552da</cbc:UUID> <cbc:IssueDate>2024-08-02</cbc:IssueDate> <cbc:IssueTime>15:21:36-05:00</cbc:IssueTime> <cac:SenderParty> <cac:PartyTaxScheme> <cbc:RegistrationName>Unidad Especial Dirección de Impuestos y Aduanas Nacionales</cbc:RegistrationName> <cbc:CompanyID schemeID='4' schemeName='31'>800197268</cbc:CompanyID> <cac:TaxScheme> <cbc:ID>01</cbc:ID> <cbc:Name>IVA</cbc:Name> </cac:TaxScheme> </cac:PartyTaxScheme> </cac:SenderParty> <cac:ReceiverParty> <cac:PartyTaxScheme> <cbc:RegistrationName>CREPES Y WAFFLES S A</cbc:RegistrationName> <cbc:CompanyID schemeID='1' schemeName='31'>860076919</cbc:CompanyID> <cac:TaxScheme> <cbc:ID>01</cbc:ID> <cbc:Name>IVA</cbc:Name> </cac:TaxScheme> </cac:PartyTaxScheme> </cac:ReceiverParty> <cac:DocumentResponse> <cac:Response> <cbc:ResponseCode>02</cbc:ResponseCode> <cbc:Description>Documento validado por la DIAN</cbc:Description> </cac:Response> <cac:DocumentReference> <cbc:ID>R09E201717</cbc:ID> <cbc:UUID schemeName='CUFE-SHA384'>a4ec7a80f00431d782ed2252dd28e07d33238244ecf6faa6bf2eb295bfb14faed6ce6d0a7c42cb1eb57a30292aa45d49</cbc:UUID> </cac:DocumentReference> <cac:LineResponse> <cac:LineReference> <cbc:LineID>1</cbc:LineID> </cac:LineReference> <cac:Response> <cbc:ResponseCode>0000</cbc:ResponseCode> <cbc:Description>0</cbc:Description> </cac:Response> </cac:LineResponse> <cac:LineResponse> <cac:LineReference> <cbc:LineID>2</cbc:LineID> </cac:LineReference> <cac:Response> <cbc:ResponseCode>RUT01</cbc:ResponseCode> <cbc:Description>La validación del estado del RUT próximamente estará disponible.</cbc:Description> </cac:Response> </cac:LineResponse> </cac:DocumentResponse> </ApplicationResponse> ]]>
            </cbc:Description>
          </cac:ExternalReference>
        </cac:Attachment>
        <cac:ResultOfVerification>
          <cbc:ValidatorID>Unidad Especial Dirección de Impuestos y Aduanas Nacionales</cbc:ValidatorID>
          <cbc:ValidationResultCode>02</cbc:ValidationResultCode>
          <cbc:ValidationDate>2024-08-02</cbc:ValidationDate>
          <cbc:ValidationTime>15:21:36-05:00</cbc:ValidationTime>
        </cac:ResultOfVerification>
      </cac:DocumentReference>
    </cac:ParentDocumentLineReference>
  </AttachedDocument>
  `;

    return attached;
  });
};
module.exports = createAttachedXML;
