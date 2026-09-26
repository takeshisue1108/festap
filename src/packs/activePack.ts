import type { AssetPack } from "./packManifest";

/**
 * The pack is fixed at build time by VITE_ASSET_PACK (plan §10). Vite inlines the variable, so the
 * branch for the other pack is dead code and its files are never emitted into dist/.
 */
export async function loadActivePack(): Promise<AssetPack> {
  if (import.meta.env.VITE_ASSET_PACK === "trickcal") return (await import("./trickcal")).default;
  return (await import("./placeholder")).default;
}
