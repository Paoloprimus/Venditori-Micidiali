// types/pdf-parse.d.ts
declare module "pdf-parse" {
  export interface PDFData {
    text: string;
    numpages: number;
    numrender: number;
    info?: any;
    metadata?: any;
    version?: string;
  }
  // Firma compatibile con l'uso nel progetto
  const pdfParse: (data: Buffer | Uint8Array | ArrayBuffer, options?: any) => Promise<PDFData>;
  export default pdfParse;
}
