"""
Shared helpers for building footstep variations from recordings
(used by tools/vary_grass_sample.py and tools/vary_water_sample.py).

Standard library only. Filters and wav writing come from tools/generate_footsteps.py.
"""

import math
import os
import struct
import sys
import wave

sys.path.insert(0, os.path.dirname(__file__))
import generate_footsteps as g  # noqa: E402

RATE = g.RATE


def read_mono(path):
    """16 or 24-bit PCM wav at 44.1 kHz -> list of floats, channels averaged to mono"""
    with wave.open(path, "rb") as w:
        width = w.getsampwidth()
        if width not in (2, 3) or w.getframerate() != RATE:
            raise SystemExit("expected a 16 or 24-bit 44.1 kHz wav: " + path)
        ch, n = w.getnchannels(), w.getnframes()
        raw = w.readframes(n)
    if width == 2:
        s = [v / 32768 for v in struct.unpack("<%dh" % (n * ch), raw)]
    else:
        s = [int.from_bytes(raw[i:i + 3], "little", signed=True) / 8388608 for i in range(0, len(raw), 3)]
    return [sum(s[i:i + ch]) / ch for i in range(0, len(s), ch)]


def ms(x):
    return int(x / 1000 * RATE)


def cut(x, start_ms, end_ms):
    """slice with short fades so cuts never click"""
    part = x[ms(start_ms):ms(end_ms)]
    return fade(part, 3, 3)


def fade(x, in_ms, out_ms):
    x = list(x)
    a, b = ms(in_ms), ms(out_ms)
    for i in range(min(a, len(x))):
        x[i] *= i / a
    for i in range(min(b, len(x))):
        x[-1 - i] *= i / b
    return x


def join(a, b, overlap_ms):
    """equal-power crossfade b onto the end of a"""
    o = min(ms(overlap_ms), len(a), len(b))
    out = a[:len(a) - o]
    for i in range(o):
        t = i / o
        out.append(a[len(a) - o + i] * math.cos(t * math.pi / 2) + b[i] * math.sin(t * math.pi / 2))
    return out + b[o:]


def resample(x, rate):
    """rate > 1 plays faster: higher pitch and shorter (like a tape speed change)"""
    out, pos = [], 0.0
    while pos < len(x) - 1:
        i = int(pos)
        f = pos - i
        out.append(x[i] * (1 - f) + x[i + 1] * f)
        pos += rate
    return out


def gate(x, threshold, floor_gain=0.15):
    """smooth downward expander: quieter than threshold gets turned down towards floor_gain"""
    att = math.exp(-1 / (0.001 * RATE))
    rel = math.exp(-1 / (0.04 * RATE))
    env, out = 0.0, []
    for v in x:
        a = abs(v)
        env = att * env + (1 - att) * a if a > env else rel * env + (1 - rel) * a
        gain = 1.0 if env >= threshold else max(floor_gain, (env / threshold) ** 2)
        out.append(v * gain)
    return out


def tilt(x, bright):
    """bright > 0 adds air (high frequencies), bright < 0 darkens"""
    if bright >= 0:
        return [a + b * bright for a, b in zip(x, g.biquad(x, "highpass", 4000))]
    return [a * (1 + bright) + b * -bright for a, b in zip(x, g.biquad(x, "lowpass", 5500))]


def shuffle_grains(x, rng, grain_ms=(12, 24)):
    """chop into overlapping hann grains and put them back in a new order, keeping the length"""
    grains, pos = [], 0
    while pos < len(x):
        n = ms(rng.uniform(*grain_ms))
        grains.append(x[pos:pos + n])
        pos += n
    order = []
    out = []
    while len(out) < len(x):
        if not order:
            order = grains[:]
            rng.shuffle(order)
        gr = order.pop()
        win = [v * 0.5 * (1 - math.cos(2 * math.pi * i / max(1, len(gr) - 1))) for i, v in enumerate(gr)]
        out = join(out, win, len(gr) / RATE * 1000 * 0.4) if out else win
    return out[:len(x)]


def write(path, x):
    g.write_wav(path, g.finish(x, 0.7, 0.03))
    print("wrote", os.path.relpath(path), "%.2fs" % (len(x) / RATE))


def match_envelope(x, ref, window_ms=20, max_gain=4.0):
    """give x the loudness contour of ref (same length): keeps x's texture, ref's rise and decay"""
    def contour(sig):
        n = max(1, ms(window_ms))
        out, acc = [], 0.0
        sq = [v * v for v in sig]
        for i in range(len(sig)):
            acc += sq[i]
            if i >= n:
                acc -= sq[i - n]
            out.append(math.sqrt(max(acc, 0) / n))
        return out
    cx, cr = contour(x), contour(ref)
    return [v * min(max_gain, r / c) if c > 1e-6 else 0.0 for v, c, r in zip(x, cx, cr)]
