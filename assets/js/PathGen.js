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
    this.firstCleanupDone = false;

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
    this.currentPoint = 0;
    this.lastTimePoint = 0;

    this.currentRefillZ = 1;
    this.app.refill(this.currentRefillZ * MAGIC_NUMBERS.REFILL_INTERVAL);

    this.lastCleanupPoint = null;
    this.lyrics = [];

    this.takenLyricsPositions = [];
    this.lyricsLocked = true;

    this.speed = MAGIC_NUMBERS.POINTS_PER_SECOND;
  }

  unlockLyrics() {
    this.lyricsLocked = false;
  }

  generatePath() {
    let pathSmooth = [];
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

      pathSmooth = [...pathSmooth, ...path];
    }

    // Remove middle points
    this.points = this.points.filter((p) => !p.isMiddlePoint);

    // const pathSmooth = PF.Util.smoothenPath(this.pathGrid, pathNotSmooth);

    const curve = new THREE.CatmullRomCurve3(
      pathSmooth.map((path) => {
        return new THREE.Vector3(path[0], path[2], path[1]);
      }),
    );

    const smoothFinalPath = curve.getPoints(
      MAGIC_NUMBERS.NUMBER_STEPS_PER_POINTS *
        (this.points.length + MAGIC_NUMBERS.INTRO.INTRO_CUSTOM_PATH.length),
    );

    this.pathPoints = smoothFinalPath.map((v) => new Point(v.x, v.y, v.z));
    // this.points = this.points.map((p) => {
    //   // console.log(p, this.pathPoints[this.getClosestPathPoint(p)]);
    //   return { ...p, pathPointIndex: this.getClosestPathPoint(p) };
    // });
  }

  // getClosestPathPoint(point) {
  //   let i = 0;
  //   let closestPointIndex = i;
  //   let closestDistance = Infinity;
  //   while (i < this.pathPoints.length) {
  //     const distance = this.pathPoints[i].distanceTo(point);

  //     if (distance < closestDistance) {
  //       closestDistance = distance;

  //       closestPointIndex = i;
  //     }
  //     i++;
  //   }

  //   return closestPointIndex;
  // }

  update(deltaTime, timeChanged = false, shouldnt_start = false) {
    this.currentTime += deltaTime;

    const pointsToAdd = Math.floor(
      (deltaTime + this.lastTimePoint) * this.speed,
    );

    if (pointsToAdd == 0) {
      this.lastTimePoint += deltaTime;
    } else {
      this.currentPoint += pointsToAdd;
      this.lastTimePoint = Math.abs(
        deltaTime + this.lastTimePoint - pointsToAdd / this.speed,
      );
    }

    const pathPointIndex = this.currentPoint;

    this.lastPointIndex = pathPointIndex;

    if (pathPointIndex > this.pathPoints.length) {
      return [null, null, null];
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

    const pathPoint = this.pathPoints[pathPointIndex];

    const nextPoint =
      this.pathPoints[pathPointIndex + MAGIC_NUMBERS.PATH_NEXT_POINT_DISTANCE];

    if (!this.lyricsLocked) {
      for (let i = 0; i < this.textsToShow.length; i++) {
        if (this.currentTime * 1000 > this.textsToShow[i][0]) {
          // // this.currentTime is in s, textToShow[0] is in ms
          // let point = this.points[this.currentPointIndex + 1];
          // if (point.z - pathPoint.z < MAGIC_NUMBERS.LYRICS_MIN_DISTANCE) {
          //   // Avoid showing lyrics too close to the path point
          //   point = this.points[this.currentPointIndex + 2];
          // }
          // console.log(point.z - pathPoint.z);
          if (!timeChanged) {
            this.app
              .showLyrics(this.textsToShow[i][1], this.currentTime)
              .then((lyric) => {
                lyric.i = pathPointIndex + MAGIC_NUMBERS.LYRICS.PATH_OFFSET;
                lyric.posOffset = -MAGIC_NUMBERS.LYRICS.BEHIND_CAMERA_OFFSET;
                const maxTakes = 100;
                let take = 0;
                while (
                  take < maxTakes ||
                  this.takenLyricsPositions.find(
                    (pos) =>
                      lyric.offset3d &&
                      pos.distanceTo(lyric.offset3d) <
                        MAGIC_NUMBERS.MIN_DISTANCE_BETWEEN_LYRICS,
                  )
                ) {
                  take++;
                  lyric.offset3d = new THREE.Vector3(
                    Srand.random() * MAGIC_NUMBERS.LYRICS.RANDOM_OFFSET.X * 2 -
                      MAGIC_NUMBERS.LYRICS.RANDOM_OFFSET.X,
                    Srand.random() * MAGIC_NUMBERS.LYRICS.RANDOM_OFFSET.Y * 2 -
                      MAGIC_NUMBERS.LYRICS.RANDOM_OFFSET.Y,
                    Srand.random() * MAGIC_NUMBERS.LYRICS.RANDOM_OFFSET.Z * 2 -
                      MAGIC_NUMBERS.LYRICS.RANDOM_OFFSET.Z,
                  );
                }
                this.takenLyricsPositions.push(lyric.offset3d);
                lyric.opacity = 1;
                this.lyrics.push(lyric);
              });
          }
          this.textsToShow.splice(i, 1);
          i--;
        }
      }

      if (timeChanged) {
        this.textsToShow = LYRICS_TEMP.filter(
          (text) => text[0] >= this.currentTime * 1000,
        ).map((text) => [text[0], text[1]]);
        for (let i = 0; i < this.lyrics.length; i++) {
          this.app.scene.remove(this.lyrics[i].textMesh);
          this.lyrics.splice(i, 1);
          i--;
        }
      }

      for (let i = 0; i < this.lyrics.length; i++) {
        this.lyrics[i].posOffset +=
          pointsToAdd * MAGIC_NUMBERS.LYRICS.POS_OFFSET_ADDED;
        if (!this.pathPoints[this.lyrics[i].i + this.lyrics[i].posOffset]) {
          continue;
        }
        const pathPoint =
          this.pathPoints[this.lyrics[i].i + this.lyrics[i].posOffset].clone();
        const offset3d = this.lyrics[i].offset3d;
        this.lyrics[i].textMesh.position.set(
          pathPoint.x + offset3d.x,
          pathPoint.y + offset3d.y,
          pathPoint.z + offset3d.z,
        );
        this.lyrics[i].textMesh.lookAt(this.app.camera.position);
        this.lyrics[i].textMesh.rotateY(Math.PI); // The text is facing the wrong way
        this.lyrics[i].opacity -= deltaTime / MAGIC_NUMBERS.LYRICS_DISPLAY_TIME;
        this.lyrics[i].textMesh.material.opacity = this.lyrics[i].opacity;
        if (this.lyrics[i].scaleY < 1) {
          this.lyrics[i].textMesh.scale.y = this.lyrics[i].scaleY;
          this.lyrics[i].scaleY +=
            deltaTime /
            (MAGIC_NUMBERS.LYRICS_DISPLAY_TIME /
              MAGIC_NUMBERS.LYRICS.SCALE_TIME);
        }
        if (this.lyrics[i].opacity <= 0.5) {
          this.takenLyricsPositions.splice(
            this.takenLyricsPositions.indexOf(this.lyrics[i].offset3d),
            1,
          );
        }
        if (this.lyrics[i].opacity <= 0) {
          this.app.scene.remove(this.lyrics[i].textMesh);
          this.lyrics.splice(i, 1);
          i--;
        }
      }
    }

    if (this.points[this.currentPointIndex + 1].z <= pathPoint.z) {
      this.currentPointIndex++;
    }

    let changed = false;
    if (deltaTime < 0) {
      while (
        pathPoint.z + MAGIC_NUMBERS.REFILL_INTERVAL_OFFSET <=
        this.currentRefillZ * MAGIC_NUMBERS.REFILL_INTERVAL
      ) {
        changed = true;
        this.currentRefillZ--;
      }
    } else {
      while (
        pathPoint.z + MAGIC_NUMBERS.REFILL_INTERVAL_OFFSET >=
        this.currentRefillZ * MAGIC_NUMBERS.REFILL_INTERVAL
      ) {
        changed = true;
        this.currentRefillZ++;
      }
    }
    if (changed || timeChanged) {
      this.app.refill(this.currentRefillZ * MAGIC_NUMBERS.REFILL_INTERVAL);
    }

    let cleanupPoint =
      this.pathPoints[pathPointIndex + MAGIC_NUMBERS.CLEANUP_OFFSET];
    if (!this.firstCleanupDone && !this.lyricsLocked) {
      for (
        let i = pathPointIndex;
        i < MAGIC_NUMBERS.CLEANUP_OFFSET + pathPointIndex;
        i++
      ) {
        this.cleanup(i);
      }
      this.firstCleanupDone = true;
    }
    if (cleanupPoint && this.lastCleanupPoint) {
      this.cleanup(pathPointIndex + MAGIC_NUMBERS.CLEANUP_OFFSET - 1);
    }

    this.lastCleanupPoint = cleanupPoint;

    return [pathPoint, nextPoint, rail];
  }

  cleanup(pointI) {
    const point = this.pathPoints[pointI].clone();
    // point.z -= MAGIC_NUMBERS.CLEANUP_RAYCAST_BEHIND;
    let buildOverlaps = this.app.raycastForward(
      point,
      // cleanupPoint.z - this.lastCleanupPoint.z,
      MAGIC_NUMBERS.CLEANUP_FORWARD_DISTANCE,
    );
    for (const overlap of buildOverlaps) {
      if (overlap.userData.parent) {
        for (const overlapChild of overlap.userData.parent.children) {
          overlapChild.visible = false;
        }
      }
    }
  }
}
