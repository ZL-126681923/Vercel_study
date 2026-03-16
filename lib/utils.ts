import { format, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";

export function formatDate(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? parseISO(dateInput) : dateInput;
  return format(date, "yyyy年MM月dd日", { locale: zhCN });
}

export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
