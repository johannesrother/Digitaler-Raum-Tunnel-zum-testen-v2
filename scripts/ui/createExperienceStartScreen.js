/**
 * A fullscreen gate that keeps the rendered idyll motionless until the visitor
 * explicitly starts the experience. Its background is a real canvas snapshot
 * from the initial active camera, never a substitute asset.
 */
export function createExperienceStartScreen(canvas) {
  const screen = document.getElementById("experience-start-screen");
  const message = document.getElementById("experience-start-message");
  const button = document.getElementById("start-experience");
  let ready = false;
  let startHandler = null;

  const captureInitialIdyll = () => {
    try {
      screen.style.setProperty("--idyll-start-image", `url("${canvas.toDataURL("image/jpeg", 0.9)}")`);
      screen.classList.add("experience-start-screen--has-snapshot");
    } catch (error) {
      // The live canvas remains beneath the overlay if a browser refuses a
      // snapshot. It is still the real, paused initial idyll—not a fallback.
      console.warn("Initial idyll snapshot could not be captured.", error);
    }
  };

  const setReady = (onStart) => {
    ready = true;
    startHandler = onStart;
    message.classList.add("experience-start-message--hidden");
    button.hidden = false;
    button.disabled = false;
    button.focus({ preventScroll: true });
  };

  button.addEventListener("click", () => {
    if (!ready || !startHandler) {
      return;
    }
    ready = false;
    button.disabled = true;
    startHandler();
    screen.classList.add("experience-start-screen--leaving");
    screen.addEventListener("transitionend", () => screen.remove(), { once: true });
  });

  return {
    captureInitialIdyll,
    setReady,
    showError() {
      message.textContent = "EXPERIENCE COULD NOT LOAD";
      message.classList.remove("experience-start-message--hidden");
    },
  };
}
