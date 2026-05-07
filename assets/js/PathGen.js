import { LYRICS_TEMP } from "./LyricsTemp.js";
import { MAGIC_NUMBERS } from "./MagicNumbers.js";
import { randInt, lerp } from "./utils/Math.js";
import * as THREE from 'three';

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
    constructor(buildPositions, pathFinder, pathGrid, app, refillPoints) {
        this.points = buildPositions;
        this.pathFinder = pathFinder;
        this.pathGrid = pathGrid;
        this.app = app;
        this.refillPoints = refillPoints;
        this.pathPoints = [];
        this.currentPointIndex = 0;
        this.generatePath();
        this.timePartStarted = 0;
        this.currentTime = 0;
        this.textsToShow = [];
        this.currentY = 0;
        this.pointsPerSecond = this.points[0]?.userData?.pointsPerSecond ?? Infinity;
    }

    generatePath() {
        // const start = new Point(0, 3, 0); // TODO: Add start
        let pathNotSmooth = [];
        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            const end = this.points[i + 1] ?? new Point(0, 0, 0);
            const gridBak = this.pathGrid.clone()
            const path = this.pathFinder.findPath(
                Math.round(point.x), Math.round(point.z),
                Math.round(end.x), Math.round(end.z),
                this.pathGrid
            );
            path.shift();
            this.pathGrid = gridBak;

            const pathWithY = [];

            const yTo = randInt(MAGIC_NUMBERS.PATH_Y.MIN_Y, MAGIC_NUMBERS.PATH_Y.MAX_Y);
            const yFrom = (pathNotSmooth[pathNotSmooth.length - 1] ?? [, , 3])[2];

            for (let i = 0; i < path.length; i++) {
                const newY = lerp(yFrom, yTo, i / path.length);
                pathWithY.push(
                    [...path[i], newY]
                );
            }

            this.points[i].userData = { isPathPoint: true, pointIndex: i, pointsPerSecond: MAGIC_NUMBERS.NUMBER_STEPS_PER_POINTS / (this.points[i + 1]?.time - this.points[i].time) ?? Infinity };

            pathNotSmooth = [...pathNotSmooth, ...pathWithY];
        }

        const pathSmooth = PF.Util.smoothenPath(this.pathGrid, pathNotSmooth);

        const curve = new THREE.CatmullRomCurve3(
            pathSmooth.map((path) => {
                return new THREE.Vector3(path[0], path[2], path[1]);
            })
        );

        const smoothFinalPath = curve.getPoints(MAGIC_NUMBERS.NUMBER_STEPS_PER_POINTS * this.points.length);

        this.pathPoints = smoothFinalPath.map((v) => new Point(v.x, v.y, v.z));

        this.points = this.points.map((p) => {
            return { ...p, pathPointIndex: this.getClosestPathPoint(p) }
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
            while (nextTime < MAGIC_NUMBERS.LYRICS_MIN_TIME && i < LYRICS_TEMP.length) {
                i++;
                nextTime += LYRICS_TEMP[i + 1] - LYRICS_TEMP[i];
            }
            points++;
        }
        return points;
    }

    getPathPoint(deltaTime = 0) {
        // const timeTotal = this.points[this.currentPointIndex + 1].time - this.points[this.currentPointIndex].time;
        // const percentageFinished = (this.currentTime - this.timePartStarted) / timeTotal;

        // return Math.floor(this.points[this.currentPointIndex].pathPointIndex + MAGIC_NUMBERS.NUMBER_STEPS_PER_POINTS * percentageFinished);
        const currentPointsPerSecond = this.points[this.currentPointIndex]?.userData?.pointsPerSecond ?? this.pointsPerSecond;
        return Math.floor(this.points[this.currentPointIndex].pathPointIndex + currentPointsPerSecond * (this.currentTime - this.timePartStarted));
    }

    update(deltaTime) {
        this.currentTime += deltaTime;

        const pathPointIndex = this.getPathPoint(deltaTime);

        this.lastPointIndex = pathPointIndex;

        const pathPoint = this.pathPoints[pathPointIndex];

        const textsToShowToDelete = [];
        for (const textToShow of this.textsToShow) {
            if (this.currentTime - this.timePartStarted > textToShow.time) {
                console.log(textToShow.text);
                this.app.showLyrics(textToShow.text, this.points[this.currentPointIndex + 1], this.points[this.currentPointIndex + 1].y);
                textsToShowToDelete.push(this.textsToShow.indexOf(textToShow));
            }
        }

        for (const textToShowToDelete in textsToShowToDelete) {
            this.textsToShow.splice(textToShowToDelete, 1);
        }

        if (pathPointIndex >= this.points[this.currentPointIndex + 1].pathPointIndex) { // New point!
            // console.log("NEW POINT +1");

            this.currentPointIndex++;

            // Show text
            this.textsToShow = this.points[this.currentPointIndex].texts;

            this.timePartStarted = this.currentTime;
        }

        const rail = [];

        for (let i; i < MAGIC_NUMBERS.SHOOTING_STAR.NUMBER; i++) {
            rail.push(this.pathPoints[pathPoint + i * MAGIC_NUMBERS.SHOOTING_STAR.DISTANCE + MAGIC_NUMBERS.SHOOTING_STAR.MIN_DISTANCE]);
        }

        const nextPoint = this.pathPoints[pathPointIndex + MAGIC_NUMBERS.PATH_NEXT_POINT_DISTANCE];

        if (pathPoint.z > this.refillPoints[0]) {
            this.refillPoints.shift();
            this.app.refill();
            console.log("REFILL COMPLETE");

        }

        // TODO: Temporary, to test the path with a fixed build. Remove this later
        pathPoint.x = 5;
        nextPoint.x = 5;

        return [pathPoint, nextPoint, rail]
    }
}