import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kzs import *
from gta_bars import word_caption

DUR = 5.0
SPEED = 2.2          # chart animation runs 2.2x faster than its original 11 s timeline


# ------------------------------------------------------------------ simulated, noisy "sampled" data
PRE, POST, TARGET = 100, 31, 2.3         # days before release, days from release (day 0..30), after/before ratio
BASE = 8400


def make_data(seed=79):
    rng = random.Random(seed)
    vals, ar = [], 0.0
    for d in range(-PRE, POST):
        dow = d % 7
        season = 1 + (.10 if dow in (5, 6) else 0) - .04 + .04 * math.sin(d / 9.0)
        ar = .45 * ar + rng.gauss(0, .24)               # autocorrelated log-noise
        v = BASE * season * math.exp(ar)
        if rng.random() < .09 and d not in (0, 1):       # sudden spikes: celebrity splits, viral threads
            v *= rng.uniform(1.35, 1.95) if d < 0 else rng.uniform(1.15, 1.4)
        if rng.random() < .05:                           # sampling dropouts
            v *= rng.uniform(.45, .7)
        if d >= 0:                                       # launch shock: fast ramp, small overshoot, then settles
            v *= 1 + 1.5 * (1 - math.exp(-(d + .4) / 2.2)) + .35 * math.exp(-d / 5.0)
        vals.append(v)
    pre, post = vals[:PRE], vals[PRE:]
    mpre = sum(pre) / len(pre)
    k = TARGET * mpre / (sum(post) / len(post))          # rescale so post/pre is exactly 2.3x
    post = [v * k for v in post]
    return pre + post, mpre, sum(post) / len(post)


DATA, MEAN_PRE, MEAN_POST = make_data()
DAYS = list(range(-PRE, POST))

# ------------------------------------------------------------------ layout / colours (chart reference: two tinted panels, tags, arrow axes)
L, RT, T, BT = 170, 1000, 540, 1170       # plot box
PT, PB = 300, 1320                          # panel top / bottom
YMAX = 40000.0
GREEN_T, GREEN_L = '#2BD6A0', '#8CF5CF'
RED_T, RED_L = '#E8335B', '#FF8AA3'


def X(d):
    return L + (d + PRE) / (PRE + POST - 1) * (RT - L)


def Y(v):
    return BT - v / YMAX * (BT - T)


def head_day(t):
    if t < .7:
        return -PRE
    if t < 5.0:
        return lerp(-PRE, 0, (t - .7) / 4.3)
    if t < 5.7:
        return 0
    return lerp(0, POST - 1, ease(prog(t, 5.7, 8.5)))


def point_at(dh):
    i = int(clamp(dh + PRE, 0, len(DATA) - 1.0001))
    f = clamp(dh + PRE - i, 0, 1)
    v = lerp(DATA[i], DATA[min(i + 1, len(DATA) - 1)], f)
    return X(dh), Y(v)


def seg_path(d0, d1):
    p = skia.Path()
    x, y = point_at(d0)
    p.moveTo(x, y)
    i0, i1 = int(math.floor(d0 + PRE)) + 1, int(math.floor(d1 + PRE))
    for i in range(i0, i1 + 1):
        if DAYS[i] < d1:
            p.lineTo(X(DAYS[i]), Y(DATA[i]))
    x, y = point_at(d1)
    p.lineTo(x, y)
    return p, x, y


def draw_seg(cv, d0, d1, fill, line):
    if d1 - d0 < .02:
        return None
    path, hx, hy = seg_path(d0, d1)
    area = skia.Path(path)
    area.lineTo(hx, BT)
    area.lineTo(X(d0), BT)
    area.close()
    cv.drawPath(area, paint(fill, 215))
    cv.drawPath(path, paint(line, stroke=8))
    return hx, hy


def label_box(cv, x, y, s, size=26, c='#FFFFFF', a=255):
    f = font('semi', size)
    w = f.measureText(s) + 28
    cv.drawPath(rrp(x, y - size * .75, x + w, y + size * .65, 12), paint('#000000', A(170 * a / 255)))
    text(cv, s, x + 14, y - 1, f, c, A(a), anchor='l')
    return w


def draw_chart(cv, t):
    x0 = X(0)
    rel = ease(prog(t, 5.0, 5.5))
    cv.drawRect(R(0, PT, W, PB), paint(PANEL_L))
    if rel > 0:
        cv.drawRect(R(x0, PT, x0 + (W - x0) * rel, PB), paint(PANEL_R))
    text(cv, 'Mentions of \u201cbreakup\u201d', 70, 150, font('bold', 70), '#FFFFFF', anchor='l')
    text(cv, 'X (Twitter), mentions per day', 70, 228, font('med', 34), '#C9C6F2', anchor='l')
    tag(cv, 60, 336, 330, 74, 'Before release', '#3CCB86')
    if rel > 0:
        k = eback(prog(t, 5.0, 5.55), 1.6)
        cv.save()
        cv.translate(x0 + 130, 373)
        cv.scale(k, k)
        cv.translate(-(x0 + 130), -373)
        tag(cv, x0 + 14, 336, 240, 74, 'After release', RED, size=34)
        cv.restore()
    # axes + faint scale
    for v in (10000, 20000, 30000, 40000):
        p = paint('#FFFFFF', 30, stroke=2, cap='butt')
        p.setPathEffect(skia.DashPathEffect.Make([10, 10], 0))
        cv.drawPath(poly([(L, Y(v)), (RT, Y(v))], False), p)
        text(cv, '%dk' % (v // 1000), L - 20, Y(v), font('med', 26), '#AFA9E8', anchor='r')
    arrow_axis(cv, L, BT, L, T - 50, PERI, 8, 28)
    arrow_axis(cv, L, BT, RT + 44, BT, PERI, 8, 28)
    text(cv, 'Mentions', L + 22, T - 52, font('bold', 34), '#FFFFFF', anchor='l')
    for d in (-90, -60, -30, 30):
        text(cv, ('%+d' % d).replace('-', '\u2212'), X(d), BT + 40, font('med', 26), '#AFA9E8')
    text(cv, 'days from release', (L + RT) / 2, BT + 88, font('med', 28), '#C9C6F2')
    text(cv, 'Simulated data for illustration', 60, PB - 26, font('med', 22), '#FFFFFF', 120, anchor='l')

    dh = head_day(t)
    # data
    head = None
    if dh > -PRE + .05:
        head = draw_seg(cv, -PRE, min(dh, 0), GREEN_T, GREEN_L)
    if dh > .02:
        head = draw_seg(cv, 0, dh, RED_T, RED_L)
    if head:
        hx, hy = head
        glow(cv, hx, hy, 60, '#FFFFFF', 110)
        cv.drawCircle(hx, hy, 13, paint('#1A1E76'))
        cv.drawCircle(hx, hy, 8, paint('#FFFFFF'))

    # averages (translucent bands like the reference threshold)
    a_pre = ease(prog(t, 4.6, 5.2))
    a_post = ease(prog(t, 8.5, 9.0))
    if a_pre > 0:
        xe = lerp(L, X(0), a_pre) if a_post <= 0 else lerp(X(0), RT, a_post)
        cv.drawPath(poly([(L, Y(MEAN_PRE)), (xe, Y(MEAN_PRE))], False), paint('#FFFFFF', 85, stroke=10, cap='butt'))
        label_box(cv, L + 16, Y(MEAN_PRE) - 46, 'avg %.1fk' % (MEAN_PRE / 1000), 26, '#FFFFFF', 255 * a_pre)
    if a_post > 0:
        xs = lerp(RT, X(0), a_post)
        cv.drawPath(poly([(xs, Y(MEAN_POST)), (RT, Y(MEAN_POST))], False), paint('#FFD23F', 150, stroke=10, cap='butt'))
        s_ = 'avg %.1fk' % (MEAN_POST / 1000)
        w = font('semi', 26).measureText(s_) + 28
        label_box(cv, X(0) - w - 22, Y(MEAN_POST) - 1, s_, 26, '#FFD23F', 255 * a_post)

    # release burst
    for i in range(7):
        a = (t - 5.0 - i * .05) / .8
        if 0 < a < 1:
            ang = i * math.pi / 3.5
            r_ = 40 + 150 * ease(a)
            plus(cv, x0 + math.cos(ang) * r_, T + 200 + math.sin(ang) * r_, 16 * (1 - a) + 4, '#FFFFFF', A(255 * (1 - a)))

    # multiplier callout
    if a_post > 0:
        k = eback(prog(t, 8.9, 9.5), 1.6)
        cx_, cy_ = X(-52), 690
        cv.save()
        cv.translate(cx_, cy_)
        cv.scale(k, k)
        cv.translate(-cx_, -cy_)
        glow(cv, cx_, cy_, 280, '#FF3D7F', 85)
        text(cv, '2.3\u00d7', cx_, cy_ - 8, font('bold', 200), '#FFFFFF')
        for (dx_, dy_, s_) in ((-190, -90, 22), (200, -60, 16), (170, 70, 12), (-150, 60, 14)):
            plus(cv, cx_ + dx_, cy_ + dy_, s_ * (.75 + .25 * math.sin(t * 6 + dx_)), '#FFFFFF')
        w = font('semi', 30).measureText('more mentions after release') + 28
        label_box(cv, cx_ - w / 2, cy_ + 124, 'more mentions after release', 30)
        cv.restore()
        ax = X(-6)
        ya, yb = Y(MEAN_PRE), Y(MEAN_POST)
        al = A(255 * prog(t, 9.0, 9.4))
        cv.drawPath(poly([(ax, ya - 6), (ax, yb + 10)], False), paint('#FFFFFF', al, stroke=7))
        cv.drawPath(poly([(ax - 17, yb + 30), (ax, yb + 6), (ax + 17, yb + 30)], False), paint('#FFFFFF', al, stroke=7))


def draw(cv, t, fi):
    cv.drawRect(R(0, 0, W, H), paint(shader=lin(0, 0, 0, H, [NAVY0, NAVY1])))
    halos(cv, 540, 1700, 120, 5, 90, NAVY2, 60)
    sparkle_field(cv, t, 12, 34, 1340, H)
    sparkle_field(cv, t, 13, 5, 0, 60)
    k = 1 + .02 * ease(prog(t, 0, DUR))
    cv.save()
    cv.translate(540, 760)
    cv.scale(k, k)
    cv.translate(-540, -760)
    draw_chart(cv, min(t * SPEED, 10.0))
    cv.restore()
    W_, R_ = '#FFFFFF', '#FF6B8A'
    word_caption(cv, t, .25, .22, [
        [('Mentions', W_), ('of', W_), ('breakups', W_), ('on', W_), ('X', W_), ('(Twitter)', W_)],
        [('have', W_), ('spiked', W_), ('by', W_), ('2.3', R_), ('times', R_)],
        [('after', W_), ('the', W_), ("game's", W_), ('release', W_)],
    ], cy=1510)
    fade = 1 - prog(t, 0, .15)
    if fade > 0:
        cv.drawRect(R(0, 0, W, H), paint('#000000', 255 * fade))


if __name__ == '__main__':
    pre = DATA[:PRE]
    post = DATA[PRE:]
    print('pre avg %.0f post avg %.0f ratio %.3f max %.0f min %.0f' % (
        MEAN_PRE, MEAN_POST, MEAN_POST / MEAN_PRE, max(DATA), min(DATA)))
    run('gta6_breakup_mentions', DUR, draw)
