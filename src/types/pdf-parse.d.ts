declare module "pdf-parse" {
  interface PDFInfo {
    Title?: string;
    Author?: string;
    [key: string]: unknown;
  }

  interface PDFData {
    numpages: number;
    text: string;
    info: PDFInfo;
  }

  interface PDFOptions {
    pagerender?: (pageData: {
      getTextContent: () => Promise<{ items: { str: string; transform?: number[] }[] }>;
    }) => Promise<string>;
    max?: number;
  }

  function pdf(buffer: Buffer, options?: PDFOptions): Promise<PDFData>;
  export default pdf;
}
