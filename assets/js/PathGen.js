import { LyricsApp } from "./App.js";
import { LYRICS_TEMP } from "./LyricsTemp.js";
import { GLOBAL_VARIABLES } from "./Globals.js";
import * as THREE from "three";

/**
 * Small util, a 3d point
 * Has some other functions that THREE.Vector3 doesn't have
 * ex. distanceTo, and so on
 */
export class Point {
  /**
   * Creates the Point
   * @param {number} x x value
   * @param {number} y y value
   * @param {number} z z value
   */
  constructor(x, y, z) {
    // x val
    this.x = x;
    // y val
    this.y = y;
    // y val
    this.z = z;
    // Object to store any additional data related to the point (similar to userData for THREE.Mesh)
    this.additionalData = {};
  }

  /**
   * Calculates (Thanks Pythagoras!) the distance between this and other
   * @param {*} other another point or object with .x, .y and .z
   * @returns {number} the distance
   */
  distanceTo(other) {
    // d = distance (flat)
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const dz = this.z - other.z;

    // Pythagoras
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Substract this to other (this - other)
   * @param {*} other another point or object with .x, .y and .z
   * @returns {Point} this - other
   */
  subtract(other) {
    return new Point(this.x - other.x, this.y - other.y, this.z - other.z);
  }

  /**
   * Add this to other
   * @param {*} other another point or object with .x, .y and .z
   * @returns {Point} this - other
   */
  add(other) {
    return new Point(this.x + other.x, this.y + other.y, this.z + other.z);
  }

  /**
   * Multiply this by scalar (1D number)
   * @param {number} scalar a number (to multiply this to)
   * @returns this * scalar
   */
  multiply(scalar) {
    return new Point(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  /**
   * Copies the point (WITHOUT THE ADDITIONAL DATAS!)
   * @returns {Point} new Point
   */
  clone() {
    return new Point(this.x, this.y, this.z);
  }
}

/**
 * Manages the path, with:
 * - a loop
 * - knows which pos to return at which time
 * It also creates a smooth path
 * PathGen stands for PathGenerator
 * points stands for the cameraPathPoints
 * pathPoints stands for the smooth path points
 */
export class PathGen {
  /**
   * Creates PathGen
   * @param {THREE.Vector3} cameraPathPoints the points where the camera path will go
   * @param {LyricsApp} app the main app class
   */
  constructor(cameraPathPoints, app) {
    /** Is the first cleanup done. See loop */
    this.firstCleanupDone = false;

    /** Saves the points */
    this.points = cameraPathPoints;
    /** DELETED: pathGrid */
    /** Saves the app var */
    this.app = app;
    /** The smooth path points */
    this.pathPoints = [];
    /** Current cameraPathPoints */
    this.currentPointIndex = 0;
    /** Generates the path */
    this.generatePath();
    /** The current time (time since path started) */
    this.currentTime = 0;
    /** TODO: Migrate to Textalive */
    this.textsToShow = LYRICS_TEMP.map((text) => [
      text[0],
      text[1],
    ]); /** to avoid modifying LYRICS_TEMP directly */

    /** The index of the current smooth path point */
    this.currentSmoothPoint = 0;

    /** This is made so if the FPS are too much (and the calculated points to add are always 0), we add the deltatime to this, and it will add up until the calculate smooth points > 0 */
    this.lastTimePoint = 0;

    /** The current refill part (1 unit = GLOBAL_VARIABLES.REFILL_INTERVAL) */
    this.currentRefillIndex = 1;

    /** Refill a first time */
    this.app.refill(this.currentRefillIndex * GLOBAL_VARIABLES.REFILL_INTERVAL);

    /** Used for cleanup */
    this.lastCleanupPoint = null;

    /** Currently shown lyrics */
    this.lyrics = [];

    /** Used so two lyrics doesn't spawn next to each other */
    this.takenLyricsPositions = [];
    /** When this is true, no lyrics will spawn */
    this.lyricsLocked = true;

    /** Adjustable speed */
    this.speed = GLOBAL_VARIABLES.POINTS_PER_SECOND;
  }

  /**
   * Unlocks the lyrics, making them spawnable
   */
  unlockLyrics() {
    this.lyricsLocked = false;
  }

  /**
   * Generates the smooth path
   */
  generatePath() {
    let pathSmooth = [];
    // "Reverse" the points
    for (let i = 0; i < this.points.length; i++) {
      const end = this.points[i + 1];
      if (end == null) {
        break;
      }
      const path = [[end.x, end.z, end.y]];
      pathSmooth = [...pathSmooth, ...path];
    }

    // Use Three.js's buildin CatmullRomCurve3 to smoothen the path
    const curve = new THREE.CatmullRomCurve3(
      pathSmooth.map((path) => {
        // Convert pathSmooth to Vector3
        return new THREE.Vector3(path[0], path[2], path[1]);
      }),
    );

    // Get x points (x=number to match the speed  and song length)
    const smoothFinalPath = curve.getPoints(
      GLOBAL_VARIABLES.NUMBER_STEPS_PER_POINTS *
        (this.points.length + GLOBAL_VARIABLES.INTRO.INTRO_CUSTOM_PATH.length),
    );

    // Convert back the Point
    this.pathPoints = smoothFinalPath.map((v) => new Point(v.x, v.y, v.z));
  }

  /**
   * Handle update
   * @param {number} deltaTime
   * @param {boolean} timeChanged if the progress bar has changed the playback time (so we don't create a lot of lyrics)
   * @returns {*} [cameraPoint,lookAtPoint,shootingStarPoints[]]
   */
  update(deltaTime, timeChanged = false) {
    // Updates the current time
    this.currentTime += deltaTime;

    // Calculates the number of points to add with the "buffer"
    const pointsToAdd = Math.floor(
      (deltaTime + this.lastTimePoint) * this.speed,
    );

    // If there's no points to add, add deltatime to the time buffer
    if (pointsToAdd == 0) {
      this.lastTimePoint += deltaTime;
    } else {
      // Else add the rest of the time to the time buffer
      this.currentSmoothPoint += pointsToAdd;
      this.lastTimePoint = Math.abs(
        deltaTime + this.lastTimePoint - pointsToAdd / this.speed,
      );
    }

    // Update the lastPointIndex
    this.lastPointIndex = this.currentSmoothPoint;

    // If overflow
    if (this.currentSmoothPoint > this.pathPoints.length) {
      return [null, null, null];
    }

    // Update the shooting star points
    const rail = [];

    for (let i = 0; i < GLOBAL_VARIABLES.SHOOTING_STAR.NUMBER; i++) {
      rail.push(
        this.pathPoints[
          this.currentSmoothPoint +
            i * GLOBAL_VARIABLES.SHOOTING_STAR.DISTANCE +
            GLOBAL_VARIABLES.SHOOTING_STAR.MIN_DISTANCE
        ],
      );
    }

    // Gets the current (camera) point
    const pathPoint = this.pathPoints[this.currentSmoothPoint];

    // Gets the camera look at point
    const nextPoint =
      this.pathPoints[
        this.currentSmoothPoint + GLOBAL_VARIABLES.PATH_NEXT_POINT_DISTANCE
      ];

    // If we can update the lyrics
    if (!this.lyricsLocked) {
      // Check for new lyrics
      this.checkForNewLyrics(timeChanged);

      // If there has been a time change due to the progress bar
      if (timeChanged) {
        // TODO: Migrate to Textalive
        this.textsToShow = LYRICS_TEMP.filter(
          (text) => text[0] >= this.currentTime * 1000,
        ).map((text) => [text[0], text[1]]);

        // Delete all old lyrics
        for (let i = 0; i < this.lyrics.length; i++) {
          this.app.scene.remove(this.lyrics[i].textMesh);
          this.lyrics.splice(i, 1);
          i--;
        }
      }

      // Update the lyrics (and their animation)
      this.updateLyricAnimation(pointsToAdd, deltaTime);
    }

    // If we are past a new cameraPathPoint, update the point counter
    if (this.points[this.currentPointIndex + 1].z <= pathPoint.z) {
      this.currentPointIndex++;
    }

    // If there's a change in the refill index
    let changed = false;

    // If we went backward (progress click), update the refillIndex until we are on the correct index
    if (deltaTime < 0) {
      while (
        pathPoint.z + GLOBAL_VARIABLES.REFILL_INTERVAL_OFFSET <=
        this.currentRefillIndex * GLOBAL_VARIABLES.REFILL_INTERVAL
      ) {
        changed = true;
        // Backward => -
        this.currentRefillIndex--;
      }
    } else {
      // If we went forward, update the refillIndex until we are on the correct index
      while (
        pathPoint.z + GLOBAL_VARIABLES.REFILL_INTERVAL_OFFSET >=
        this.currentRefillIndex * GLOBAL_VARIABLES.REFILL_INTERVAL
      ) {
        changed = true;
        // Forward => +
        this.currentRefillIndex++;
      }
    }

    // If we changed the refillPoint or if we clicked on the progress bar, refill the builds
    if (changed || timeChanged) {
      this.app.refill(
        this.currentRefillIndex * GLOBAL_VARIABLES.REFILL_INTERVAL,
      );
    }

    // Cleanup, so if there camera goes through a build, it gets deleted (before)
    let cleanupPoint =
      this.pathPoints[
        this.currentSmoothPoint + GLOBAL_VARIABLES.CLEANUP_OFFSET
      ];
    // First cleanup
    if (!this.firstCleanupDone && !this.lyricsLocked) {
      // Since it always checks CLEANUP_OFFSET smooth points in front of the camera, other first CLEANUP_OFFSET smooth points never get checked.
      // This fixes that
      for (
        let i = this.currentSmoothPoint;
        i < GLOBAL_VARIABLES.CLEANUP_OFFSET + this.currentSmoothPoint;
        i++
      ) {
        // Cleanup <i>
        this.cleanup(i);
      }
      this.firstCleanupDone = true;
    }

    if (cleanupPoint && this.lastCleanupPoint) {
      // Cleanup
      this.cleanup(
        this.currentSmoothPoint + GLOBAL_VARIABLES.CLEANUP_OFFSET - 1,
      );
    }

    this.lastCleanupPoint = cleanupPoint;

    // First: camera point, Second: lookAt point, Third: shooting star points
    return [pathPoint, nextPoint, rail];
  }

  /**
   * Updates the lyrics animation (moved to other method to make the update shorter)
   * @param {} pointsToAdd number of new points
   * @param {} deltaTime deltaTime
   */
  updateLyricAnimation(pointsToAdd, deltaTime) {
    // For each currently shown lyrics
    for (let i = 0; i < this.lyrics.length; i++) {
      // Update the smooth path point "offset"
      this.lyrics[i].posOffset +=
        pointsToAdd * GLOBAL_VARIABLES.LYRICS.POS_OFFSET_ADDED;
      // Calculates the lyric smooth path point index
      const lyricPathPointIndex = this.lyrics[i].i + this.lyrics[i].posOffset;
      // If the pathPoint doesn't exists, skip to avoid errors
      if (!this.pathPoints[lyricPathPointIndex]) {
        continue;
      }
      // Get the path point
      const pathPoint = this.pathPoints[lyricPathPointIndex].clone();
      // Re-set the offset
      const offset3d = this.lyrics[i].offset3d;
      this.lyrics[i].textMesh.position.set(
        pathPoint.x + offset3d.x,
        pathPoint.y + offset3d.y,
        pathPoint.z + offset3d.z,
      );

      // Make the lyric look at the camera (so we can read)
      this.lyrics[i].textMesh.lookAt(this.app.camera.position);
      this.lyrics[i].textMesh.rotateY(Math.PI); // The text is now facing the wrong way, fix it

      // Update the opacity, so it fades away
      this.lyrics[i].opacity -=
        deltaTime / GLOBAL_VARIABLES.LYRICS_DISPLAY_TIME;

      // Update the material opacity
      this.lyrics[i].textMesh.material.opacity = this.lyrics[i].opacity;

      // This handles the start lyric anim, from scale 0 to 1
      if (this.lyrics[i].scaleY < 1) {
        // Update the scale
        this.lyrics[i].textMesh.scale.y = this.lyrics[i].scaleY;
        this.lyrics[i].scaleY +=
          deltaTime /
          (GLOBAL_VARIABLES.LYRICS_DISPLAY_TIME /
            GLOBAL_VARIABLES.LYRICS.SCALE_TIME);
      }

      // If the lyric is at half it's lifetime
      if (this.lyrics[i].opacity <= 0.5) {
        // It's far enough, new lyrics can now spawn close to it's position
        this.takenLyricsPositions.splice(
          this.takenLyricsPositions.indexOf(this.lyrics[i].offset3d),
          1,
        );
      }
      // If it's now invisible
      if (this.lyrics[i].opacity <= 0) {
        // Remove it from the scene
        this.app.scene.remove(this.lyrics[i].textMesh);
        // And from the lyrics
        this.lyrics.splice(i, 1);
        // And update the for i index
        i--;
      }
    }
  }

  /**
   * Checks if lyrics should be added, if yes, this method adds them
   * @param {boolean} timeChanged if the progress bar has changed the playback time (so we don't create a lot of lyrics)
   */
  checkForNewLyrics(timeChanged) {
    for (let i = 0; i < this.textsToShow.length; i++) {
      // TODO: Migrate to Textalive
      if (this.currentTime * 1000 > this.textsToShow[i][0]) {
        // If we didn't click on the progress bar
        if (!timeChanged) {
          // Use the showLyrics method, but DO NOT block the flow execution (use .then)
          this.app
            .showLyrics(this.textsToShow[i][1], this.currentTime)
            .then((lyric) => {
              // i is the current point the lyric is at
              lyric.i =
                this.currentSmoothPoint + GLOBAL_VARIABLES.LYRICS.PATH_OFFSET;
              // posOffset is the offset in addition to i
              lyric.posOffset = -GLOBAL_VARIABLES.LYRICS.BEHIND_CAMERA_OFFSET;
              // Try to place a lyric that is not too close to another one
              const maxTakes = 10;
              let take = 0;
              // Try by "bruteforcing", not the best, but works pretty well
              while (
                take < maxTakes ||
                // Check if there's a point too close
                this.takenLyricsPositions.find(
                  (pos) =>
                    lyric.offset3d &&
                    pos.distanceTo(lyric.offset3d) <
                      GLOBAL_VARIABLES.MIN_DISTANCE_BETWEEN_LYRICS,
                )
              ) {
                take++;
                // Set a random offset
                lyric.offset3d = new THREE.Vector3(
                  Srand.random() * GLOBAL_VARIABLES.LYRICS.RANDOM_OFFSET.X * 2 -
                    GLOBAL_VARIABLES.LYRICS.RANDOM_OFFSET.X,
                  Srand.random() * GLOBAL_VARIABLES.LYRICS.RANDOM_OFFSET.Y * 2 -
                    GLOBAL_VARIABLES.LYRICS.RANDOM_OFFSET.Y,
                  Srand.random() * GLOBAL_VARIABLES.LYRICS.RANDOM_OFFSET.Z * 2 -
                    GLOBAL_VARIABLES.LYRICS.RANDOM_OFFSET.Z,
                );
              }
              // Sets the lyric opacity
              lyric.opacity = 1;
              // Add the lyric to the collections
              this.takenLyricsPositions.push(lyric.offset3d);
              this.lyrics.push(lyric);
            });
        }
        this.textsToShow.splice(i, 1);
        i--;
      }
    }
  }

  /**
   * Check for buildings in the path of pointI
   * @param {number} pointI
   */
  cleanup(pointI) {
    // Copy the position
    const point = this.pathPoints[pointI].clone();
    // Use raycastForward to check for any collisions
    let buildOverlaps = this.app.raycastForward(
      point,
      GLOBAL_VARIABLES.CLEANUP_FORWARD_DISTANCE,
    );
    // Hides any build that are in collision with point
    for (const overlap of buildOverlaps) {
      if (overlap.userData.parent) {
        for (const overlapChild of overlap.userData.parent.children) {
          overlapChild.visible = false;
        }
      }
    }
  }
}
