// Manages all DOM elements and user interactions.
class UIManager {
  constructor(appState, canvasGrid) {
    this.state = appState;
    this.grid = canvasGrid;
    this.elements = {
      // Main Controls
      mainControls: document.getElementById("main-controls"),
      widthInput: document.getElementById("width"),
      heightInput: document.getElementById("height"),
      isFilledInput: document.getElementById("is-filled"),
      showNumbersInput: document.getElementById("show-numbers"),
      colorSegmentsInput: document.getElementById("color-segments"),
      lockDimsBtn: document.getElementById("lock-dims"),
      themeToggleBtn: document.getElementById("theme-toggle"),
      downloadBtn: document.getElementById("download-btn"),

      // Main Actions
      mainActions: document.querySelector(".main-actions"),
      startGuideBtn: document.getElementById("start-guide-btn"),
      blockCount: document.getElementById("block-count"),

      // Build Guide
      buildGuideControls: document.getElementById("build-guide-controls"),
      exitGuideBtn: document.getElementById("exit-guide-btn"),
      prevStepBtn: document.getElementById("prev-step-btn"),
      nextStepBtn: document.getElementById("next-step-btn"),
      stepCounter: document.getElementById("step-counter"),

      // Canvas
      viewport: document.getElementById("grid-viewport"),
      zoomInBtn: document.getElementById("zoom-in-btn"),
      zoomOutBtn: document.getElementById("zoom-out-btn"),
      resetViewBtn: document.getElementById("reset-view-btn"),
      zoomLevel: document.getElementById("zoom-level"),
    };

    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    this.pinchStartDistance = 0;
  }

  // Initialize all event listeners and UI state
  initialize() {
    this.addEventListeners();
    this.state.subscribe(() => this.update());
    this.updateTheme(); // Set initial theme
    this.update(); // Initial UI sync
  }

  // Central update function called on state change
  update() {
    // Sync inputs with state
    this.elements.widthInput.value = this.state.width;
    this.elements.heightInput.value = this.state.height;
    this.elements.isFilledInput.checked = this.state.isFilled;
    this.elements.showNumbersInput.checked = this.state.showNumbers;
    this.elements.colorSegmentsInput.checked = this.state.colorSegments;

    // Update lock button style
    this.elements.lockDimsBtn.classList.toggle("locked", this.state.isLocked);

    // Update UI based on build guide state
    const isBuilding = this.state.isBuilding;
    this.elements.mainControls.style.display = isBuilding ? "none" : "flex";
    this.elements.mainActions.style.display = isBuilding ? "none" : "flex";
    this.elements.buildGuideControls.style.display = isBuilding
      ? "flex"
      : "none";

    if (isBuilding) {
      const totalSteps = this.state.buildingSteps.length;
      const currentStep = this.state.currentStepIndex + 1;
      this.elements.stepCounter.textContent = `Step ${currentStep} / ${totalSteps}`;
      this.elements.prevStepBtn.disabled = currentStep <= 1;
      this.elements.nextStepBtn.disabled = currentStep >= totalSteps;
    }

    // Update zoom display
    this.elements.zoomLevel.textContent = `${Math.round(
      this.state.zoom * 100,
    )}%`;

    // Redraw the canvas
    this.grid.draw();

    // Update block count display
    const count = this.grid.getBlockCount();
    this.elements.blockCount.textContent = `Total Blocks: ${count}`;
  }

  updateTheme() {
    document.documentElement.setAttribute("data-theme", this.state.theme);
  }

  // Set up all event listeners
  addEventListeners() {
    this.elements.widthInput.addEventListener("input", (e) => {
      this.state.width = parseInt(e.target.value, 10) || 1;
    });
    this.elements.widthInput.addEventListener("change", () => {
      this.grid.resetView(); // Reset view after change
    });

    this.elements.heightInput.addEventListener("input", (e) => {
      this.state.height = parseInt(e.target.value, 10) || 1;
    });
    this.elements.heightInput.addEventListener("change", () => {
      this.grid.resetView(); // Reset view after change
    });

    this.elements.lockDimsBtn.addEventListener("click", () => {
      this.state.isLocked = !this.state.isLocked;
    });

    this.elements.isFilledInput.addEventListener("change", (e) => {
      this.state.isFilled = e.target.checked;
    });

    this.elements.showNumbersInput.addEventListener("change", (e) => {
      this.state.showNumbers = e.target.checked;
    });

    this.elements.colorSegmentsInput.addEventListener("change", (e) => {
      this.state.colorSegments = e.target.checked;
    });

    this.elements.themeToggleBtn.addEventListener("click", () => {
      this.state.theme = this.state.theme === "light" ? "dark" : "light";
      this.updateTheme();
    });

    this.elements.downloadBtn.addEventListener("click", () => {
      this.grid.exportAsPNG();
    });

    // Build guide listeners
    this.elements.startGuideBtn.addEventListener("click", () => {
      this.grid.initializeBuildingGuide();
    });

    this.elements.exitGuideBtn.addEventListener("click", () => {
      this.state.isBuilding = false;
      this.state.currentStepIndex = -1;
      this.state.buildingSteps = [];
    });

    this.elements.nextStepBtn.addEventListener("click", () => {
      if (this.state.currentStepIndex < this.state.buildingSteps.length - 1) {
        this.state.currentStepIndex++;
      }
    });

    this.elements.prevStepBtn.addEventListener("click", () => {
      if (this.state.currentStepIndex > 0) {
        this.state.currentStepIndex--;
      }
    });

    this.elements.zoomInBtn.addEventListener(
      "click",
      () => (this.state.zoom *= 1.25),
    );
    this.elements.zoomOutBtn.addEventListener(
      "click",
      () => (this.state.zoom /= 1.25),
    );
    this.elements.resetViewBtn.addEventListener("click", () =>
      this.grid.resetView(),
    );

    // Desktop mouse controls
    this.elements.viewport.addEventListener("mousedown", (e) =>
      this.startPan(e),
    );
    this.elements.viewport.addEventListener("mousemove", (e) => this.doPan(e));
    this.elements.viewport.addEventListener("mouseup", () => this.endPan());
    this.elements.viewport.addEventListener("mouseleave", () => this.endPan());
    this.elements.viewport.addEventListener("wheel", (e) =>
      this.doScrollZoom(e),
    );

    // Mobile touch controls
    this.elements.viewport.addEventListener(
      "touchstart",
      (e) => this.handleTouchStart(e),
      { passive: false },
    );
    this.elements.viewport.addEventListener(
      "touchmove",
      (e) => this.handleTouchMove(e),
      { passive: false },
    );
    this.elements.viewport.addEventListener("touchend", (e) =>
      this.handleTouchEnd(e),
    );
    this.elements.viewport.addEventListener("touchcancel", (e) =>
      this.handleTouchEnd(e),
    );
  }

  // --- MOUSE HANDLERS ---
  startPan(e) {
    if (e.touches) return; // Ignore if it's a touch event
    this.isPanning = true;
    this.panStart.x = e.clientX - this.state.pan.x;
    this.panStart.y = e.clientY - this.state.pan.y;
  }

  doPan(e) {
    if (!this.isPanning || e.touches) return;
    e.preventDefault();
    this.state.pan = {
      x: e.clientX - this.panStart.x,
      y: e.clientY - this.panStart.y,
    };
  }

  endPan() {
    this.isPanning = false;
  }

  doScrollZoom(e) {
    e.preventDefault();
    const zoomIntensity = 0.002;
    const delta = e.deltaY > 0 ? -1 : 1;
    this.state.zoom += delta * (this.state.zoom * zoomIntensity * 10);
  }

  // --- TOUCH HANDLERS ---
  handleTouchStart(e) {
    if (e.touches.length === 1) {
      // Pan start
      this.isPanning = true;
      const touch = e.touches[0];
      this.panStart.x = touch.clientX - this.state.pan.x;
      this.panStart.y = touch.clientY - this.state.pan.y;
    } else if (e.touches.length === 2) {
      // Pinch start
      this.isPanning = false; // Stop panning for pinch
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      this.pinchStartDistance = Math.sqrt(dx * dx + dy * dy);
    }
  }

  handleTouchMove(e) {
    e.preventDefault(); // Prevent page scroll
    if (e.touches.length === 1 && this.isPanning) {
      // Do Pan
      const touch = e.touches[0];
      this.state.pan = {
        x: touch.clientX - this.panStart.x,
        y: touch.clientY - this.panStart.y,
      };
    } else if (e.touches.length === 2 && this.pinchStartDistance > 0) {
      // Do Pinch Zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      const newDist = Math.sqrt(dx * dx + dy * dy);

      const zoomFactor = newDist / this.pinchStartDistance;

      this.state.zoom *= zoomFactor;

      this.pinchStartDistance = newDist;
    }
  }

  handleTouchEnd(e) {
    this.isPanning = false;
    this.pinchStartDistance = 0; // Reset pinch distance
  }
}

export default UIManager;
