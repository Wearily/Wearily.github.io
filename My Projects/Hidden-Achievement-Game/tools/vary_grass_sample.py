"""
Builds 4 grass footstep variations from the recorded example (assets/sounds/experimental/grassfootstep.wav)
and writes them to assets/sounds/experimental/grass_1.wav ... grass_4.wav

    python3 tools/vary_grass_sample.py

Standard library only. Helpers live in tools/sample_tools.py.

The game loads footsteps from assets/sounds, not experimental/: once a file sounds right, copy it up there.

What the recording contains (after cleaning):
     95-180 ms  light brush of the grass
    195-270 ms  the main crunch as the foot lands
       ~340 ms  a sharp snap (toe / a stem breaking)
    everything outside that is silence or low rumble

Cleaning applied to every version:
    - 4th order high-pass at 120 Hz: removes the mic rumble that filled the whole file
      (it was also out of phase between the channels; without it L/R line up, so mono is safe)
    - mixed to mono (the game pans the feet itself)
    - a gentle noise gate to keep the boosted background hiss down
    - trimmed so the foot lands within ~20 ms of the file starting (the original landed at 340 ms,
      which would make every step sound late), and normalised to the same peak as the other surfaces

The 4 versions:
    1 natural  : the crunch -> snap as recorded
    2 brush    : the light brush leads in, a touch higher and brighter
    3 heavy    : lower, darker, and the snap pulled in close for a quicker, weightier step
    4 shuffled : the crunch rebuilt from re-ordered grains, so its crackle pattern is new
"""

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
import generate_footsteps as g  # noqa: E402
from sample_tools import RATE, read_mono, ms, cut, fade, join, resample, gate, tilt, shuffle_grains, write  # noqa: E402

HERE = os.path.dirname(__file__)
SOURCE = os.path.join(HERE, "..", "assets", "sounds", "experimental", "grassfootstep.wav")
OUT_DIR = os.path.join(HERE, "..", "assets", "sounds", "experimental")


# ---------- helpers ----------

def with_snap(x, gain):
    """turn the toe snap (~335-360 ms in the recording) up or down, with short ramps"""
    x = list(x)
    a, b, ramp = ms(328), ms(365), ms(5)
    for i in range(a - ramp, b + ramp):
        if i < a:
            k = (i - (a - ramp)) / ramp
        elif i > b:
            k = 1 - (i - b) / ramp
        else:
            k = 1
        x[i] *= 1 + (gain - 1) * k
    return x


# ---------- build ----------

def clean(raw):
    x = g.biquad(g.biquad(raw, "highpass", 120, 0.707), "highpass", 120, 0.707)
    quiet = x[ms(450):ms(650)] # nothing but background here
    floor = math.sqrt(sum(v * v for v in quiet) / len(quiet))
    return gate(x, floor * 5)


# the snap is the loudest moment in the recording; left at full level it turns every step into a click,
# so each version sets its own level (which also makes them differ more)

def natural(x, rng):
    return fade(cut(with_snap(x, 0.6), 188, 430), 2, 60)


def brush(x, rng):
    x = with_snap(x, 0.5)
    lead = cut(x, 110, 180)
    step = cut(x, 190, 420)
    out = join(lead, step, 20)
    return fade(tilt(resample(out, 1.06), 0.35), 2, 60)  # +1 semitone, a bit more air


def heavy(x, rng):
    x = with_snap(x, 0.45)
    crunch = cut(x, 188, 285)
    snap = cut(x, 330, 420)
    out = join(crunch, snap, 15)  # the snap now follows the crunch by ~80 ms
    return fade(tilt(resample(out, 0.89), -0.6), 2, 70)  # -2 semitones, darker


def shuffled(x, rng):
    # new crackle pattern -> snap -> the grass springing back (re-ordered brush grains)
    x = with_snap(x, 0.55)
    crunch = shuffle_grains(cut(x, 190, 275), rng)
    snap = cut(x, 332, 380)
    settle = [v * 0.5 for v in shuffle_grains(cut(x, 110, 180), rng)]
    out = join(join(crunch, snap, 10), settle, 15)
    out = [a + b * 0.25 for a, b in zip(out, g.biquad(out, "bandpass", 4000, 1.0))]
    return fade(resample(out, 1.03), 2, 50)


VERSIONS = [natural, brush, heavy, shuffled]


if __name__ == "__main__":
    x = clean(read_mono(SOURCE))
    for i, make in enumerate(VERSIONS, 1):
        rng = random.Random(f"grass-sample-{i}")
        write(os.path.join(OUT_DIR, f"grass_{i}.wav"), make(x, rng))
