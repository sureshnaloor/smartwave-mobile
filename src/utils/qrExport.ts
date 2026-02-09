/**
 * Generate QR code as base64 PNG without using react-native-svg's native toDataURL.
 * Uses qrcode's server (PNG) renderer so it works on iOS with New Architecture
 * where the SVG registry returns a different view type and toDataURL fails.
 * Uses renderToBuffer + safe output handling to avoid "toString of undefined" from the library.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const QRCodeCreate = require("qrcode/lib/server").create;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PngRenderer = require("qrcode/lib/renderer/png");

const DEFAULT_SIZE = 256;

/**
 * Returns a promise that resolves to the base64 PNG string (no data URL prefix).
 */
export function generateQRBase64(
  text: string,
  size: number = DEFAULT_SIZE
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (text == null || typeof text !== "string") {
      reject(new Error("QR content must be a non-empty string"));
      return;
    }
    const opts = {
      type: "image/png" as const,
      width: size,
      margin: 1,
      errorCorrectionLevel: "H" as const,
    };
    try {
      const qrData = QRCodeCreate(text, opts);
      PngRenderer.renderToBuffer(qrData, opts, (err: Error | null, output: Buffer | undefined) => {
        try {
          if (err) {
            reject(err);
            return;
          }
          if (output == null || typeof output.toString !== "function") {
            reject(new Error("QR image could not be generated"));
            return;
          }
          const base64 = String(output.toString("base64")).replace(/(\r\n|\n|\r)/gm, "");
          resolve(base64);
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      });
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}
