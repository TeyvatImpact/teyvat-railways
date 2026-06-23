// ===== 标签配置 =====

/** 标签背景色 */
export const LABEL_BG = 'rgba(255,255,255,0.2)';

/** 标签内边距（px），文字与标签框边缘之间的距离 */
export const pad = 2;

/** 中文字体大小（px） */
export const fsCNSmall = 12;

/** 英文字体大小（px） */
export const fsENSmall = 8;

/** 站点与标签之间的间距（px） */
export const gap = 2;

/** 标签内中文与英文的垂直间距（px） */
export const textGap = 2;

/** 站点圆圈的半径（px） */
export const stationR = 8;

// ===== 线路配置 =====

/** 线路的描边宽度（px） */
export const LINE_WIDTH = 4;

/** 线路颜色调色板，多线路循环使用 */
export const palette = [
  '#e6194b',
  '#3cb44b',
  '#ffe119',
  '#4363d8',
  '#f58231',
  '#911eb4',
  '#42d4f4',
  '#f032e6',
  '#bfef45',
  '#fabed4',
  '#469990',
  '#dcbeff',
  '#9a6324',
  '#800000',
  '#aaffc3',
  '#808000',
  '#ffd8b1',
  '#000075',
  '#a9a9a9',
  '#e6beff',
];

// ===== 坐标与缩放配置 =====

/** 数据坐标中每 1 单位对应的像素数 */
export const BLOCK_SIZE = 50;

/** 边界留白（数据坐标单位），用于计算 SVG 尺寸时的额外边距 */
export const margin = 2;



// ===== 标注配置 =====

/** 标注路径描边颜色 */
export const MARKER_STROKE = '#ff00007f';

/** 标注路径描边宽度（px） */
export const MARKER_STROKE_WIDTH = 2;

/** 标注路径填充色 */
export const MARKER_FILL = 'none';

/** 标注文字字号（px） */
export const MARKER_FONT_SIZE = 32;

/** 标注文字颜色 */
export const MARKER_TEXT_FILL = '#ff000077';

/** 标注文字字体 */
export const MARKER_FONT_FAMILY = 'sans-serif';

// ===== 网格配置 =====

/** 背景网格线的步长（px） */
export const gridStep = 50;

// ===== 特殊线路配置 =====

/** 轮渡线路颜色 */
export const FERRY_COLOR = '#0d47a13f';

/** 轮渡线路高亮色（无透明通道版本） */
export const FERRY_COLOR_HIGHLIGHT = '#0d47a1';

/** 轮渡线路描边宽度（px） */
export const FERRY_LINE_WIDTH = 2;

/** 轮渡线路虚线样式 */
export const FERRY_DASH = '8,5';

/** 同站点连接线颜色 */
export const SAME_COLOR = '#0000003f';

/** 同站点连接线描边宽度（px） */
export const SAME_LINE_WIDTH = 2;
