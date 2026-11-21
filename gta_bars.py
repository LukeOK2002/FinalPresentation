import os, sys
SK = '/root/.claude/skills/synced/4e0ea4d7-c568-4bbf-ae1d-e23fce685fc3_d1ab2ef0-75cd-4219-be4f-f884141ad564/kurzgesagt-reel'
sys.path.insert(0, SK + '/scripts')
from kz import *

DUR = 9.0

BARS = [  # name, score, colour, start, end of grow animation
    ('GTA 4', 23.2, '#6B7BDA', .7, 2.1),
    ('GTA 5', 62.5, '#7FC4FF', 2.2, 3.8),
    ('GTA 6', 87.2, '#FF4FA3', 3.9, 6.0),
]
SURF = '#14163A'
INK_MUTED = '#A9A7C8'
GOLD = '#FFC94A'
L, RT, T, BT = 170, 980, 440, 1100
YMAX = 100.0


def A(x):
    return int(clamp(x, 0, 255))


def Y(v):
    return BT - v / YMAX * (BT - T)


def bar_path(x0, x1, ytop, ybase, r):
    r = max(.1, min(r, (ybase - ytop) / 2))
    p = skia.Path()
    p.moveTo(x0, ybase)
    p.lineTo(x0, ytop + r)
    p.quadTo(x0, ytop, x0 + r, ytop)
    p.lineTo(x1 - r, ytop)
    p.quadTo(x1, ytop, x1, ytop + r)
    p.lineTo(x1, ybase)
    p.close()
    return p


def star(cx, cy, r):
    pts = []
    for i in range(10):
        rr = r if i % 2 == 0 else r * .45
        a = -math.pi / 2 + i * math.pi / 5
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return poly(pts)


def draw_chart(cv, t):
    cv.drawPath(rrp(50, 170, 1030, 1290, 38), paint('#05031a', 120, blur=18))
    cv.drawPath(rrp(50, 160, 1030, 1280, 38), paint(SURF, 245))
    cv.drawPath(rrp(50, 160, 1030, 1280, 38), paint('#2B2F66', 255, stroke=2))
    text(cv, 'Strip Club Realism', 100, 245, font('bold', 66), '#FFFFFF', anchor='l')
    text(cv, 'Realism score, out of 100', 100, 310, font('med', 30), INK_MUTED, anchor='l')
    text(cv, 'Illustrative scores', 100, 1246, font('med', 24), '#7C7AA0', anchor='l')

    for v in (25, 50, 75, 100):
        cv.drawPath(poly([(L, Y(v)), (RT, Y(v))], False), paint('#FFFFFF', 26, stroke=2))
        text(cv, '%d' % v, L - 16, Y(v), font('med', 26), INK_MUTED, anchor='r')
    cv.drawPath(poly([(L, BT), (RT, BT)], False), paint('#FFFFFF', 90, stroke=2))
    text(cv, '0', L - 16, BT, font('med', 26), INK_MUTED, anchor='r')

    slot = (RT - L) / 3
    bw = 176
    for i, (name, score, colr, a, b) in enumerate(BARS):
        cx = L + slot * (i + .5)
        x0, x1 = cx - bw / 2, cx + bw / 2
        p = prog(t, a, b)
        hk = eback(p, .9) if i == 2 else eout(p)
        val = score * min(1.0, hk)
        ytop = Y(score * hk)
        if i == 2 and p > 0:
            glow(cv, cx, (ytop + BT) / 2, 460, colr, 55 * clamp(p * 1.5), mid=1)
        if hk > .004:
            path = bar_path(x0, x1, ytop, BT - 1, 22)
            shaded(cv, path, colr, dark(colr, .3), dx=-9, dy=0, hi=(light(colr, .35), 70))
            cv.drawPath(rrp(x1 - 26, ytop + 24, x1 - 14, BT - 14, 6), paint('#FFFFFF', 0))
            cv.drawPath(poly([(x0 + 22, ytop + 6), (x1 - 22, ytop + 6)], False), paint('#FFFFFF', 60, stroke=3))
            size = 54 if i == 2 else 46
            text(cv, '%.1f' % val, cx, ytop - 34, font('bold', size), '#FFFFFF', A(255 * clamp(p * 4)), shadow=6)
        text(cv, name, cx, BT + 52, font('bold', 40), '#FFFFFF')

    # "highest" tag + sparkles on the winning bar
    cx = L + slot * 2.5
    ytop = Y(BARS[2][1])
    tg = prog(t, 6.0, 6.6)
    if tg > 0:
        k = eback(tg, 1.6)
        ty = ytop - 108
        cv.save()
        cv.translate(cx, ty)
        cv.scale(k, k)
        cv.translate(-cx, -ty)
        shaded(cv, rrp(cx - 112, ty - 28, cx + 112, ty + 28, 28), GOLD, dx=-3, dy=-4)
        cv.drawPath(star(cx - 70, ty, 15), paint('#272448'))
        text(cv, 'Highest', cx + 14, ty, font('bold', 30), '#272448')
        cv.restore()
        for i in range(6):
            a = (t - 6.0 - i * .07) / .9
            if 0 < a < 1:
                ang = i * math.pi / 3 + .4
                r_ = 70 + 110 * eout(a)
                cv.drawPath(star(cx + math.cos(ang) * r_, ty + math.sin(ang) * r_ * .8, 14 * (1 - a) + 4), paint(GOLD, A(255 * (1 - a))))


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
    subtitle(cv, t, .5, 99, "GTA 6 has the {hl:highest} strip club\nrealism of any games in the franchise\nreleased to date", cy=1450, fade_out=False)
    fade = 1 - prog(t, 0, .3)
    if fade > 0:
        cv.drawRect(R(0, 0, W, H), paint('#000000', 255 * fade))


if __name__ == '__main__':
    run('gta6_strip_club_realism', DUR, draw)
