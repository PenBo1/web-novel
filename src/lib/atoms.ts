"use client"

import { atom } from "jotai"

export type VSCodeThemeType = "light" | "dark"

export type VSCodeThemeSource = "builtin" | "imported" | "discovered"

export interface VSCodeFullTheme {
  id: string
  name: string
  type: VSCodeThemeType
  source: VSCodeThemeSource
  colors: Record<string, string>
  tokenColors?: any[]
}

export const selectedFullThemeIdAtom = atom<string | null>(null)

export const fullThemeDataAtom = atom<VSCodeFullTheme | null>(null)

export const systemLightThemeIdAtom = atom<string>("21st-light")

export const systemDarkThemeIdAtom = atom<string>("21st-dark")

