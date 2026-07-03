export const DEFAULT_CARD_EXPORT_WIDTH = 1050;
export const DEFAULT_CARD_EXPORT_HEIGHT = 600;
export const CARD_ASPECT_RATIO = DEFAULT_CARD_EXPORT_WIDTH / DEFAULT_CARD_EXPORT_HEIGHT;

export function getDisplayExportDimensions(displayWidth: number, displayHeight: number) {
  if (displayWidth <= 0 || displayHeight <= 0) {
    return { width: DEFAULT_CARD_EXPORT_WIDTH, height: DEFAULT_CARD_EXPORT_HEIGHT };
  }
  return {
    width: Math.round(displayWidth),
    height: Math.round(displayHeight),
  };
}

export function dimensionsFromWidth(width: number, lockAspectRatio: boolean, height: number) {
  if (!lockAspectRatio) {
    return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
  }
  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(width / CARD_ASPECT_RATIO)),
  };
}

export function dimensionsFromHeight(height: number, lockAspectRatio: boolean, width: number) {
  if (!lockAspectRatio) {
    return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
  }
  return {
    width: Math.max(1, Math.round(height * CARD_ASPECT_RATIO)),
    height: Math.max(1, Math.round(height)),
  };
}

export function scaleForExport(exportWidth: number, displayWidth: number) {
  if (displayWidth <= 0) return 1;
  return exportWidth / displayWidth;
}

export function safeCardFilename(name: string, suffix: string) {
  const safeName = name.replace(/\s+/g, "_");
  return `${safeName}_${suffix}`;
}
