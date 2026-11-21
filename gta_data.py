import os, sys
SK = '/root/.claude/skills/synced/4e0ea4d7-c568-4bbf-ae1d-e23fce685fc3_d1ab2ef0-75cd-4219-be4f-f884141ad564/kurzgesagt-reel'
sys.path.insert(0, SK + '/scripts')
from kz import *

DUR = 11.0


def A(x):
    return int(clamp(x, 0, 255))

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

# ------------------------------------------------------------------ layout / colours
L, RT, T, BT = 160, 985, 400, 1110        # plot box
YMAX = 40000.0
SURF = '#14163A'
INK_MUTED = '#A9A7C8'
LINE = '#7FC4FF'
GOLD = '#FFC94A'
RED = '#FF5A6A'


def X(d):
    return L + (d + PRE) / (PRE + POST - 1) * (RT - L)


def Y(v):
    return BT - v / YMAX * (BT - T)


def dashed(c, a, w):
    p = paint(c, a, stroke=w, cap='butt')
    p.setPathEffect(skia.DashPathEffect.Make([14, 10], 0))
    return p


def head_day(t):
    if t < .7:
        return -PRE
    if t < 5.0:
        return lerp(-PRE, 0, (t - .7) / 4.3)
    if t < 5.7:
        return 0
    return lerp(0, POST - 1, ease(prog(t, 5.7, 8.5)))


def point_at(dh):
    """Point on the polyline at fractional day dh."""
    i = int(clamp(dh + PRE, 0, len(DATA) - 1.0001))
    f = clamp(dh + PRE - i, 0, 1)
    v = lerp(DATA[i], DATA[min(i + 1, len(DATA) - 1)], f)
    return X(dh), Y(v)


def line_path(dh):
    p = skia.Path()
    n = int(dh + PRE)
    p.moveTo(X(DAYS[0]), Y(DATA[0]))
    for i in range(1, n + 1):
        p.lineTo(X(DAYS[i]), Y(DATA[i]))
    hx, hy = point_at(dh)
    p.lineTo(hx, hy)
    return p, hx, hy


def draw_chart(cv, t):
    # card
    cv.drawPath(rrp(50, 170, 1030, 1290, 38), paint('#05031a', 120, blur=18))
    cv.drawPath(rrp(50, 160, 1030, 1280, 38), paint(SURF, 245))
    cv.drawPath(rrp(50, 160, 1030, 1280, 38), paint('#2B2F66', 255, stroke=2))
    text(cv, 'Mentions of “breakup”', 100, 240, font('bold', 58), '#FFFFFF', anchor='l')
    text(cv, 'Twitter, mentions per day', 100, 300, font('med', 30), INK_MUTED, anchor='l')
    text(cv, 'Simulated data for illustration', 100, 1246, font('med', 24), '#7C7AA0', anchor='l')

    # grid + y labels
    for v in (10000, 20000, 30000, 40000):
        cv.drawPath(poly([(L, Y(v)), (RT, Y(v))], False), paint('#FFFFFF', 26, stroke=2))
        text(cv, '%dk' % (v // 1000), L - 16, Y(v), font('med', 26), INK_MUTED, anchor='r')
    cv.drawPath(poly([(L, BT), (RT, BT)], False), paint('#FFFFFF', 90, stroke=2))
    text(cv, '0', L - 16, BT, font('med', 26), INK_MUTED, anchor='r')
    for d in (-90, -60, -30, 30):
        cv.drawPath(poly([(X(d), BT), (X(d), BT + 10)], False), paint('#FFFFFF', 90, stroke=2))
        text(cv, ('%+d' % d).replace('-', '−'), X(d), BT + 38, font('med', 26), INK_MUTED)
    text(cv, 'days from release', (L + RT) / 2, BT + 84, font('med', 26), INK_MUTED)

    dh = head_day(t)
    x0 = X(0)
    rel = ease(prog(t, 5.0, 5.5))

    # post-release band
    if rel > 0:
        cv.drawRect(R(x0, T - 10, RT, BT), paint(shader=lin(0, T, 0, BT, [(GOLD, 0), (GOLD, 34 * rel)])))
        cv.drawPath(poly([(x0, T - 14), (x0, BT)], False), dashed(GOLD, 230 * rel, 3))

    # area + line
    if dh > -PRE + .05:
        path, hx, hy = line_path(dh)
        area = skia.Path(path)
        area.lineTo(hx, BT)
        area.lineTo(X(-PRE), BT)
        area.close()
        cv.drawPath(area, paint(shader=lin(0, T, 0, BT, [(LINE, 70), (LINE, 0)])))
        cv.drawPath(path, paint('#7FC4FF', 70, stroke=12, blur=8))
        cv.drawPath(path, paint(LINE, stroke=4))
        glow(cv, hx, hy, 60, LINE, 110)
        cv.drawCircle(hx, hy, 12, paint(SURF))
        cv.drawCircle(hx, hy, 8, paint('#FFFFFF'))

    # average lines (appear once their segment has been drawn)
    a_pre = ease(prog(t, 4.6, 5.2))
    a_post = ease(prog(t, 8.5, 9.0))
    if a_pre > 0:
        xe = lerp(X(-PRE), X(0), a_pre) if a_post <= 0 else lerp(X(0), RT, a_post)
        cv.drawPath(poly([(X(-PRE), Y(MEAN_PRE)), (xe, Y(MEAN_PRE))], False), dashed('#FFFFFF', 190, 3))
        lw = font('semi', 26).measureText('avg %.1fk' % (MEAN_PRE / 1000)) + 24
        cv.drawPath(rrp(L + 14, Y(MEAN_PRE) - 62, L + 14 + lw, Y(MEAN_PRE) - 24, 14), paint(SURF, 235 * a_pre))
        text(cv, 'avg %.1fk' % (MEAN_PRE / 1000), L + 26, Y(MEAN_PRE) - 43, font('semi', 26), '#FFFFFF', A(255 * a_pre), anchor='l')
    if a_post > 0:
        xs, xe = lerp(RT, X(0), a_post), RT
        cv.drawPath(poly([(xs, Y(MEAN_POST)), (RT, Y(MEAN_POST))], False), dashed(GOLD, 230, 3))
        cv.drawPath(poly([(x0, Y(MEAN_POST)), (x0 - 10, Y(MEAN_POST))], False), dashed(GOLD, 0, 3))
        lw = font('semi', 26).measureText('avg %.1fk' % (MEAN_POST / 1000)) + 24
        lx = x0 - 28 - lw
        cv.drawPath(rrp(lx, Y(MEAN_POST) - 20, lx + lw, Y(MEAN_POST) + 18, 14), paint(SURF, 235 * a_post))
        text(cv, 'avg %.1fk' % (MEAN_POST / 1000), lx + 12, Y(MEAN_POST) - 1, font('semi', 26), GOLD, A(255 * a_post), anchor='l')
        cv.drawPath(poly([(lx + lw, Y(MEAN_POST) - 1), (x0, Y(MEAN_POST) - 1)], False), dashed(GOLD, 200 * a_post, 3))

    # release flag
    if rel > 0:
        fk = eback(prog(t, 5.0, 5.55), 1.5)
        fw = 250
        cv.save()
        cv.translate(x0, T - 50)
        cv.scale(fk, fk)
        cv.translate(-x0, -(T - 50))
        shaded(cv, rrp(x0 - fw / 2, T - 78, x0 + fw / 2, T - 28, 25), GOLD, dx=-3, dy=-4)
        text(cv, 'GTA VI release', x0, T - 53, font('bold', 28), '#272448')
        cv.restore()
        for i in range(2):
            a = (t - 5.0 - i * .15) / .8
            if 0 < a < 1:
                cv.drawCircle(x0, T - 14, 20 + 130 * ease(a), paint(GOLD, 200 * (1 - a), stroke=4))

    # multiplier callout
    if a_post > 0:
        k = eback(prog(t, 8.9, 9.5), 1.6)
        cx_, cy_ = X(-56), 505
        cv.save()
        cv.translate(cx_, cy_)
        cv.scale(k, k)
        cv.translate(-cx_, -cy_)
        glow(cv, cx_, cy_, 260, RED, 70)
        text(cv, '2.3×', cx_, cy_ - 8, font('bold', 190), RED, shadow=10)
        text(cv, 'more mentions after release', cx_, cy_ + 110, font('med', 32), '#FFFFFF')
        cv.restore()
        ax = X(-6)
        ya, yb = Y(MEAN_PRE), Y(MEAN_POST)
        al = A(255 * prog(t, 9.0, 9.4))
        cv.drawPath(poly([(ax, ya - 6), (ax, yb + 10)], False), paint(RED, al, stroke=5))
        cv.drawPath(poly([(ax - 14, yb + 28), (ax, yb + 6), (ax + 14, yb + 28)], False), paint(RED, al, stroke=5))


def draw(cv, t, fi):
    cv.drawRect(R(0, 0, W, H), paint(shader=lin(0, 0, 0, H, ['#0A0720', '#1A1148', '#0A0720'])))
    stars(cv, t, ymax=1500, a=.55)
    k = 1 + .025 * ease(prog(t, 0, DUR))
    cv.save()
    cv.translate(540, 720)
    cv.scale(k, k)
    cv.translate(-540, -720)
    draw_chart(cv, t)
    cv.restore()
    vignette(cv, 130)
    scrim(cv, 1290, 210)
    subtitle(cv, t, .5, 4.9, "Mentions of “breakup” on Twitter,\nthe weeks before {hl:GTA VI}")
    subtitle(cv, t, 5.2, 99, "After release, mentions\njump {red:2.3×}", fade_out=False)
    fade = 1 - prog(t, 0, .3)
    if fade > 0:
        cv.drawRect(R(0, 0, W, H), paint('#000000', 255 * fade))


if __name__ == '__main__':
    pre = DATA[:PRE]
    post = DATA[PRE:]
    print('pre avg %.0f post avg %.0f ratio %.3f max %.0f min %.0f' % (
        MEAN_PRE, MEAN_POST, MEAN_POST / MEAN_PRE, max(DATA), min(DATA)))
    run('gta6_breakup_mentions', DUR, draw)
