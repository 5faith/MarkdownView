/**
 * 主题样式入口：themes/ 下每个 scss = 一个主题，新增主题只需新增文件
 * （默认主题写 :root，其余写 html[data-theme='<name>']）。
 * 还需同步 src/types/index.ts 的 AppTheme 与 MenuBar 的主题菜单项。
 */
export const themeStyles = import.meta.glob('./themes/*.scss', { eager: true })
