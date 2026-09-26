import { ref } from "vue";
import { controller } from "../app/controller";

/**
 * Pad feedback (spec §12.3): `pressed` shows instantly on pointerdown; `sounding` flashes when the
 * quantized sound actually plays, so the user sees both "accepted" and "now".
 */
export function usePress() {
  const pressed = ref(false);
  const sounding = ref(false);

  function down(): void {
    pressed.value = true;
  }

  function up(): void {
    pressed.value = false;
  }

  function flashAt(onset: number | null): void {
    if (onset === null) return;
    controller.atAudioTime(onset, () => {
      sounding.value = true;
      window.setTimeout(() => (sounding.value = false), 110);
    });
  }

  return { pressed, sounding, down, up, flashAt };
}
