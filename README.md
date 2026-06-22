# My entry for the Magical Mirai Programming contest (LyriCity)

This is my entry for the magical mirai programming contest

## Specs
| Name | Value |
| --- | --- |
|  |  |
| Theme | City at night |
| Interactions | A little bit |
| Languages | JP + EN |
| Technologies | THREE.js |
| Type | 3D |
| Colors | Black, White and #86cecb (Cyan) with colorful fireworks |

## Documentation structure

I made documentation for both usage and the code

## Important note
### Since my local version contains an API key (for textalive), you just need to name `Env.js.sample` to `Env.js`, and you can (if you want) enter your own API key inside of it. !! This step is required, else the app won't run !!

## Second note
On mobile (at least iPhone running iOS 26), if there's no user interaction (click, ...) between the textalive initialization and the song playing, no sound will be played.
To fix this, I forced the user (only on mobile) to click on a button after the textalive's initialization

## Usage

### Song selector
This is the first thing you see

#### Content
1. A 2d city : this is the songs. Half the buildings are here for decoration and the other half are songs
2. Three buttons: `<-` `>` `->`:
    - The first one will select a song in the "left" direction
    - The second one will play the song (and start the app)
    - The third one will select a song in the "right" direction
3. A phone with a music icon inside
    - On the phone you can see the title of the song (in black), with the artist (in gray)
    - The other things are here for decoration
    - Note: no song preview is played during the selection

#### Example usage
- You find the song you want with the buttons
- You check the name in the phone
- You click "play"

### Settings
This is the settings panel
There aren't that many settings
Note: it also contains the app credits

#### Access
There's a settings button with a settings icon (top-right). Click on it.

#### Content
1. Normal (and advanced) settings : here you can find the "normal" settings:
    - Debug mode : this will show the number of FPS in a counter (Stats.js)
    - Random seed : by default the buildings are placed the same way (random seed: 39), if you want to change it, set another value in the textbox
    - Save : this will save the settings (! it reloads the page)
2. Language settings : you can change the display language:
    - English other Japanese
    - ! it also reloads the page
3. Credits (english-only sections) here you can find:
    - Link to my Github and website
    - Link to all CC0 assets I used
    - Explanation of the AI usage (for the code)
    - My development environnement
    - Credits for the text translations

#### Notes
The settings are set by URL search params (?xyz=xyz&...)
Example:
?seed=38&debug=true&lang=en

### The lyrics preview (City)

#### Access
Choose a song and click on the play button

#### Timeline

1. The camera is first in a "warp-like tunnel"
2. The camera appear in a city, and fly next to the buildings smoothly. A shooting star is in front of the camera
3. The lyrics appear next to the camera, and fly faster so they disappear after some time
4. The buildings light up when the camera is close to them
5. You see firework on the horizon

#### Content

1. Warp tunnel (at first)
2. Buildings (that light up when you are close to them)
3. Lyrics (that fly beside the camera for a short time)
4. A progress bar (top) where lyrics also appear. **You can click somewhere on the progress bar and you can set the song playback time**
5. Fireworks
6. When you hover a building, it get a little bit bigger
7. When you click on a building a firework appear (you need to click on far away buildings otherwise you won't see the animation)
8. A shooting star, with particles
9. The buildings a brighter if they are far away
10. There are two buttons (bottom-left):
    - A play/pause button: play and pauses the app
    - An exit button: exits directly to the song selector

## The code

Here's a description of all classes.
For a description of most methods/variables, you can see the comments inside the code
I commented a LOT the code, so it should be easy to read

### Directory structure
- index.html -> the main page
- shell.nix/shell.sh -> utils for NixOS (my operating system)
- assets: the actual code/assets
    - assets/3d: all 3d models (3 building types)
    - assets/css/main.css: the css
    - assets/js: the Javascript code (see Javascript files)
    - assets/textures: All textures (images)
        - building: a single window texture (repeated to create the "light up" effect)
        - city: the city svg (!! the inkscape svg, source.old.svg does not correspond to city.svg)
        - player: the phone svg (!! same as above)
        - skybox: the skybox (with the source)

### Javascript files / classes
Located under assets/js

#### App
Location: App.js
The main app, manages (most) ThreeJS stuff.
Manages the overall state of the app, the changes between parts (song selector, intro, play, outro)
Is the "body" of the app

#### Build
Location: Build.js
A single build.
Handles creation, deletion and model loading

#### BuildInteractions
Location: BuildInteractions.js
Handles all build interactions + wraps the fireworkManager
Handles:
- Hover
- Click
- Auto-launched fireworks

#### BuildManager
Location: BuildManager.js
Manages the Builds classes
Handles: creating "virtual" builds, placing them, deleting all of them, etc.

#### Controls
Location: Controls.js
Handles the controls (play/pause and exit)

#### Firework
Location: Firework.js
Represent a firework, can create particles and be updated

#### FireworkManager
Location: Firework.js
The class that manages all the fireworks (handles updates and launch)

#### Main.js
Class: None
Entrypoint for the app

#### ParticleSystem
Location: ParticleSystem.js
A particle system utils
Can:
- ensure the number of particles
- remove all particles
- add a particle
- updates particles

#### Point
Location: PathGen.js
Small util, a 3d point
Has some other functions that THREE.Vector3 doesn't have
ex. distanceTo, and so on

#### PathGen
Location: PathGen.js
Manages the path, with:
- a loop
- knows which pos to return at which time
It also creates a smooth path
PathGen stands for PathGenerator
points stands for the cameraPathPoints
pathPoints stands for the smooth path points
It also handles the TextAlive API

#### Progress
Location: Progress.js
The progress bar
Handles click -> changes playback time
Can be updates
Also shows lyrics, with a little animation

#### SettingsPanel
Location: SettingsPanel.js
The settings panel.
Handles:
- The settings (saving/loading)
- The page translation

#### SongSelector
Location: SongSelector.js
The song selector
Uses SVGs and modifies them. I know this is not the best way to do it, but like that I can create the base svgs on Inkscape, it's way easier
Uses three buttons to go to the next song, play or go to the last song
Also shows the song title/artist in an svg. Handles translations.

#### Globals.js
Classes: None (`export const GLOBAL_VARIABLES`)
This file stores every "Magic number", parameters so they are not everywhere in the code

## Credits:
[CREDITS.md](./CREDITS.md)
