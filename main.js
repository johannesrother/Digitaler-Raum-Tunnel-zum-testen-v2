import { createEngine } from "./scripts/core/engine.js";
import { createIdyllScene } from "./scripts/core/createIdyllScene.js";
import { initializeWebXR } from "./scripts/core/initializeWebXR.js";
import { createExperienceStartScreen } from "./scripts/ui/createExperienceStartScreen.js";
import { createReexperienceButton } from "./scripts/ui/createReexperienceButton.js";
import { configureResizeHandling, setStatus } from "./scripts/utils/dom.js";

async function startExperience() {
  const canvas = document.getElementById("renderCanvas");
  const statusElement = document.getElementById("runtime-status");
  const enterVrButton = document.getElementById("enter-vr");
  const startScreen = createExperienceStartScreen();
  let scene = null;
  const reexperienceButton = createReexperienceButton(() => {
    scene.metadata.transition.reset();
    scene.metadata.idyllSound.start();
    scene.metadata.transition.start();
  });

  const engine = createEngine(canvas);
  scene = await createIdyllScene(engine, canvas, {
    onWhiteRoomSoundEnded: () => reexperienceButton.showAfterSilence(),
  });
  const removeResizeHandling = configureResizeHandling(engine);

  // Rendering prepares the paused initial view, but the experience timeline
  // itself remains gated until the explicit start.
  engine.runRenderLoop(() => scene.render());
  await scene.whenReadyAsync();
  setStatus(statusElement, "Idylle bereit. WebXR wird geprüft …");

  const xr = await initializeWebXR({
    scene,
    enterVrButton,
    statusElement,
  });
  scene.metadata.transition.attachWebXR(xr);
  startScreen.setReady(() => {
    // This direct click is also the browser gesture for the existing HTML
    // audio elements. The timeline is reset and begins here at exactly t = 0.
    scene.metadata.idyllSound.start();
    scene.metadata.transition.start();
  });

  window.addEventListener(
    "beforeunload",
    () => {
      removeResizeHandling();
      scene.metadata.transition.dispose();
      scene.metadata.tunnel.dispose();
      scene.metadata.idyllSound.dispose();
      scene.metadata.riftSound.dispose();
      scene.metadata.suctionSound.dispose();
      scene.metadata.tunnelSound.dispose();
      scene.metadata.whiteRoomTone.dispose();
      scene.metadata.whiteRoom.dispose();
      scene.metadata.dreamyIdyll.dispose();
      reexperienceButton.dispose();
      scene.dispose();
      engine.dispose();
    },
    { once: true },
  );
}

startExperience().catch((error) => {
  console.error("Die Idylle konnte nicht gestartet werden.", error);
  const startMessage = document.getElementById("experience-start-message");
  if (startMessage) {
    startMessage.textContent = "EXPERIENCE COULD NOT LOAD";
  }
  setStatus(
    document.getElementById("runtime-status"),
    "Die Idylle konnte nicht gestartet werden. Details stehen in der Browser-Konsole.",
  );
});
