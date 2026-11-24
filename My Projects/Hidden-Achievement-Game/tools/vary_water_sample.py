"""
Builds 4 water footstep variations from the recorded example (assets/sounds/experimental/waterfootstep.wav)
and writes them to assets/sounds/experimental/water_1.wav ... water_4.wav

    python3 tools/vary_water_sample.py

Standard library only. Helpers live in tools/sample_tools.py.

The game loads footsteps from assets/sounds, not experimental/: once a file sounds right, copy it up there.

What the recording contains:
      0-110 ms  near silence
    115-175 ms  the foot entering the water
       ~180 ms  the main plunge (loudest moment)
    200-260 ms  the splash spraying out
    270-340 ms  a second slosh, with a low plunk at ~325 ms
    350-470 ms  water settling, then quiet drips out to ~700 ms

It's a clean recording (no rumble, low background, channels in phase), so cleaning is light:
    - gentle 2nd order high-pass at 80 Hz, just to keep sub energy out of the mix
    - mixed to mono (the game pans the feet itself)
    - trimmed so the foot touches the water within ~5 ms of the file starting (it was ~115 ms in),
      and normalised to the same peak as the other surfaces

The 4 versions:
    1 natural  : entry -> plunge -> slosh -> settle, as recorded
    2 shallow  : higher and brighter, cut after the second slosh, like stepping through a puddle
    3 deep     : lower and darker, the full slosh, like wading in up to the knees
    4 shuffled : the entry and plunge as recorded, then the slosh rebuilt from re-ordered grains
                 (re-shaped to the original's loudness contour so it doesn't sound like a second step)
"""

import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
import generate_footsteps as g  # noqa: E402
from sample_tools import read_mono, cut, fade, join, resample, tilt, shuffle_grains, match_envelope, write  # noqa: E402

HERE = os.path.dirname(__file__)
SOURCE = os.path.join(HERE, "..", "assets", "sounds", "experimental", "waterfootstep.wav")
OUT_DIR = os.path.join(HERE, "..", "assets", "sounds", "experimental")

START = 110 # ms, just before the foot touches the water


def clean(raw):
    return g.biquad(raw, "highpass", 80, 0.707)


def natural(x, rng):
    return fade(cut(x, START, 530), 2, 90)


def shallow(x, rng):
    out = cut(x, START, 365)
    return fade(tilt(resample(out, 1.09), 0.25), 2, 60)  # +1.5 semitones, a little brighter


def deep(x, rng):
    out = cut(x, START, 530)
    return fade(tilt(resample(out, 0.86), -0.5), 2, 110)  # -2.6 semitones, darker


def shuffled(x, rng):
    attack = cut(x, START, 205)
    original = cut(x, 200, 470)
    slosh = shuffle_grains(original, rng, grain_ms=(20, 40))  # longer grains suit water
    slosh = match_envelope(slosh, original)  # new texture, but it still dies away like the real splash
    slosh = [v * 0.75 for v in slosh]         # keep the plunge as the loudest moment
    out = join(attack, slosh, 12)
    return fade(resample(out, 1.03), 2, 90)


VERSIONS = [natural, shallow, deep, shuffled]


if __name__ == "__main__":
    x = clean(read_mono(SOURCE))
    for i, make in enumerate(VERSIONS, 1):
        rng = random.Random(f"water-sample-{i}")
        write(os.path.join(OUT_DIR, f"water_{i}.wav"), make(x, rng))
