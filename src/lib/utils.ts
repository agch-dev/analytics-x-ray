import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Check if the application is running in development mode
 * @returns true if in development mode, false otherwise
 */
export function isDevMode(): boolean {
  // Vite replaces __DEV_MODE__ at build time via define in vite.config.base.ts
  return __DEV_MODE__;
}

