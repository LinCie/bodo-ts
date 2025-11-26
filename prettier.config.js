/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
  semi: false,
  printWidth: 120,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  arrowParens: "avoid",
  endOfLine: "lf",
  plugins: ["prettier-plugin-organize-imports"],
  importOrder: ["^@/(.*)$", "^[./]"],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  importOrderCaseInsensitive: true,
  importOrderParserPlugins: ["typescript"],
  importOrderMergeDuplicateImports: true,
  importOrderCombineTypeSpecifier: true,
  importOrderCombineImports: true,
  importOrderGroupNamespaceSpecifiers: true,
}

export default config
