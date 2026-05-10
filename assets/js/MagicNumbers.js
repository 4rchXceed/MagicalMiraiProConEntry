// Every "magic" number should be here

export const MAGIC_NUMBERS = {
  AREA_SIZE: { x: 20, z: 100 },
  BUILDS_X_OFFSET: 2,
  BUILDS_Z_OFFSET: 5,
  CHANCE_TO_REMOVE_BUILD: 0.1, // Chance to remove a build when filling the area
  LIGHT_INTENSITY: 0,
  BUILD_PATH_OFFSET: {
    X: 1,
    Z: 3,
  }, // How much the path should be offset from the builds (so the camera doesn't clip through them)

  BUILD_PATH_DISTANCE: {
    X: 1,
    Y: 2,
  },
  GRID_SIZE: {
    X: 4,
    Z: 7,
  },
  PATH_Y: {
    MIN_Y: 1,
    MAX_Y: 3,
    FLOOR_Y: 4,
  },
  POSITION_CHANGE_DURATION: 1, // Time in seconds to change the camera position
  PATH_NEXT_POINT_DISTANCE: 5, // Distance to the next point at which the camera should start looking at the next point
  SHOOTING_STAR: {
    SIZE: 0.02,
    MIN_DISTANCE: 120,
    NUMBER: 20,
    OFFSET_Y: 0.75,
    DISTANCE: 1,
    LIGHT_INTENSITY: 0.1,
    MATERIAL_LIGHT_INTENSITY: 2,
    PARTICLES: {
      NUMBER: 100,
      OFFSET_SIZE: 0.1,
      RANDOM_TURBULENCE: 0.75,
      DURATION: 1,
      SIZE: 0.075,
      SPAWN_RATE: 50, // Particles per second
    },
    MATERIAL_COLOR: 0x86cecb,
    MIN_SIZE: 10,
  },
  FLOOR_SIZE: {
    X: 200,
    Z: 200,
  },
  NUMBER_STEPS_PER_POINTS: 200, // Number of steps to generate the path with [285]
  LYRICS_DISPLAY_TIME: 2, // Time in seconds to display the lyrics
  LYRICS_DISPLAY_RANGE: {
    MIN: 0,
    MAX: 20,
  },
  LYRICS_SIZE: 2,
  LYRICS_EMISSIVE_INTENSITY: 0.2,
  LYRICS_COLOR: 0xffffff,
  LYRICS_FRAME: {
    SIZE: {
      X: 1.5,
      Y: 2,
    },
    COLOR: 0x737373,
    EMISSIVE_INTENSITY: 0.1,
    // LYRICS_OFFSET: {
    //   X: -0.75,
    //   Y: -2,
    // },
    BORDER_SIZE: 0.05,
    BORDER_COLOR: 0xffffff,
    BORDER_EMISSIVE_INTENSITY: 0.5,
    FRAME_OFFSET: -0.25,
  },
  LYRICS_SPACING: {
    X: 0.75,
    Y: -2,
  },
  LYRICS_SPAWN_BEFORE: 1,
  PATH_CONNECT: {
    X: 10,
    Y: 3,
    Z_LENGTH: 3,
  },
  LYRICS_MIN_TIME: 1, // Minimum time in seconds between two lyrics to be shown, to avoid rapid changes in the path
  BUILD_BATCH_NUMBER: 10,
  MARGIN_POINTS: 20,
  // New CONFIG:
  POINTS_GEN: {
    MAX_X: 2,
    FIXED_Y: 2 + 3,
  },
  POINT_OFFSET_X: 3, // Offset in THREE.js units, where the points should be offset from the main path. (*-1 or *1 randomized)
  LYRICS_MIN_DISTANCE: 14, // Minimum distance in THREE.js units between the lyric and the camera point, to avoid showing lyrics for a too short time
  DISTANCE_BETWEEN_POINTS: 1, // In grid units, between each point in the path
  POINTS_PER_SECOND: 100,
};
