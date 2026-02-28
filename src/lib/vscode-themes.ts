import { getBuiltinThemeById } from "@/lib/themes/builtin-themes";

export function isBuiltinTheme(themeId: string) {
  return Boolean(getBuiltinThemeById(themeId));
}
