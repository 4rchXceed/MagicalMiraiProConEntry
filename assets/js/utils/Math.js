export function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad) {
  return (rad * 180) / Math.PI;
}

export function randInt(min, max) {
  return Math.floor(Srand.random() * (max - min + 1)) + min;
}

export function coordToGrid(x, z, gridSize) {
  const gridX = Math.round(x / gridSize);
  const gridZ = Math.round(z / gridSize);
  return { x: gridX, z: gridZ };
}

export function getGridMaxElements(areaSize, gridSize) {
  const gridCountX = Math.ceil(areaSize.x / gridSize);
  const gridCountZ = Math.ceil(areaSize.z / gridSize);
  return gridCountX * gridCountZ;
}

export function lerp(start, end, t) {
  return start + (end - start) * t;
}

export function easeInOut(t, b, c, d) {
  t /= d / 2;
  if (t < 1) return (c / 2) * t * t + b;
  t--;
  return (-c / 2) * (t * (t - 2) - 1) + b;
}

// export function rotateAboutPoint(
//   obj,
//   point,
//   axis,
//   theta,
//   pointIsWorld = false,
// ) {
//   if (pointIsWorld) {
//     obj.parent.localToWorld(obj.position); // compensate for world coordinate
//   }

//   obj.position.sub(point); // remove the offset
//   obj.position.applyAxisAngle(axis, theta); // rotate the POSITION
//   obj.position.add(point); // re-add the offset

//   if (pointIsWorld) {
//     obj.parent.worldToLocal(obj.position); // undo world coordinates compensation
//   }

//   obj.rotateOnAxis(axis, theta); // rotate the OBJECT
// }
