// Every "magic" number should be here

export const MAGIC_NUMBERS = {
  AREA_SIZE: { x: 100, z: 100 },
  BUILDS_X_OFFSET: 2,
  BUILDS_Z_OFFSET: 5,
  CHANCE_TO_REMOVE_BUILD: 0.1, // Chance to remove a build when filling the area
  CAMERA_LIGHT: {
    INTENSITY: 0,
    ANGLE: 10,
    DECAY: 1,
  },
  BUILD_PATH_OFFSET: {
    X: 1,
    Z: 3,
  }, // How much the path should be offset from the builds (so the camera doesn't clip through them)

  // BUILD_PATH_DISTANCE: {
  //   // In THREE.js units
  //   X: 1,
  //   Y: 2,
  // },
  GRID_SIZE: {
    X: 4,
    Z: 5,
  },
  PATH_Y: {
    MIN_Y: 2,
    MAX_Y: 4,
  },
  POSITION_CHANGE_DURATION: 1, // Time in seconds to change the camera position
  PATH_NEXT_POINT_DISTANCE: 5, // Distance to the next point at which the camera should start looking at the next point
  SHOOTING_STAR: {
    SIZE: 0.02,
    MIN_DISTANCE: 120,
    NUMBER: 20,
    OFFSET_Y: 0.75,
    DISTANCE: 1,
    LIGHT_INTENSITY: 0.4,
    MATERIAL_LIGHT_INTENSITY: 2,
    PARTICLES: {
      NUMBER: 100,
      OFFSET_SIZE: {
        X: 0.1,
        Y: 0.1,
        Z: 0.1,
      },
      RANDOM_TURBULENCE: 0.75,
      DURATION: 2,
      SIZE: 0.075,
      SPAWN_RATE: 50, // Particles per second
    },
    MATERIAL_COLOR: 0x86cecb,
    MIN_SIZE: 10,
  },
  FLOOR_SIZE: {
    X: 500,
    OFFSET_Z: 30,
    OFFSET_Z_END: 100,
  },
  NUMBER_STEPS_PER_POINTS: 200, // Number of steps to generate the path with [285]
  LYRICS_DISPLAY_TIME: 2, // Time in seconds to display the lyrics
  LYRICS_SIZE: 1,
  LYRICS_EMISSIVE_INTENSITY: 0.2,
  LYRICS_COLOR: 0xffffff,
  // LYRICS_FRAME: {
  //   SIZE: {
  //     X: 1.5,
  //     Y: 2,
  //   },
  //   COLOR: 0x737373,
  //   EMISSIVE_INTENSITY: 0.1,
  //   // LYRICS_OFFSET: {
  //   //   X: -0.75,
  //   //   Y: -2,
  //   // },
  //   BORDER_SIZE: 0.05,
  //   BORDER_COLOR: 0xffffff,
  //   BORDER_EMISSIVE_INTENSITY: 0.5,
  //   FRAME_OFFSET: -0.25,
  // },

  LYRICS_SPAWN_BEFORE: 1,
  PATH_CONNECT: {
    X: 10,
    Y: 3,
    Z_LENGTH: 3,
  },
  LYRICS_MIN_TIME: 1, // Minimum time in seconds between two lyrics to be shown, to avoid rapid changes in the path
  BUILD_BATCH_NUMBER: 10,
  MARGIN_POINTS: 20,
  POINTS_GEN: {
    MAX_X: 3,
    FIXED_Y: 2 + 3,
    BUILDS: {
      MIN_X: -10,
      MAX_X: 10,
    },
  },
  POINT_OFFSET_X: 3, // Offset in THREE.js units, where the points should be offset from the main path. (*-1 or *1 randomized)
  LYRICS_MIN_DISTANCE: 14, // Minimum distance in THREE.js units between the lyric and the camera point, to avoid showing lyrics for a too short time
  DISTANCE_BETWEEN_POINTS: 4, // In grid units, between each point in the path
  POINTS_PER_SECOND: 100, // Great number: 100. In points per second. See NUMBER_STEPS_PER_POINTS for the number of steps per point
  LYRICS: {
    DISTANCE: 2,
    SPEED: 20,
    DIRECTION_RANDOM: 0,
    GRAVITY: 5, // In THREE.js units per second
    PATH_OFFSET: 20,
    POS_OFFSET_ADDED: 2, // Good number: 2
    RANDOM_OFFSET: {
      X: 3,
      Y: 3,
      Z: 3,
    },
    BEHIND_CAMERA_OFFSET: 0, // In Points
    SCALE_TIME: 3, // In "%" of the total display time (1/SCALE_TIME*100 -> %)
  },
  REFILL_INTERVAL: 100, // In grid units
  REFILL_INTERVAL_OFFSET: 50,
  CLEANUP_OFFSET: 200 * 3, // This one's a bit technical: it controls how far ahead the cleanup should be done: the cleanup is a check that removes buildings that are in the path, due to the Bezier path generation
  CLEANUP_FORWARD_DISTANCE: 0.1,
  CLEANUP_RAYCAST_BEHIND: 0.1,
  BUILD_START: 2, // in points, when the builds will start to be placed
  MIN_DISTANCE_BETWEEN_LYRICS: 1, // LYRIS.RANDOM_OFFSET can overlay 2 lyrics sometimes, so we need to avoid placing them too close together
  INTRO: {
    PARTICLE_SYSTEM: {
      COLOR: 0x86cecb,
      LIGHT_INTENSITY: 1,
      SIZE: 0.1,
      NUMBER: 1000,
      OFFSET_SIZE: {
        X: 0.4,
        Y: 0.4,
        Z: 0,
      },
      RANDOM_TURBULENCE: 1,
      DURATION: 0.2,
      SPAWN_RATE: 1000, // Particles per second
      OFFSET_Z: 0,
    },
    INTRO_CUSTOM_PATH: [
      {
        X: 0,
        Y: 10,
        Z: -40000,
      },
      {
        X: 0,
        Y: 10,
        Z: -40,
      },
      {
        X: 0,
        Y: 4,
        Z: -10,
      },
    ],
    OUTRO_END: {
      X: 0,
      Y: 10,
      Z: 1000,
    },
    WARP: {
      NUMBER: 500,
      COLOR: 0x86cecb,
      OPACITY: 1,
      SIZE: 0.1,
      DISTANCE: { MAX: 10, MIN: 5 },
      EMISSIVE_INTENSITY: 3.9,
      SCALE: 20,
      OFFSET_ADD: 100,
      OFFSET_Z: 50,
      MAX_DISTANCE: 500,
      STOP_AT: -20,
      START_DISTANCE: -400,
    },
  },
  PROGRESS: {
    SPEED: 25,
  },
  BUILD_LIGHT: {
    TEXTURE_SIZE: 20,
    INTENSITY: 0,
    COLOR: 0xf7e9ca,
    START_AT: 20,
    TIME_TO_FULL: 2,
    MAX_DISTANCE: 4, // In grid points
    DISTANCE_DECAY: 4,
  },
  FAKE_BUILD_LAYER_NUMBER: 2,
  BUILD_INTERACTION: {
    HOVER_ANIM_TIME: 0.2,
    SCALE_HOVER: 1.1,
    FIREWORK_Y_OFFSET: 2,
    FIREWORK: {
      NBR_TRAIL: 50,
      UNIT_PER_SECOND: 10,
      LIFETIME: 0.5,
      COLOR: 0x86cecb,
      INTENSITY: 1,
      NBR_PARTICLES: 50,
      EXPLOSION_LIFETIME: 1,
      PARTICLE_RADIUS: 0.1,
      AUTO_INTERVAL: 0.75,
      AUTO_Z_OFFSET: 40,
    },
  },
  SONG_SELECT: {
    ARROW: {
      MOVE_SPEED: 20,
      MOVE_BOUNDS: 5,
    },
    START_ANIM: {
      MOVE_SPEED: 200,
      TIME: 1,
      SCALE_SPEED: 10,
      END_TIME: 2,
    },
  },
  BUILD_SHADER: {
    DISTANCE_TO_WHITE: 1000,
    EMISSIVE: 50,
  },
};
