import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Fusionne des classes Tailwind (utilitaire standard shadcn/ui). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Calcule l'âge révolu à partir d'une date de naissance. */
export function calculerAge(dateNaissance: Date, aujourdhui = new Date()): number {
  let age = aujourdhui.getFullYear() - dateNaissance.getFullYear();
  const m = aujourdhui.getMonth() - dateNaissance.getMonth();
  if (m < 0 || (m === 0 && aujourdhui.getDate() < dateNaissance.getDate())) age--;
  return age;
}
