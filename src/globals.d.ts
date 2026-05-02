declare module "*.css" {
  const url: string;
  export default url;
}

declare module "*.css?inline" {
  const content: string;
  export default content;
}
