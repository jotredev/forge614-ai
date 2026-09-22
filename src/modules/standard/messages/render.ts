import { en } from "./en";
import { es } from "./es";
import type { Locale, MessageKey, MessageParams } from "./types";
const catalogs = { es, en } as const;
export function renderMessage(key: MessageKey, params: MessageParams, locale: Locale): string {
  return catalogs[locale][key](params);
}
