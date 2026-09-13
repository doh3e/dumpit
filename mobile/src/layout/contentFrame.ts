export const CONTENT_FRAME_MAX_WIDTH = 760;

export function contentFrame(width: number, leftInset: number, rightInset: number, padding = 16) {
  const available = Math.max(0, width - leftInset - rightInset);
  const gutter = Math.max(0, (available - CONTENT_FRAME_MAX_WIDTH) / 2);
  return { paddingLeft: leftInset + gutter + padding, paddingRight: rightInset + gutter + padding };
}
