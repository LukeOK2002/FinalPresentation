import os, sys
SK = '/root/.claude/skills/synced/4e0ea4d7-c568-4bbf-ae1d-e23fce685fc3_d1ab2ef0-75cd-4219-be4f-f884141ad564/kurzgesagt-reel'
sys.path.insert(0, SK + '/scripts')
from kz import *

DUR = 13.0
GOLD = '#FFC94A'
PINK = '#FF4FA3'
WHITE = '#FFFFFF'
MUTED = '#B9B7D8'


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
T0, TSTEP = .5, .3


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
SENT_START = [5.0, 6.95]            # reveal start of sentence 1 and 2
QSTEP = .15
# highlight phrases: list of (word-index ranges per line), colour, start time
HL_PHRASES = [
    ([(0, 3, 5), (1, 0, 5)], GOLD, 7.3),          # "not value" + "GTA 6 more than you."
    ([(2, 3, 5), (3, 0, 2)], PINK, 9.0),          # "honest and" + "caring relationship,"
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
    dim = 1 - .25 * ease(prog(t, 4.6, 5.4))
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
    ck = prog(t, 4.5, 5.2)
    if ck > 0:
        l, tp, r_, b = CARD
        cx, cy = (l + r_) / 2, (tp + b) / 2
        s = eback(ck, 1.2)
        cv.save()
        cv.translate(cx, cy)
        cv.scale(s, s)
        cv.translate(-cx, -cy)
        glow(cv, cx, cy, 700, PINK, 40 * ck, mid=1)
        cv.drawPath(rrp(l, tp + 14, r_, b + 14, 44), paint('#05031a', 150, blur=22))
        cv.drawPath(rrp(l, tp, r_, b, 44), paint('#1B1650', 250))
        cv.drawPath(rrp(l, tp, r_, b, 44), paint(GOLD, 120, stroke=3))
        shaded(cv, rrp(l, tp + 44, l + 18, b - 44, 9), GOLD, dx=-2, dy=0)
        text(cv, '“', l + 100, tp + 150, font('bold', 300), GOLD, 255, shadow=0)
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
        c = '#1B1650' if marked.get(idx) == GOLD else WHITE
        text(cv, w, x, y + (1 - a) * 16, f, c, A(255 * a), anchor='l', shadow=0 if idx in marked else 5)

    # ---- attribution + satire note
    at = ease(prog(t, 9.9, 10.5))
    if at > 0:
        cv.drawPath(poly([(Q_X, 1318), (Q_X + 70 * at, 1318)], False), paint(GOLD, 255, stroke=4))
        text(cv, 'Wives and Girlfriends Association of America', Q_X, 1362 + (1 - at) * 10, font('med', 28), '#E9E7FF', A(255 * at), anchor='l')
        text(cv, 'Satire. Not a real statement.', Q_X, 1416, font('med', 22), '#8F8DB5', A(255 * at), anchor='l')


def draw(cv, t, fi):
    cv.drawRect(R(0, 0, W, H), paint(shader=lin(0, 0, 0, H, ['#0A0720', '#241258', '#0A0720'])))
    stars(cv, t, ymax=1700, a=.7)
    for i in range(7):
        bx = (i * 173 + t * 14 * (1 + i % 3)) % 1180 - 50
        by = 200 + (i * 241) % 1400 - math.sin(t * .6 + i) * 20
        cv.drawCircle(bx, by, 16 + (i % 3) * 14, paint(('#FF9FD0', '#9FD4FF', '#FFE08A')[i % 3], 24, blur=6))
    k = 1 + .03 * ease(prog(t, 0, DUR))
    cv.save()
    cv.translate(540, 760)
    cv.scale(k, k)
    cv.translate(-540, -760)
    draw_scene(cv, t)
    cv.restore()
    vignette(cv, 140)
    fade = 1 - prog(t, 0, .3)
    if fade > 0:
        cv.drawRect(R(0, 0, W, H), paint('#000000', 255 * fade))


if __name__ == '__main__':
    run('gta6_wgaa_statement', DUR, draw)
