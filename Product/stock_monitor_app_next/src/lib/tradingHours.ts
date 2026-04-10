export type TokyoMarketSession =
  | "pre_open"
  | "morning"
  | "lunch_break"
  | "afternoon"
  | "after_close"
  | "weekend";

const TOKYO_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Tokyo",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

function getTokyoClock(date: Date): { weekday: string; minutes: number } {
  const parts = TOKYO_FORMATTER.formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");

  return {
    weekday,
    minutes: hour * 60 + minute
  };
}

export function getTokyoMarketSession(date: Date = new Date()): TokyoMarketSession {
  const { weekday, minutes } = getTokyoClock(date);
  if (weekday === "Sat" || weekday === "Sun") {
    return "weekend";
  }

  if (minutes < 9 * 60) {
    return "pre_open";
  }
  if (minutes < 11 * 60 + 30) {
    return "morning";
  }
  if (minutes < 12 * 60 + 30) {
    return "lunch_break";
  }
  if (minutes < 15 * 60 + 30) {
    return "afternoon";
  }
  return "after_close";
}

export function isTokyoTradingHours(date: Date = new Date()): boolean {
  const session = getTokyoMarketSession(date);
  return session === "morning" || session === "afternoon";
}

export function resolveDefaultNikkeiTimeframe(date: Date = new Date()): "5m" | "1d" {
  return isTokyoTradingHours(date) ? "5m" : "1d";
}

export function formatTokyoMarketSessionLabel(session: TokyoMarketSession): string {
  switch (session) {
    case "pre_open":
      return "寄り前";
    case "morning":
      return "前場";
    case "lunch_break":
      return "昼休み";
    case "afternoon":
      return "後場";
    case "after_close":
      return "引け後";
    case "weekend":
    default:
      return "休場";
  }
}
