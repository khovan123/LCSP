declare module "qrcode" {
  export type QRCodeErrorCorrectionLevel =
    | "low"
    | "medium"
    | "quartile"
    | "high"
    | "L"
    | "M"
    | "Q"
    | "H";

  export function toDataURL(
    text: string,
    options?: {
      errorCorrectionLevel?: QRCodeErrorCorrectionLevel;
      margin?: number;
      width?: number;
    },
  ): Promise<string>;
}
