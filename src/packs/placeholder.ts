import type { AssetPack } from "./packManifest";

// Always public-safe (plan §10): no files at all; every sound is synthesized and the art is drawn in CSS/SVG.
const placeholder: AssetPack = { id: "placeholder", oneShots: {}, drums: {}, bass: {}, gestures: {}, art: {} };

export default placeholder;
