import { z, ZodError } from "zod";

z.config(z.locales.sv());

export { z };

export const uuid = z.uuid();
export const idParam = z.object({ id: z.uuid() });
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Ogiltig e-postadress");
export const passwordSchema = z.string().min(8, "Lösenordet måste vara minst 8 tecken").max(200);
export const nameSchema = z.string().trim().min(1, "Namn krävs").max(100);
export const tagsSchema = z.array(z.string().trim().toLowerCase().min(1).max(40)).max(20);
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum ska vara ÅÅÅÅ-MM-DD");

const FIELD_LABELS: Record<string, string> = {
  email: "E-post",
  password: "Lösenord",
  newPassword: "Nytt lösenord",
  name: "Namn",
  clubName: "Klubbnamn",
  title: "Titel",
  startsAt: "Starttid",
  durationMin: "Längd",
  minutes: "Minuter"
};

export function formatZodError(err: ZodError): string {
  const issue = err.issues[0];
  if (!issue) return "Ogiltiga uppgifter.";
  const field = issue.path.find((p) => typeof p === "string") as string | undefined;
  const label = field ? (FIELD_LABELS[field] ?? field) : "";
  return label ? `${label}: ${issue.message}` : issue.message;
}
