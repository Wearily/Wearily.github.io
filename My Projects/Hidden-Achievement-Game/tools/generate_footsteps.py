"""
Synthesizes footstep sounds for each terrain and writes them to assets/sounds/experimental/.

    python3 tools/generate_footsteps.py

Standard library only (no numpy). Every variation uses its own random seed, so running the
script again gives the same files. Change VARIATIONS or the recipes below and re-run to tweak.

Recipes (each step is layered, see src/audioEngine.js):
  grass : heel thump + a rustle of tiny blade "ticks", then a softer toe roll
  sand  : dull compression thump + dense granular crunch that swells as the foot sinks
  water : splash whose brightness falls away + a low plunge + rising bubble chirps
"""

import math
import os
import random
import struct
import wave

RATE = 44100
VARIATIONS = 5
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "sounds", "experimental")


# ---------- building blocks ----------

def silence(seconds):
    return [0.0] * int(seconds * RATE)


def add(dst, src, at=0.0, gain=1.0):
    """mix src into dst starting at `at` seconds"""
    start = int(at * RATE)
    for i, v in enumerate(src):
        j = start + i
        if j >= len(dst):
            break
        dst[j] += v * gain


def noise(seconds, rng):
    return [rng.uniform(-1, 1) for _ in range(int(seconds * RATE))]


def envelope(samples, attack, decay):
    """linear attack, then exponential decay with time constant `decay` (seconds)"""
    a = max(1, int(attack * RATE))
    out = []
    for i, v in enumerate(samples):
        if i < a:
            g = i / a
        else:
            g = math.exp(-(i - a) / (decay * RATE))
        out.append(v * g)
    return out


def chirp(seconds, f_from, f_to):
    """sine sweeping exponentially from f_from to f_to"""
    n = int(seconds * RATE)
    out, phase = [], 0.0
    for i in range(n):
        f = f_from * (f_to / f_from) ** (i / max(1, n - 1))
        phase += 2 * math.pi * f / RATE
        out.append(math.sin(phase))
    return out


def biquad_coeffs(kind, freq, q):
    """RBJ audio EQ cookbook"""
    w = 2 * math.pi * min(freq, RATE * 0.45) / RATE
    cw, sw = math.cos(w), math.sin(w)
    alpha = sw / (2 * q)
    if kind == "lowpass":
        b = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2]
    elif kind == "highpass":
        b = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2]
    else:  # bandpass, 0 dB peak
        b = [alpha, 0, -alpha]
    a = [1 + alpha, -2 * cw, 1 - alpha]
    return [x / a[0] for x in b], [a[1] / a[0], a[2] / a[0]]


def biquad(samples, kind, freq, q=0.707, freq_end=None):
    """filter; if freq_end is given the cutoff sweeps (exponentially) across the sound"""
    out = []
    x1 = x2 = y1 = y2 = 0.0
    n = len(samples)
    block = 64
    for start in range(0, n, block):
        f = freq if freq_end is None else freq * (freq_end / freq) ** (start / max(1, n))
        (b0, b1, b2), (a1, a2) = biquad_coeffs(kind, f, q)
        for x in samples[start:start + block]:
            y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
            x2, x1, y2, y1 = x1, x, y1, y
            out.append(y)
    return out


def grains(length, count, grain_len, rng, shape=lambda t: 1.0, amp_curve=1.0):
    """
    scatter short noise grains across `length` seconds
    shape(t) (0..1 over the length) sets how likely / loud grains are at that point
    amp_curve > 1 makes most grains quiet with a few loud ones (crunchier)
    """
    out = silence(length)
    placed = 0
    while placed < count:
        t = rng.random()
        if rng.random() > shape(t):
            continue
        g_len = rng.uniform(*grain_len)
        g = noise(g_len, rng)
        # hann window so grains don't click
        m = len(g)
        g = [v * 0.5 * (1 - math.cos(2 * math.pi * i / max(1, m - 1))) for i, v in enumerate(g)]
        add(out, g, t * length, (rng.random() ** amp_curve) * shape(t))
        placed += 1
    return out


def finish(samples, peak=0.7, fade=0.02):
    """fade out the tail, remove DC, normalise to `peak`"""
    mean = sum(samples) / len(samples)
    samples = [v - mean for v in samples]
    f = int(fade * RATE)
    for i in range(f):
        samples[-1 - i] *= i / f
    top = max(abs(v) for v in samples) or 1
    return [v / top * peak for v in samples]


def write_wav(path, samples):
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, v)) * 32767)) for v in samples))


# ---------- recipes ----------

def heel(rng, weight=1.0, low=1.0):
    """body of a foot landing: pitch-dropping sine + a puff of low noise"""
    length = 0.09
    out = silence(length)
    f = rng.uniform(95, 120) * low
    add(out, envelope(chirp(length, f, f * 0.55), 0.002, 0.022), 0, 0.55 * weight)
    puff = biquad(noise(0.05, rng), "lowpass", rng.uniform(250, 400) * low)
    add(out, envelope(puff, 0.001, 0.012), 0, 1.6 * weight)
    return out


def grass(rng):
    out = silence(0.34)
    toe_at = rng.uniform(0.06, 0.09)

    # heel, then a lighter toe
    add(out, heel(rng), 0.005)
    add(out, heel(rng, 0.45, 1.15), toe_at)

    # rustle: thin blade ticks, front loaded, a second smaller burst on the toe
    rustle = grains(0.24, rng.randint(55, 80), (0.002, 0.007), rng,
                    shape=lambda t: math.exp(-t * 4.5), amp_curve=1.6)
    rustle = biquad(biquad(rustle, "bandpass", rng.uniform(3500, 5000), 0.8), "highpass", 1500)
    add(out, rustle, 0.0, rng.uniform(0.9, 1.2))
    toe_rustle = grains(0.12, rng.randint(15, 25), (0.002, 0.005), rng,
                        shape=lambda t: math.exp(-t * 5), amp_curve=1.8)
    add(out, biquad(toe_rustle, "bandpass", rng.uniform(4500, 6500), 1.0), toe_at, 0.6)

    # a soft swish of air through the blades
    swish = biquad(noise(0.2, rng), "bandpass", rng.uniform(2500, 3500), 0.6)
    add(out, envelope(swish, 0.02, 0.05), 0.0, 0.05)
    return finish(out, 0.7)


def sand(rng):
    out = silence(0.4)

    # dull, muffled thump (sand soaks up the impact, so it's lower and softer than grass)
    add(out, heel(rng, 0.8, 0.65), 0.0)

    # crunch: lots of tiny grains that swell as the foot sinks, then trail off
    def sink(t):
        return min(1.0, t / 0.18) * math.exp(-max(0, t - 0.18) * 5)

    crunch = grains(0.32, rng.randint(260, 360), (0.0005, 0.002), rng, shape=sink, amp_curve=2.2)
    crunch = biquad(biquad(crunch, "bandpass", rng.uniform(1800, 2600), 0.7), "lowpass", 6500)
    add(out, crunch, 0.01, 1.4)

    # the soft "shhh" of sand shifting under the crunch
    shift = biquad(noise(0.3, rng), "bandpass", rng.uniform(900, 1400), 0.9)
    shift = [v * sink(i / len(shift)) for i, v in enumerate(shift)]
    add(out, shift, 0.01, 0.12)
    return finish(out, 0.7)


def water(rng):
    out = silence(0.55)

    # splash: bright at first, getting darker as the spray falls back
    splash = biquad(noise(0.4, rng), "lowpass", rng.uniform(6500, 8500), 0.9,
                    freq_end=rng.uniform(700, 1100))
    add(out, envelope(splash, 0.004, rng.uniform(0.07, 0.1)), 0.0, 0.8)

    # plunge: the foot pushing the water down
    f = rng.uniform(160, 200)
    add(out, envelope(chirp(0.14, f, f * 0.4), 0.003, 0.04), 0.01, 0.4)

    # bubbles: little sine chirps that rise in pitch, scattered after the impact
    for _ in range(rng.randint(6, 11)):
        at = 0.02 + rng.random() ** 1.7 * 0.33 # most bubbles come early
        life = rng.uniform(0.025, 0.07)
        f0 = rng.uniform(450, 1300)
        bubble = envelope(chirp(life, f0, f0 * rng.uniform(1.3, 1.9)), 0.002, life / 3)
        add(out, bubble, at, rng.uniform(0.08, 0.22) * (1 - at))

    # slosh tail
    slosh = biquad(noise(0.3, rng), "bandpass", rng.uniform(500, 800), 0.7)
    add(out, envelope(slosh, 0.05, 0.08), 0.08, 0.15)
    return finish(out, 0.75)


RECIPES = {"grass": grass, "sand": sand, "water": water}


if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, recipe in RECIPES.items():
        for v in range(1, VARIATIONS + 1):
            rng = random.Random(f"{name}-{v}")
            path = os.path.join(OUT_DIR, f"{name}_{v}.wav")
            write_wav(path, recipe(rng))
            print("wrote", os.path.relpath(path))
