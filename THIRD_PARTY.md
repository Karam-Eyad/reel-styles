# Third-party components

This project does not bundle code from other Claude Code skills. It uses these open-source tools at runtime:

| Component | Used for | License |
|---|---|---|
| [Rubik](https://github.com/googlefonts/rubik) (bundled in `split-reel-style/engine/fonts`) | Caption & title font | SIL OFL 1.1 (`OFL.txt`) |
| [puppeteer-core](https://github.com/puppeteer/puppeteer) (installed by `npm install`) | Headless Chrome frame rendering | Apache-2.0 |
| [openai-whisper](https://github.com/openai/whisper) (pip) | Speech-to-text with word timestamps | MIT |
| [rembg](https://github.com/danielgatis/rembg) + u2net models (pip) | Person cut-out for the split layout | MIT / Apache-2.0 |
| [FFmpeg](https://ffmpeg.org) (system) | Video & audio processing | LGPL/GPL (not redistributed) |
| numpy, scipy, Pillow (pip) | Audio synthesis, image handling | BSD |

Brand logos used in your videos (e.g. via simpleicons.org) remain the property of their owners; fetch and use them according to each brand's guidelines.
