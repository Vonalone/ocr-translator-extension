import en from "../../../src/public/_locales/en/messages.json";

type Catalog = Record<string, { message: string }>;

export function t(key: string, substitutions?: string | string[]): string {
  const message = (en as Catalog)[key]?.message ?? key;
  const values = Array.isArray(substitutions)
    ? substitutions
    : substitutions === undefined
      ? []
      : [substitutions];
  return message.replace(/\$(\d+)/g, (_, index: string) =>
    values[Number(index) - 1] ?? "",
  );
}
