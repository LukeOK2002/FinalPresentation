import os, sys
from kzs import *

DUR = 15.0
GOLD = '#FFD23F'
PINK = '#FF3D9A'
WHITE = '#FFFFFF'
MUTED = '#B9B7D8'
NAVY_TXT = '#1D1A6B'


def A(x):
    return int(clamp(x, 0, 255))


# ------------------------------------------------------------------ title: appears word by word
TITLE_SIZE = 64
TITLE_LINES = [
    [('The', WHITE), ('Wives', GOLD), ('and', GOLD), ('Girlfriends', GOLD)],
    [('Association', GOLD), ('of', GOLD), ('America', GOLD)],
    [('has', WHITE), ('released', WHITE), ('a', WHITE), ('statement', WHITE)],
]
TITLE_Y = [345, 430, 515]
T0, TSTEP = .5, .45          # word cadence slowed by 50%


def title_words():
    f = font('bold', TITLE_SIZE)
    out, idx = [], 0
    for li, line in enumerate(TITLE_LINES):
        full = ' '.join(w for w, _ in line)
        x0 = 540 - f.measureText(full) / 2
        for wi, (w, c) in enumerate(line):
            pre = ' '.join(ww for ww, _ in line[:wi]) + (' ' if wi else '')
            out.append((w, c, x0 + f.measureText(pre), TITLE_Y[li], T0 + idx * TSTEP))
            idx += 1
    return out


TITLE_W = title_words()
TITLE_DONE = T0 + (len(TITLE_W) - 1) * TSTEP + .4

# ------------------------------------------------------------------ quote card
CARD = (70, 650, 1010, 1470)
Q_SIZE = 54      # auto-fitted below
Q_X = 135
Q_LINES = [
    ['Your', 'man', 'should', 'not', 'value'],
    ['GTA', '6', 'more', 'than', 'you.'],
    ['You', 'deserve', 'an', 'honest', 'and'],
    ['caring', 'relationship,', 'free'],
    ['from', 'outside', 'interference.'],
]
SENT_START = [6.2, 9.1]            # reveal start of sentence 1 and 2
QSTEP = .225
# highlight phrases: list of (word-index ranges per line), colour, start time
HL_PHRASES = [
    ([(0, 3, 5), (1, 0, 5)], GOLD, 9.2),          # "not value" + "GTA 6 more than you."
    ([(2, 3, 5), (3, 0, 2)], '#61E7ED', 11.9),          # "honest and" + "caring relationship,"
]


def fit_size():
    f1 = font('semi', 100)
    widest = max(f1.measureText(' '.join(l)) for l in Q_LINES)
    return min(64, 100 * 800 / widest)


Q_SIZE = fit_size()
Q_LH = Q_SIZE * 1.55
Q_Y0 = 850


def quote_words():
    f = font('semi', Q_SIZE)
    out, idx = [], 0
    s1 = sum(len(l) for l in Q_LINES[:2])
    for li, line in enumerate(Q_LINES):
        for wi, w in enumerate(line):
            pre = ' '.join(line[:wi]) + (' ' if wi else '')
            x = Q_X + f.measureText(pre)
            sent = 0 if idx < s1 else 1
            k = idx if sent == 0 else idx - s1
            out.append((w, x, Q_Y0 + li * Q_LH, SENT_START[sent] + k * QSTEP, f.measureText(w)))
            idx += 1
    return out


Q_W = quote_words()


def word_index(li, wi):
    return sum(len(l) for l in Q_LINES[:li]) + wi


def draw_scene(cv, t):
    # ---- title
    dim = 1 - .25 * ease(prog(t, 5.8, 6.6))
    for w, c, x, y, ts in TITLE_W:
        a = eout(prog(t, ts, ts + .3))
        if a <= 0:
            continue
        f = font('bold', TITLE_SIZE)
        text(cv, w, x, y - (1 - a) * 22, f, c, A(255 * a * dim), anchor='l', shadow=8)
    rule = ease(prog(t, TITLE_DONE, TITLE_DONE + .5))
    if rule > 0:
        cv.drawPath(poly([(540 - 150 * rule, 585), (540 + 150 * rule, 585)], False), paint(GOLD, 220, stroke=5))

    # ---- quote card
    ck = prog(t, 5.7, 6.4)
    if ck > 0:
        l, tp, r_, b = CARD
        cx, cy = (l + r_) / 2, (tp + b) / 2
        s = eback(ck, 1.2)
        cv.save()
        cv.translate(cx, cy)
        cv.scale(s, s)
        cv.translate(-cx, -cy)
        glow(cv, cx, cy, 760, '#FF3D9A', 70 * ck, mid=1)
        cv.drawPath(rrp(l, tp + 16, r_, b + 16, 44), paint('#4A0050', 255))
        cv.drawPath(rrp(l, tp, r_, b, 44), paint('#FFFFFF'))
        shaded(cv, rrp(l + 4, tp + 50, l + 24, b - 50, 10), YEL, dx=-2, dy=0)
        text(cv, '\u201c', l + 100, tp + 150, font('bold', 300), YEL, 255, shadow=0)
        cv.restore()

    # ---- highlight marker sweeps (behind the words), then the words themselves
    f = font('semi', Q_SIZE)
    marked = {}                                    # word index -> marker colour once the sweep has passed it
    for phrases, colr, ts in HL_PHRASES:
        for pi, (li, w0, w1) in enumerate(phrases):
            a = ease(prog(t, ts + pi * .4, ts + pi * .4 + .5))
            if a <= 0:
                continue
            first = Q_W[word_index(li, w0)]
            last = Q_W[word_index(li, w1 - 1)]
            x0, x1 = first[1] - 12, last[1] + last[4] + 12
            y = Q_Y0 + li * Q_LH
            cv.drawPath(rrp(x0, y - Q_SIZE * .66, x0 + (x1 - x0) * a, y + Q_SIZE * .56, 12), paint(colr, 255))
            for wi in range(w0, w1):
                wd = Q_W[word_index(li, wi)]
                if x0 + (x1 - x0) * a >= wd[1] + wd[4]:
                    marked[word_index(li, wi)] = colr
    for idx, (w, x, y, ts, wd) in enumerate(Q_W):
        a = eout(prog(t, ts, ts + .3))
        if a <= 0:
            continue
        text(cv, w, x, y + (1 - a) * 16, f, NAVY_TXT, A(255 * a), anchor='l', shadow=0)

    # ---- attribution
    at = ease(prog(t, 12.8, 13.4))
    if at > 0:
        cv.drawPath(poly([(Q_X, 1318), (Q_X + 70 * at, 1318)], False), paint(YEL, 255, stroke=5))
        text(cv, 'Wives and Girlfriends Association of America', Q_X, 1366 + (1 - at) * 10, font('semi', 30), '#4A45A8', A(255 * at), anchor='l')


def draw(cv, t, fi):
    cv.drawRect(R(0, 0, W, H), paint(shader=rad(540, 820, 1500, ['#E0108A', '#B0007A', '#6A0A66', '#3A0F62'], [0, .35, .72, 1])))
    sunburst(cv, 540, 820, t, '#FFFFFF', 20, 20, 2600, .035)
    for i in range(14):                                         # tone-on-tone skyline
        bx = -30 + i * 85
        bh = 220 + (i * 97) % 260
        cv.drawRect(R(bx, H - bh, bx + 70, H), paint('#7A0A74', 140))
    sparkle_field(cv, t, 31, 40, 0, H)
    k = 1 + .03 * ease(prog(t, 0, DUR))
    cv.save()
    cv.translate(540, 760)
    cv.scale(k, k)
    cv.translate(-540, -760)
    draw_scene(cv, t)
    cv.restore()
    fade = 1 - prog(t, 0, .3)
    if fade > 0:
        cv.drawRect(R(0, 0, W, H), paint('#000000', 255 * fade))


if __name__ == '__main__':
    run('gta6_wgaa_statement', DUR, draw)
