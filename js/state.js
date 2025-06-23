// A simple reactive state management object.
// It allows other modules to "subscribe" to state changes.

const state = {
  _width: 11,
  _height: 11,
  _isFilled: false,
  _isLocked: true,
  _zoom: 1,
  _pan: { x: 0, y: 0 },
  _theme: "light",
  _showNumbers: true,
  _colorSegments: true,
  _isBuilding: false,
  _buildingSteps: [],
  _currentStepIndex: -1,

  // Subscribers are functions that will run when the state changes.
  subscribers: new Set(),

  // Getter/setter pairs for each state property.
  get width() {
    return this._width;
  },
  set width(value) {
    this._width = value;
    if (this._isLocked) this._height = value;
    this.notify();
  },

  get height() {
    return this._height;
  },
  set height(value) {
    this._height = value;
    if (this._isLocked) this._width = value;
    this.notify();
  },

  get isFilled() {
    return this._isFilled;
  },
  set isFilled(value) {
    this._isFilled = value;
    this.notify();
  },

  get isLocked() {
    return this._isLocked;
  },
  set isLocked(value) {
    this._isLocked = value;
    this.notify();
  },

  get zoom() {
    return this._zoom;
  },
  set zoom(value) {
    this._zoom = Math.max(0.1, Math.min(10, value)); // Clamp zoom level
    this.notify();
  },

  get pan() {
    return this._pan;
  },
  set pan(value) {
    this._pan = value;
    this.notify();
  },

  get theme() {
    return this._theme;
  },
  set theme(value) {
    this._theme = value;
    localStorage.setItem("theme", value);
    this.notify();
  },

  get showNumbers() {
    return this._showNumbers;
  },
  set showNumbers(value) {
    this._showNumbers = value;
    this.notify();
  },

  get colorSegments() {
    return this._colorSegments;
  },
  set colorSegments(value) {
    this._colorSegments = value;
    this.notify();
  },

  get isBuilding() {
    return this._isBuilding;
  },
  set isBuilding(value) {
    this._isBuilding = value;
    this.notify();
  },

  get buildingSteps() {
    return this._buildingSteps;
  },
  set buildingSteps(value) {
    this._buildingSteps = value;
    this.notify();
  },

  get currentStepIndex() {
    return this._currentStepIndex;
  },
  set currentStepIndex(value) {
    this._currentStepIndex = value;
    this.notify();
  },

  // Public methods for managing subscribers
  subscribe(callback) {
    this.subscribers.add(callback);
  },

  unsubscribe(callback) {
    this.subscribers.delete(callback);
  },

  // Notifies all subscribers that the state has changed.
  notify() {
    for (const callback of this.subscribers) {
      callback(this);
    }
  },
};

export default state;
