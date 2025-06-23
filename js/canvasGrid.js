// Manages all rendering on the HTML canvas.

const GRID_PADDING = 2;
const BASE_CELL_SIZE = 16;

class CanvasGrid {
  constructor(canvas, appState) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.state = appState;
    this.shapeMap = [];
    this.horizontalCounts = [];
    this.verticalCounts = [];
    this.segmentMap = [];
    this.blockCount = 0;
    // Catppuccin accent colors for segments
    this.segmentColors = [
      "#f38ba8",
      "#fab387",
      "#f9e2af",
      "#a6e3a1",
      "#94e2d5",
      "#89dceb",
      "#74c7ec",
      "#89b4fa",
      "#cba6f7",
      "#f5c2e7",
      "#eba0ac",
      "#f2cdcd",
    ];

    this.resize();
    this.calculateShape();
  }

  // Calculates the grid of active/inactive cells
  calculateShape() {
    const { width, height } = this.state;
    this.totalWidth = width + GRID_PADDING * 2;
    this.totalHeight = height + GRID_PADDING * 2;

    this.shapeMap = Array(this.totalHeight)
      .fill(null)
      .map(() => Array(this.totalWidth).fill(false));

    const rx = (width - 1) / 2;
    const ry = (height - 1) / 2;
    const centerX = rx + GRID_PADDING;
    const centerY = ry + GRID_PADDING;

    if (rx < 0 || ry < 0) return;

    for (let y = 0; y < this.totalHeight; y++) {
      for (let x = 0; x < this.totalWidth; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const normalizedDistance =
          (dx * dx) / (rx + 0.5) ** 2 + (dy * dy) / (ry + 0.5) ** 2;
        if (normalizedDistance <= 1.0) {
          this.shapeMap[y][x] = true;
        }
      }
    }
  }

  // Calculates run lengths on a given grid of active blocks
  calculateRunLengths(activeGrid) {
    const totalHeight = activeGrid.length;
    if (totalHeight === 0) {
      this.horizontalCounts = [];
      this.verticalCounts = [];
      return;
    }
    const totalWidth = activeGrid[0].length;

    const hCounts = Array(totalHeight)
      .fill(null)
      .map(() => Array(totalWidth).fill(0));
    const vCounts = Array(totalHeight)
      .fill(null)
      .map(() => Array(totalWidth).fill(0));

    // Horizontal
    for (let y = 0; y < totalHeight; y++) {
      for (let x = 0; x < totalWidth; x++) {
        if (!activeGrid[y][x]) continue;
        if (x > 0 && activeGrid[y][x - 1]) {
          hCounts[y][x] = hCounts[y][x - 1];
        } else {
          let runLength = 0;
          let k = x;
          while (k < totalWidth && activeGrid[y][k]) {
            runLength++;
            k++;
          }
          for (let i = 0; i < runLength; i++) {
            hCounts[y][x + i] = runLength;
          }
        }
      }
    }

    // Vertical
    for (let x = 0; x < totalWidth; x++) {
      for (let y = 0; y < totalHeight; y++) {
        if (!activeGrid[y][x]) continue;
        if (y > 0 && activeGrid[y - 1][x]) {
          vCounts[y][x] = vCounts[y - 1][x];
        } else {
          let runLength = 0;
          let k = y;
          while (k < totalHeight && activeGrid[k][x]) {
            runLength++;
            k++;
          }
          for (let i = 0; i < runLength; i++) {
            vCounts[y + i][x] = runLength;
          }
        }
      }
    }

    this.horizontalCounts = hCounts;
    this.verticalCounts = vCounts;
  }

  // Identifies and assigns IDs to each segment
  calculateSegments(activeGrid) {
    const totalHeight = activeGrid.length;
    if (totalHeight === 0) return;
    const totalWidth = activeGrid[0].length;

    this.segmentMap = Array(totalHeight)
      .fill(null)
      .map(() => Array(totalWidth).fill(0));
    let segmentID = 1;

    for (let y = 0; y < totalHeight; y++) {
      for (let x = 0; x < totalWidth; x++) {
        if (!activeGrid[y][x] || this.segmentMap[y][x] !== 0) {
          continue;
        }

        const hRun = this.horizontalCounts[y][x];
        const vRun = this.verticalCounts[y][x];

        const isHorizontal = hRun > 1 && vRun === 1;
        const isVertical = vRun > 1 && hRun === 1;

        if (isHorizontal) {
          for (let i = 0; i < hRun; i++) {
            if (x + i < totalWidth) this.segmentMap[y][x + i] = segmentID;
          }
          segmentID++;
        } else if (isVertical) {
          for (let i = 0; i < vRun; i++) {
            if (y + i < totalHeight) this.segmentMap[y + i][x] = segmentID;
          }
          segmentID++;
        }
      }
    }

    for (let y = 0; y < totalHeight; y++) {
      for (let x = 0; x < totalWidth; x++) {
        if (activeGrid[y][x] && this.segmentMap[y][x] === 0) {
          this.segmentMap[y][x] = segmentID++;
        }
      }
    }
  }

  initializeBuildingGuide() {
    this.state.isBuilding = true;

    const outlineGrid = Array(this.totalHeight)
      .fill(null)
      .map((_, y) =>
        Array(this.totalWidth)
          .fill(false)
          .map((_, x) => this.isOutline(x, y)),
      );
    this.calculateRunLengths(outlineGrid);
    this.calculateSegments(outlineGrid);

    const segments = {};
    for (let y = 0; y < this.totalHeight; y++) {
      for (let x = 0; x < this.totalWidth; x++) {
        const id = this.segmentMap[y][x];
        if (id > 0) {
          if (!segments[id]) {
            segments[id] = { id, blocks: [], centerX: 0, centerY: 0 };
          }
          segments[id].blocks.push({ x, y });
        }
      }
    }

    const shapeCenter = { x: this.totalWidth / 2, y: this.totalHeight / 2 };

    const segmentArray = Object.values(segments);
    for (const segment of segmentArray) {
      let sumX = 0,
        sumY = 0;
      for (const block of segment.blocks) {
        sumX += block.x;
        sumY += block.y;
      }
      segment.centerX = sumX / segment.blocks.length;
      segment.centerY = sumY / segment.blocks.length;
      segment.angle = Math.atan2(
        segment.centerY - shapeCenter.y,
        segment.centerX - shapeCenter.x,
      );
    }

    segmentArray.sort((a, b) => a.angle - b.angle);

    this.state.buildingSteps = segmentArray.map((s) => s.id);
    this.state.currentStepIndex = 0;
  }

  isOutline(x, y) {
    if (!this.shapeMap[y] || !this.shapeMap[y][x]) return false;
    return (
      !this.shapeMap[y - 1]?.[x] ||
      !this.shapeMap[y + 1]?.[x] ||
      !this.shapeMap[y]?.[x - 1] ||
      !this.shapeMap[y]?.[x + 1]
    );
  }

  isActive(x, y) {
    if (!this.shapeMap[y] || !this.shapeMap[y][x]) return false;
    return this.state.isFilled ? true : this.isOutline(x, y);
  }

  getBlockCount() {
    return this.blockCount;
  }

  draw() {
    this.render(this.ctx, this.state.pan, this.state.zoom);
  }

  render(ctx, pan, zoom) {
    this.calculateShape();

    const displayGrid = Array(this.totalHeight)
      .fill(null)
      .map((_, y) =>
        Array(this.totalWidth)
          .fill(false)
          .map((_, x) => this.isActive(x, y)),
      );
    const outlineGrid = Array(this.totalHeight)
      .fill(null)
      .map((_, y) =>
        Array(this.totalWidth)
          .fill(false)
          .map((_, x) => this.isOutline(x, y)),
      );

    this.calculateRunLengths(outlineGrid);
    this.calculateSegments(outlineGrid);

    let count = 0;
    for (let y = 0; y < this.totalHeight; y++) {
      for (let x = 0; x < this.totalWidth; x++) {
        if (displayGrid[y][x]) {
          count++;
        }
      }
    }
    this.blockCount = count;

    ctx.save();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    const cellSize = BASE_CELL_SIZE;
    const style = getComputedStyle(document.documentElement);
    const defaultColor = style
      .getPropertyValue("--minecraft-block-active")
      .trim();
    const fontName = style.getPropertyValue("--font-primary").trim();
    const gridLineColor = style.getPropertyValue("--border-color").trim();
    const blockOutlineColor = style
      .getPropertyValue("--minecraft-block-outline")
      .trim();
    const fadedBlockColor = style
      .getPropertyValue("--faded-block-color")
      .trim();

    ctx.strokeStyle = gridLineColor;
    ctx.lineWidth = 1 / zoom;

    ctx.beginPath();
    for (let x = 0; x <= this.totalWidth; x++) {
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, this.totalHeight * cellSize);
    }
    for (let y = 0; y <= this.totalHeight; y++) {
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(this.totalWidth * cellSize, y * cellSize);
    }
    ctx.stroke();

    for (let y = 0; y < this.totalHeight; y++) {
      for (let x = 0; x < this.totalWidth; x++) {
        if (displayGrid[y][x]) {
          let blockColor = defaultColor;
          let isVisible = true;
          const segmentId = this.segmentMap[y][x];

          if (this.state.isBuilding) {
            const currentStepId =
              this.state.buildingSteps[this.state.currentStepIndex];
            const stepIds = this.state.buildingSteps.slice(
              0,
              this.state.currentStepIndex + 1,
            );

            if (segmentId === currentStepId) {
              blockColor =
                this.segmentColors[
                  this.state.currentStepIndex % this.segmentColors.length
                ];
            } else if (stepIds.includes(segmentId)) {
              blockColor = fadedBlockColor;
            } else {
              isVisible = false;
            }
            if (!outlineGrid[y][x]) isVisible = false;
          } else if (this.state.colorSegments) {
            blockColor =
              segmentId > 0
                ? this.segmentColors[
                    (segmentId - 1) % this.segmentColors.length
                  ]
                : defaultColor;
          }

          if (isVisible) {
            ctx.fillStyle = blockColor;
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

            ctx.strokeStyle = blockOutlineColor;
            ctx.lineWidth = 1.5 / zoom;
            ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);

            if (this.state.showNumbers) {
              const hRun = this.horizontalCounts[y][x];
              const vRun = this.verticalCounts[y][x];
              let countToShow = 0;

              if (hRun > 1 && vRun === 1) countToShow = hRun;
              else if (vRun > 1 && hRun === 1) countToShow = vRun;
              else if (hRun === 1 && vRun === 1) countToShow = 1;

              if (countToShow > 0) {
                const fontSize = cellSize * 0.55;
                const centerX = x * cellSize + cellSize / 2;
                const centerY = y * cellSize + cellSize / 2;

                ctx.font = `bold ${fontSize}px ${fontName}`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.strokeStyle = "#000000";
                ctx.lineWidth = 2;
                ctx.strokeText(countToShow, centerX, centerY);
                ctx.fillStyle = "#FFFFFF";
                ctx.fillText(countToShow, centerX, centerY);
              }
            }
          }
        }
      }
    }
    ctx.restore();
  }

  exportAsPNG() {
    const EXPORT_SCALE = 4; // Set to 2 for 2x resolution, 4 for 4x, etc.
    const PADDING = 16; // Padding in base pixels

    const contentWidth = this.totalWidth * BASE_CELL_SIZE;
    const contentHeight = this.totalHeight * BASE_CELL_SIZE;

    const exportWidth = (contentWidth + PADDING * 2) * EXPORT_SCALE;
    const exportHeight = (contentHeight + PADDING * 2) * EXPORT_SCALE;

    const offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = exportWidth;
    offscreenCanvas.height = exportHeight;
    const offscreenCtx = offscreenCanvas.getContext("2d");

    const style = getComputedStyle(document.documentElement);
    offscreenCtx.fillStyle = style.getPropertyValue("--bg-secondary").trim();
    offscreenCtx.fillRect(0, 0, exportWidth, exportHeight);

    const exportPan = { x: PADDING * EXPORT_SCALE, y: PADDING * EXPORT_SCALE };
    const exportZoom = EXPORT_SCALE;

    this.render(offscreenCtx, exportPan, exportZoom);

    const dataUrl = offscreenCanvas.toDataURL("image/png");
    const link = document.createElement("a");
    const dims = this.state.isLocked
      ? this.state.width
      : `${this.state.width}x${this.state.height}`;
    link.download = `minecraft-circle-${dims}@${EXPORT_SCALE}x.png`;
    link.href = dataUrl;
    link.click();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.draw();
  }

  resetView() {
    this.calculateShape();
    const { clientWidth, clientHeight } = this.canvas;
    const contentWidth = this.totalWidth * BASE_CELL_SIZE;
    const contentHeight = this.totalHeight * BASE_CELL_SIZE;
    const zoomX = clientWidth / contentWidth;
    const zoomY = clientHeight / contentHeight;
    this.state.zoom = Math.min(zoomX, zoomY) * 0.9;
    const panX = (clientWidth - contentWidth * this.state.zoom) / 2;
    const panY = (clientHeight - contentHeight * this.state.zoom) / 2;
    this.state.pan = { x: panX, y: panY };
  }
}

export default CanvasGrid;
