import { LYRICS_TEMP } from "./LyricsTemp.js";
import { MAGIC_NUMBERS } from "./MagicNumbers.js";
import { randInt, lerp } from "./utils/Math.js";
import * as THREE from "three";

export class Point {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.additionalData = {}; // Object to store any additional data related to the point
  }

  distanceTo(other) {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const dz = this.z - other.z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  subtract(other) {
    return new Point(this.x - other.x, this.y - other.y, this.z - other.z);
  }

  add(other) {
    return new Point(this.x + other.x, this.y + other.y, this.z + other.z);
  }

  multiply(scalar) {
    return new Point(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  normalize() {
    const length = this.distanceTo(new Point(0, 0, 0));
    if (length === 0) return new Point(0, 0, 0);
    return new Point(this.x / length, this.y / length, this.z / length);
  }

  clone() {
    return new Point(this.x, this.y, this.z);
  }
}

export class PathGen {
  constructor(buildPositions, pathFinder, pathGrid, app) {
    this.points = buildPositions;
    this.pathFinder = pathFinder;
    this.pathGrid = pathGrid;
    this.app = app;
    this.pathPoints = [];
    this.currentPointIndex = 0;
    this.generatePath();
    this.timePartStarted = 0;
    this.currentTime = 0;
    this.textsToShow = LYRICS_TEMP.map((text) => [text[0], text[1]]); // to avoid modifying LYRICS_TEMP directly
    this.currentY = 0;
    this.pointsPerSecond =
      this.points[0]?.userData?.pointsPerSecond ?? Infinity;
    this.currentPoint = 0;
    this.lastTimePoint = 0;
  }

  generatePath() {
    // const start = new Point(0, 3, 0); // TODO: Add start
    let pathNotSmooth = [];
    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i];
      const end = this.points[i + 1];
      if (end == null) {
        break;
      }
      // const gridBak = this.pathGrid.clone();

      // const path = this.pathFinder.findPath(
      //   Math.round(point.x),
      //   Math.round(point.z - MAGIC_NUMBERS.BUILD_PATH_OFFSET.Z),
      //   Math.round(end.x),
      //   Math.round(end.z),
      //   this.pathGrid,
      // );
      //
      const path = [[end.x, end.z, end.y]];

      // path.shift();
      // this.pathGrid = gridBak;

      this.points[i].userData = {
        isPathPoint: true,
        pointIndex: i,
        pointsPerSecond:
          MAGIC_NUMBERS.NUMBER_STEPS_PER_POINTS /
            (this.points[i + 1]?.time - this.points[i].time) ?? Infinity,
      };

      pathNotSmooth = [...pathNotSmooth, ...path];
    }

    const pathSmooth = pathNotSmooth; // TODO

    // const pathSmooth = PF.Util.smoothenPath(this.pathGrid, pathNotSmooth);

    const curve = new THREE.CatmullRomCurve3(
      pathSmooth.map((path) => {
        return new THREE.Vector3(path[0], path[2], path[1]);
      }),
    );

    const smoothFinalPath = curve.getPoints(
      MAGIC_NUMBERS.NUMBER_STEPS_PER_POINTS * this.points.length,
    );

    this.pathPoints = smoothFinalPath.map((v) => new Point(v.x, v.y, v.z));

    this.points = this.points.map((p) => {
      // console.log(p, this.pathPoints[this.getClosestPathPoint(p)]);
      return { ...p, pathPointIndex: this.getClosestPathPoint(p) };
    });
  }

  getClosestPathPoint(point) {
    let i = 0;
    let closestPointIndex = i;
    let closestDistance = Infinity;
    while (i < this.pathPoints.length) {
      const distance = this.pathPoints[i].distanceTo(point);

      if (distance < closestDistance) {
        closestDistance = distance;

        closestPointIndex = i;
      }
      i++;
    }

    return closestPointIndex;
  }

  static getNumberOfPointsNeeded() {
    let points = 0;

    let i = 0;
    while (i < LYRICS_TEMP.length) {
      i++;
      let nextTime = LYRICS_TEMP[i + 1] - LYRICS_TEMP[i];
      while (
        nextTime < MAGIC_NUMBERS.LYRICS_MIN_TIME &&
        i < LYRICS_TEMP.length
      ) {
        i++;
        nextTime += LYRICS_TEMP[i + 1] - LYRICS_TEMP[i];
      }
      points++;
    }
    return points;
  }

  update(deltaTime) {
    this.currentTime += deltaTime;

    const pointsToAdd = Math.floor(
      (deltaTime + this.lastTimePoint) * MAGIC_NUMBERS.POINTS_PER_SECOND,
    );

    if (pointsToAdd == 0) {
      this.lastTimePoint += deltaTime;
    } else {
      this.currentPoint += pointsToAdd;
      this.lastTimePoint = 0;
    }

    const pathPointIndex = this.currentPoint;

    this.lastPointIndex = pathPointIndex;

    const pathPoint = this.pathPoints[pathPointIndex];

    for (let i = 0; i < this.textsToShow.length; i++) {
      if (this.currentTime * 1000 > this.textsToShow[i][0]) {
        // this.currentTime is in s, textToShow[0] is in ms
        let point = this.points[this.currentPointIndex + 1];
        if (point.z - pathPoint.z < MAGIC_NUMBERS.LYRICS_MIN_DISTANCE) {
          // Avoid showing lyrics too close to the path point
          point = this.points[this.currentPointIndex + 2];
        }
        console.log(point.z - pathPoint.z);
        this.app.showLyrics(
          this.textsToShow[i][1],
          new THREE.Vector3(
            point.x + point.randomXOffset * MAGIC_NUMBERS.POINT_OFFSET_X,
            point.y,
            point.z,
          ),
          point.y,
        );
        this.textsToShow.splice(i, 1);
        i--;
      }
    }

    const rail = [];

    for (let i = 0; i < MAGIC_NUMBERS.SHOOTING_STAR.NUMBER; i++) {
      rail.push(
        this.pathPoints[
          pathPointIndex +
            i * MAGIC_NUMBERS.SHOOTING_STAR.DISTANCE +
            MAGIC_NUMBERS.SHOOTING_STAR.MIN_DISTANCE
        ],
      );
    }

    if (this.points[this.currentPointIndex + 1].z <= pathPoint.z) {
      this.currentPointIndex++;
    }

    const nextPoint =
      this.pathPoints[pathPointIndex + MAGIC_NUMBERS.PATH_NEXT_POINT_DISTANCE];

    return [pathPoint, nextPoint, rail];
  }
}
