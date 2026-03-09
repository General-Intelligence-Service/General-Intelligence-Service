declare module "bidi" {
  export function bidi(
    text: string,
    options?: { baseDir?: "ltr" | "rtl" }
  ): string;
}

