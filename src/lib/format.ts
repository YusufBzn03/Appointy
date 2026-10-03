/** BCP-47 tag for a UI locale; Serbian is shown in Latin script. */
export function intlLocale(locale: string): string {
  return locale === "sr" ? "sr-Latn" : locale;
}

/** "heute, 16:30" / "morgen, 10:00" / "gestern, 19:47" / "Fr., 3. Okt., 09:30" in the UI language. */
export function formatRelativeDateTime(iso: string, locale: string): string {
  const lang = intlLocale(locale);
  const d = new Date(iso);
  const now = new Date();
  const days = Math.round(
    (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() -
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      86_400_000
  );
  const time = d.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });
  const day =
    Math.abs(days) <= 1
      ? new Intl.RelativeTimeFormat(lang, { numeric: "auto" }).format(days, "day")
      : d.toLocaleDateString(lang, { weekday: "short", day: "numeric", month: "short" });
  return `${day}, ${time}`;
}
