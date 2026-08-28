/**
 * A fullscreen gate that keeps the rendered idyll motionless until the visitor
 * explicitly starts the experience. Its background is a real static snapshot
 * from the initial active camera, never a substitute asset.
 */
export function createExperienceStartScreen() {
  const screen = document.getElementById("experience-start-screen");
  const message = document.getElementById("experience-start-message");
  const button = document.getElementById("start-experience");
  let ready = false;
  let startHandler = null;

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
    setReady,
    showError() {
      message.textContent = "EXPERIENCE COULD NOT LOAD";
      message.classList.remove("experience-start-message--hidden");
    },
  };
}
