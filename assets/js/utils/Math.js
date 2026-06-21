/**
 * Converts degrees to radians
 * @param {number} deg the value in degrees
 * @returns the value in radians
 */
export function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

// Deleted: radToDeg

/**
 * Return a random (int) number between min and max
 * @param {number} min the minimum value
 * @param {number} max the maximum value
 * @returns the random number (rounded)
 */
export function randInt(min, max) {
  return Math.floor(Srand.random() * (max - min + 1)) + min;
}

// DELETED: coordToGrid

// DELETED: getGridMaxElements

/**
 * A basic lerp function
 * @param {number} start start value
 * @param {number} end end value
 * @param {number} t time (between 0 and 1)
 * @returns a value lerped between start and end
 */
export function lerp(start, end, t) {
  return start + (end - start) * t;
}

// DELETED: easeInOut
