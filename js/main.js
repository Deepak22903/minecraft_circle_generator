import state from "./state.js";
import CanvasGrid from "./canvasGrid.js";
import UIManager from "./ui.js";

// The main entry point for the application.
// It initializes all the major components.

document.addEventListener("DOMContentLoaded", () => {
  // 1. Check for a saved theme preference
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) {
    state.theme = savedTheme;
  }

  // 2. Initialize the canvas grid renderer
  const canvas = document.getElementById("grid-canvas");
  const grid = new CanvasGrid(canvas, state);

  // 3. Initialize the UI manager
  const ui = new UIManager(state, grid);
  ui.initialize();

  // 4. Set the initial view and perform the first draw
  grid.resetView();

  // 5. Handle window resizing
  window.addEventListener("resize", () => {
    grid.resize();
  });
});
