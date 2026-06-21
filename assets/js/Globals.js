// Every "magic" number should be here

export const GLOBAL_VARIABLES = {
  /** Something that isn't that relevant, but still needed (for ex. to specify the width of the city's floor) */
  AREA_SIZE: { x: 100, z: 100 },
  /** How much the path should be offset from the builds (so the camera doesn't clip through them) */
  BUILD_PATH_OFFSET: {
    Z: 3,
  },
  /** The size (in Three.js units) of the grid (the grid is used to place builds). Mainly used by BuildManager.js */
  GRID_SIZE: {
    X: 4,
    Z: 5,
  },
  /** The camera path points Y is randomized between MIN_Y and MAX_Y */
  PATH_Y: {
    MIN_Y: 2,
    MAX_Y: 4,
  },
  /** Distance to the next point at which the camera should start looking at the next point */
  PATH_NEXT_POINT_DISTANCE: 5,
  /** The shooting star in front of the camera */
  SHOOTING_STAR: {
    /** Size of the last part of the shooting star (it goes from SIZE to MIN_SIZE) */
    SIZE: 0.02,
    /** Distance (in smooth path points) between the shooting star and the player */
    MIN_DISTANCE: 120,
    /** Number of part of the shooting star */
    NUMBER: 20,
    /** Offset of the shooting star position (compared to the normal smooth path point pos) */
    OFFSET_Y: 0.75,
    /** Distance between each shooting star parts */
    DISTANCE: 1,
    /** The intensity of the light in front of the last (farthest from the camera) shooting star part */
    LIGHT_INTENSITY: 0.4,
    /** The intensity of the light of the material that compose each parts */
    MATERIAL_LIGHT_INTENSITY: 2,
    /** Specification of the shooting star's particles */
    PARTICLES: {
      /** Max nbr of particles */
      NUMBER: 100,
      /** Final offset (from their start pos) for each particle */
      RANDOM_TURBULENCE: 0.75,
      /** The lifetime */
      DURATION: 2,
      /** The size (in Three.js units) */
      SIZE: 0.075,
      /** Number of particles that spawns per second */
      SPAWN_RATE: 50,
    },
    /** The color that composes the particles & shooting star parts */
    MATERIAL_COLOR: 0x86cecb,
    /** The size goes from SIZE to MIN_SIZE */
    MIN_SIZE: 10,
  },
  /** The size of the city's floor (the Z is automatically set) */
  FLOOR_SIZE: {
    // X size
    X: 500,
    // +OFFSET_Z from the Z coordinate 0
    OFFSET_Z: 30,
    // Size ends at +OFFSET_Z_END from the song's last point
    OFFSET_Z_END: 100,
  },
  /** Number of steps to generate the path with. Controls the "quality" of the path. Changing it may require changing other values aswell */
  NUMBER_STEPS_PER_POINTS: 200, // Number of steps to generate the path with
  /** Lifetime of a lyric (until it's opacity reaches 0 and it gets removed) */
  LYRICS_DISPLAY_TIME: 2,
  /** Size of a lyric */
  LYRICS_SIZE: 1,
  /** Emission of the lyric's material */
  LYRICS_EMISSIVE_INTENSITY: 0.2,
  /** Color of the lyric's material */
  LYRICS_COLOR: 0xffffff,
  /** Variables used in the camera path point's generation */
  POINTS_GEN: {
    /** Path points are generated between -MAX_X and MAX_X from 0,0 (in grid unit) */
    MAX_X: 3,
    /** Dummy value, unused */
    FIXED_Y: 2 + 3,
    /** Builds are generated between MIN_X and MAX_X */
    BUILDS: {
      MIN_X: -10,
      MAX_X: 10,
    },
  },
  /** In grid units, between each camera path point in the path */
  DISTANCE_BETWEEN_POINTS: 4,
  /** Great number: 100. In points per second. See NUMBER_STEPS_PER_POINTS for the number of steps per point. Controls the speed */
  POINTS_PER_SECOND: 100,
  LYRICS: {
    /** Spawn pos distance from the camera */
    DISTANCE: 2,
    /** How far from the camera will the lyric be generated (in smooth path point) */
    PATH_OFFSET: 20,
    /** How many times faster than the camera */
    POS_OFFSET_ADDED: 2,
    /** Offset from the normal smooth path point (between 0 and X,Y,Z) */
    RANDOM_OFFSET: {
      X: 3,
      Y: 3,
      Z: 3,
    },
    /** At what point does it starts */
    BEHIND_CAMERA_OFFSET: 5, // In Points
    /** How many time for the lyric to be at scaleY 1 (start with scaleY 0), in "%" of the total display time (1/SCALE_TIME*100 -> %) */
    SCALE_TIME: 3,
  },
  /** In Three.js units, each how many Z will new builds be created and old one removed */
  REFILL_INTERVAL: 200,
  /** ...but make this only when we are at REFILL_INTERVAL_OFFSET of the next REFILL_INTERVAL (so we don't see new buildings pop up right in front of us) */
  REFILL_INTERVAL_OFFSET: 100,
  /** This one's a bit technical: it controls how far ahead the cleanup should be done: the cleanup is a check that removes buildings that are in the path, due to the Bezier path generation */
  CLEANUP_OFFSET: 200 * 3,
  /** Raycast distance */
  CLEANUP_FORWARD_DISTANCE: 0.1,
  /** Raycast's base pos Z offset */
  CLEANUP_RAYCAST_BEHIND: 0.1,
  /** LYRIS.RANDOM_OFFSET can overlay 2 lyrics sometimes, so we need to avoid placing them too close together */
  MIN_DISTANCE_BETWEEN_LYRICS: 1,
  /** The intro animation */
  INTRO: {
    /** The path the camera will take to get from the intro to the city */
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
    /** The path the camera will take when the song ends */
    OUTRO_END: {
      // This is ignored
      X: 0,
      // This too
      Y: 10,
      Z: 1000,
    },
    /** The WARP animation that see in the song selection & in the intro */
    WARP: {
      /** Number of warp stars to generate */
      NUMBER: 500,
      /** The color of the warp stars */
      COLOR: 0x86cecb,
      /** The opacity of the warp stars */
      OPACITY: 1,
      /** The size of the warp stars */
      SIZE: 0.1,
      /** The random (X Y only) distance from the camera's X and Y */
      DISTANCE: { MAX: 10, MIN: 5 },
      /** The emission intensity of the material of the warp stars */
      EMISSIVE_INTENSITY: 3.9,
      /** The Z scale compared to X or Y (SIZE) */
      SCALE: 20,
      /** In Three.js units, travel distance for 1 second */
      OFFSET_ADD: 100,
      /** The max Z distance from the camera */
      MAX_DISTANCE: 500,
      /** The warp stars are destroyed when they are < STOP_AT */
      STOP_AT: -20,
      /** They all start at START_DISTANCE, and smoothly go to the camera*/
      START_DISTANCE: -400,
      /** Remove ONLY if the deltaTime is not "too much" => TIME_REMOVE_BG, else there's a bug where the warp stars disappear when you change your browser's tab */
      TIME_REMOVE_BG: 1,
    },
  },
  /** Progress bar config */
  PROGRESS: {
    /** The speed of the lyrics in the progress bar */
    SPEED: 25,
  },
  /** Config for lighted up buildings */
  BUILD_LIGHT: {
    /** The size of a single window (for the texture) */
    TEXTURE_SIZE: 20,
    /** Base emissive intensity */
    INTENSITY: 0,
    /** Color of the emission of the windows */
    COLOR: 0xf7e9ca,
    /** The first build lights up when the Z pos diff between the camera and the build */
    START_AT: 20,
    /** Number of time for the emission to be at full brightness */
    TIME_TO_FULL: 2,
    /** In grid points, until which X distance will the builds light up */
    MAX_DISTANCE: 4,
    /** The decay of the distance needed for a build to light up */
    DISTANCE_DECAY: 4,
  },
  /** Number of "fake" (builds that are here to make the city look a little bit fuller) */
  FAKE_BUILD_LAYER_NUMBER: 2,
  /** The build interaction's settings */
  BUILD_INTERACTION: {
    /** How much time (in seconds) it will take for the hover animation to be over */
    HOVER_ANIM_TIME: 0.2,
    /** The hover animation will scale up to SCALE_HOVER */
    SCALE_HOVER: 1.1,
    /** The firework will start at Y 2x this value */
    FIREWORK_Y_OFFSET: 2,
    /** Settings for the fireworks */
    FIREWORK: {
      /** (In three.js unit) the how much will the rocket fly until it explodes */
      UNIT_PER_SECOND: 10,
      /** Lifetime of the rocket until it explodes */
      LIFETIME: 0.5,
      /** Intensity of the emission of the rocket & explosion particles */
      INTENSITY: 1,
      /** Number of explosion particles */
      NBR_PARTICLES: 50,
      /** Speed of the explosion particles (between -VELOCITY and VELOCITY on XYZ) */
      VELOCITY: 0.05,
      /** Lifetime of the explosion until it gets removed completly */
      EXPLOSION_LIFETIME: 1,
      /** Size of a particle */
      PARTICLE_RADIUS: 0.1,
      /** Each XYZ seconds a automatic firework will spawn */
      AUTO_INTERVAL: 0.75,
      /** ...at min AUTO_Z_OFFSET of the camera */
      AUTO_Z_OFFSET: 40,
    },
  },
  /** Song selector variables */
  SONG_SELECT: {
    /** The blue arrow moving up and down */
    ARROW: {
      /** The speed (in px/s) of the animation moving speed */
      MOVE_SPEED: 20,
      /** In px, max and min (aka bounds of the animation) */
      MOVE_BOUNDS: 5,
    },
    /** Song start animation */
    START_ANIM: {
      /** Move speed of the buildings */
      MOVE_SPEED: 200,
      /** Time until the animation stops and the song intro starts */
      TIME: 1,
    },
  },
  /** This *WAS* a shader, not anymore */
  BUILD_SHADER: {
    /** In Three.js units, at which points the building is at it's peak emission */
    DISTANCE_TO_WHITE: 1000,
    /** It's peak emission */
    EMISSIVE: 50,
  },
  /** All the text / songs translations */
  TRANSLATIONS: {
    "song-selector.title": {
      en: "Select a City",
      jp: "都市を選択してください",
    },
    songs: {
      1: {
        en: {
          artist: "imie",
          name: "Answer Me",
        },
        jp: {
          artist: "imie さん",
          name: "『こたえて』",
        },
      },
      2: {
        en: {
          artist: "Rulmry",
          name: "After The Curtain",
        },
        jp: {
          artist: "Rulmry さん",
          name: "アフター・\nザ・カーテン",
        },
      },
      3: {
        en: {
          artist: "Yamiagari",
          name: "Shutter Chance",
        },
        jp: {
          artist: "夜未アガリ さん",
          name: "シャッターチャンス",
        },
      },
      4: {
        en: {
          artist: "Natsuyama Yotsugi × Dopam!ne",
          name: "The Last March on Earth",
        },
        jp: {
          artist: "夏山よつぎ×ど～ぱみん さん",
          name: "世界最後の音楽隊",
        },
      },
      5: {
        en: {
          artist: "Tsuruzou",
          name: "Toritsukulogy",
        },
        jp: {
          artist: "鶴三 さん",
          name: "トリツクロジー",
        },
      },
      6: {
        en: {
          artist: "Twinfield",
          name: "TAKEOVER",
        },
        jp: {
          artist: "Twinfield さん",
          name: "TAKEOVER",
        },
      },
    }, // TODO
    "settings.title": {
      en: "Settings",
      jp: "設定",
    },
    "settings.text_debug": {
      en: "Debug mode",
      jp: "デバッグ モード",
    },
    "settings.text_random_seed": {
      en: "Random seed",
      jp: "ランダムシード",
    },
    "settings.text_save": {
      en: "Save",
      jp: "保存",
    },
    "settings.credits": {
      en: "Credits",
      jp: "クレジット",
    },
  }, // en / jp
  /** The additional textalive datas (see https://developer.textalive.jp/events/magicalmirai2026/) */
  TEXTALIVE_DATAS: {
    // こたえて / imie
    1: {
      URL: "https://piapro.jp/t/6W2N/20251215164617",
      DATAS: {
        video: {
          // 音楽地図訂正履歴
          beatId: 4827293,
          chordId: 2963754,
          repetitiveSegmentId: 3086261,

          // 歌詞URL: https://piapro.jp/t/9o24
          // 歌詞タイミング訂正履歴: https://textalive.jp/lyrics/piapro.jp%2Ft%2F6W2N%2F20251215164617
          lyricId: 126519,
          lyricDiffId: 28645,
        },
      },
    },
    // アフター・ザ・カーテン / Rulmry
    2: {
      URL: "https://piapro.jp/t/zoqO/20251214200738",
      DATAS: {
        video: {
          // 音楽地図訂正履歴
          beatId: 4827294,
          chordId: 2963755,
          repetitiveSegmentId: 3086262,

          // 歌詞URL: https://piapro.jp/t/EVO2
          // 歌詞タイミング訂正履歴: https://textalive.jp/lyrics/piapro.jp%2Ft%2FzoqO%2F20251214200738
          lyricId: 126591,
          lyricDiffId: 28627,
        },
      },
    },
    // シャッターチャンス / 夜未アガリ
    3: {
      URL: "https://piapro.jp/t/PNpQ/20251209170719",
      DATAS: {
        video: {
          // 音楽地図訂正履歴
          beatId: 4827295,
          chordId: 2963756,
          repetitiveSegmentId: 3086263,

          // 歌詞URL: https://piapro.jp/t/wyWv
          // 歌詞タイミング訂正履歴: https://textalive.jp/lyrics/piapro.jp%2Ft%2FPNpQ%2F20251209170719
          lyricId: 126542,
          lyricDiffId: 28628,
        },
      },
    },
    // 世界最後の音楽隊 / 夏山よつぎ×ど～ぱみん
    4: {
      URL: "https://piapro.jp/t/B3yJ/20251215061727",
      DATAS: {
        video: {
          // 音楽地図訂正履歴
          beatId: 4827296,
          chordId: 2963757,
          repetitiveSegmentId: 3086264,

          // 歌詞URL: https://piapro.jp/t/9U-6
          // 歌詞タイミング訂正履歴: https://textalive.jp/lyrics/piapro.jp%2Ft%2FB3yJ%2F20251215061727
          lyricId: 126594,
          lyricDiffId: 28629,
        },
      },
    },
    // トリツクロジー / 鶴三
    5: {
      URL: "https://piapro.jp/t/QBdL/20251215094303",
      DATAS: {
        video: {
          // 音楽地図訂正履歴
          beatId: 4827297,
          chordId: 2963758,
          repetitiveSegmentId: 3086265,

          // 歌詞URL: https://piapro.jp/t/Nixq
          // 歌詞タイミング訂正履歴: https://textalive.jp/lyrics/piapro.jp%2Ft%2FQBdL%2F20251215094303
          lyricId: 126593,
          lyricDiffId: 28630,
        },
      },
    },
    // TAKEOVER / Twinfield
    6: {
      URL: "https://piapro.jp/t/E2i3/20251215092113",
      DATAS: {
        video: {
          // 音楽地図訂正履歴
          beatId: 4827298,
          chordId: 2963759,
          repetitiveSegmentId: 3086266,

          // 歌詞URL: https://piapro.jp/t/zxWP
          // 歌詞タイミング訂正履歴: https://textalive.jp/lyrics/piapro.jp%2Ft%2FE2i3%2F20251215092113
          lyricId: 126533,
          lyricDiffId: 28631,
        },
      },
    },
  },
  // "Fix" for this:
  // The grand prize song "こたえて" (imie) from this year's music contest has the third paragraph of its lyrics as a chorus sung during the second paragraph. Since the TextAlive App API cannot properly represent such overlapping choruses, each character in the chorus range is assigned timing information with a length of 1 millisecond.

  // For the correct timing information of characters in the chorus range, you can download a commented JSON file (.jsonc) here. Please use it as needed for your programming.
  // https://developer.textalive.jp/events/magicalmirai2026/6W2N_chorus_timings.jsonc
  TEXTALIVE_FIRST_SONG_FIX: {
    BUGGY_SECTION_START: 65307,
    BUGGY_SECTION_END: 65537,
    FIX: [
      // どれほどの苦しみも悲しみの向こうに
      [52140, "どれ"],
      [52585, "ほど"],
      [53272, "の"],
      [53490, "苦しみ"],
      [54906, "も"],
      [55623, "悲しみ"],
      [56865, "の"],
      [57140, "向こう"],
      [57729, "に"],
      // きっと私の目指す私がいると信じ続けていた
      [57903, "きっと"],
      [59444, "私"],
      [59951, "の"],
      [60461, "目指す"],
      [61363, "私"],
      [62083, "が"],
      [63058, "いる"],
      [63431, "と"],
      [63678, "信じ"],
      [64254, "続け"],
      [65342, "て"],
      [65585, "い"],
      [65806, "た"],
    ],
    SONG_NAME: "こたえて",
  },
};
