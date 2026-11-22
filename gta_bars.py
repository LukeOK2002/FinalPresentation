import os, sys
from kzs import *

DUR = 9.0

BARS = [  # name, score, colour, start, end of grow animation
    ('GTA 4', 23.2, '#5B6BFF', .7, 2.1),
    ('GTA 5', 62.5, '#61E7ED', 2.2, 3.8),
    ('GTA 6', 87.2, '#FF2D95', 3.9, 6.0),
]
L, RT, T, BT = 180, 1000, 580, 1180
PT, PB = 300, 1330
YMAX = 100.0


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
    slot = (RT - L) / 3
    cx6 = L + slot * 2.5
    cv.drawRect(R(0, PT, W, PB), paint(PANEL_L))
    # sunburst behind the winner, clipped to the panel
    wk = ease(prog(t, 4.2, 6.0))
    if wk > 0:
        cv.save()
        cv.clipRect(R(0, PT, W, PB))
        sunburst(cv, cx6, 760, t, '#FF3D9A', 30 * wk, 18, 1800, .06)
        cv.restore()
    text(cv, 'Strip Club Realism', 70, 150, font('bold', 76), '#FFFFFF', anchor='l')
    text(cv, 'Realism score, out of 100', 70, 232, font('med', 34), '#C9C6F2', anchor='l')
    tag(cv, 60, 336, 300, 74, 'Realism score', '#3CCB86', size=34)
    for v in (25, 50, 75, 100):
        p = paint('#FFFFFF', 30, stroke=2, cap='butt')
        p.setPathEffect(skia.DashPathEffect.Make([10, 10], 0))
        cv.drawPath(poly([(L, Y(v)), (RT, Y(v))], False), p)
        text(cv, '%d' % v, L - 22, Y(v), font('med', 26), '#AFA9E8', anchor='r')
    arrow_axis(cv, L, BT, L, T - 80, PERI, 8, 28)
    arrow_axis(cv, L, BT, RT + 40, BT, PERI, 8, 28)
    text(cv, 'Score', L + 22, T - 84, font('bold', 34), '#FFFFFF', anchor='l')
    text(cv, 'Illustrative scores', 60, PB - 26, font('med', 22), '#FFFFFF', 120, anchor='l')

    bw = 176
    for i, (name, score, colr, a, b) in enumerate(BARS):
        cx = L + slot * (i + .5)
        x0, x1 = cx - bw / 2, cx + bw / 2
        p = prog(t, a, b)
        hk = eback(p, .9) if i == 2 else eout(p)
        val = score * min(1.0, hk)
        ytop = Y(score * hk)
        if i == 2 and p > 0:
            glow(cv, cx, (ytop + BT) / 2, 480, colr, 70 * clamp(p * 1.5), mid=1)
        if hk > .004:
            path = bar_path(x0, x1, ytop, BT - 2, 24)
            shaded(cv, path, colr, dark(colr, .3), dx=-12, dy=0)
            h = BT - ytop
            if h > 90:                                   # glossy highlight like the reference
                gloss_line(cv, x0 + 30, ytop + 34, x0 + 30, ytop + 34 + min(h * .3, 120), 11)
                cv.drawCircle(x0 + 30, ytop + 34 + min(h * .3, 120) + 22, 6, paint('#FFFFFF', 235))
            size = 58 if i == 2 else 48
            text(cv, '%.1f' % val, cx, ytop - 36, font('bold', size), '#FFFFFF', A(255 * clamp(p * 4)))
        text(cv, name, cx, BT + 56, font('bold', 42), '#FFFFFF')

    # "Highest" tag + sparkles on the winning bar
    ytop = Y(BARS[2][1])
    tg = prog(t, 6.0, 6.6)
    if tg > 0:
        k = eback(tg, 1.6)
        ty = ytop - 118
        cv.save()
        cv.translate(cx6, ty)
        cv.scale(k, k)
        cv.translate(-cx6, -ty)
        tag(cv, cx6 - 140, ty - 32, 280, 64, 'Highest', YEL, size=34, tc='#272448')
        cv.drawPath(star(cx6 - 90, ty, 16), paint('#272448'))
        cv.restore()
        for i in range(5):
            a = (t - 6.0 - i * .07) / .9
            if 0 < a < 1:
                ang = i * math.pi / 2.5 + .4
                r_ = 80 + 120 * eout(a)
                plus(cv, cx6 + math.cos(ang) * r_, ty + math.sin(ang) * r_ * .8, 16 * (1 - a) + 5, '#FFFFFF', A(255 * (1 - a)))
    if wk > 0:
        for (dx_, dy_, s_) in ((-150, -200, 18), (150, -140, 14), (-120, 120, 12), (160, 160, 16)):
            plus(cv, cx6 + dx_, ytop + dy_ + 140, s_ * (.7 + .3 * math.sin(t * 5 + dx_)), '#FFFFFF', A(255 * wk))


CAPTION_WORDS = [
    [('GTA', '#FFFFFF'), ('6', '#FFFFFF'), ('has', '#FFFFFF'), ('the', '#FFFFFF'), ('highest', '#FFD23F'),
     ('strip', '#FFFFFF'), ('club', '#FFFFFF'), ('realism', '#FFFFFF')],
    [('of', '#FFFFFF'), ('any', '#FFFFFF'), ('game', '#FFFFFF'), ('released', '#FFFFFF')],
    [('in', '#FFFFFF'), ('the', '#FFFFFF'), ('series', '#FFFFFF'), ('to', '#FFFFFF'), ('date', '#FFFFFF')],
]


def word_caption(cv, t, t0, step, lines, cy=1502, size=52):
    """Boxed caption that appears one word at a time."""
    f = font('semi', size)
    lh = size * 1.92
    y0 = cy - (len(lines) - 1) * lh / 2
    idx = 0
    for li, words in enumerate(lines):
        full = ' '.join(w for w, _ in words)
        wtot = f.measureText(full)
        x0 = W / 2 - wtot / 2
        y = y0 + li * lh
        ba = eout(prog(t, t0 + idx * step, t0 + idx * step + .25))
        if ba > 0:
            cv.drawPath(rrp(x0 - 34, y - size * .95, x0 + wtot + 34, y + size * .82, 18), paint('#000000', A(185 * ba)))
        for wi, (w, c) in enumerate(words):
            ts = t0 + idx * step
            a = eout(prog(t, ts, ts + .25))
            if a > 0:
                pre = ' '.join(ww for ww, _ in words[:wi]) + (' ' if wi else '')
                cv.drawString(w, x0 + f.measureText(pre), y + size * .35 + (1 - a) * 12, f, paint(c, A(255 * a)))
            idx += 1


def draw(cv, t, fi):
    cv.drawRect(R(0, 0, W, H), paint(shader=lin(0, 0, 0, H, [NAVY0, NAVY1])))
    halos(cv, 540, 1700, 120, 5, 90, NAVY2, 60)
    sparkle_field(cv, t, 21, 34, 1340, H)
    sparkle_field(cv, t, 22, 5, 0, 60)
    k = 1 + .02 * ease(prog(t, 0, DUR))
    cv.save()
    cv.translate(540, 760)
    cv.scale(k, k)
    cv.translate(-540, -760)
    draw_chart(cv, t)
    cv.restore()
    word_caption(cv, t, .5, .3, CAPTION_WORDS)
    fade = 1 - prog(t, 0, .3)
    if fade > 0:
        cv.drawRect(R(0, 0, W, H), paint('#000000', 255 * fade))


if __name__ == '__main__':
    run('gta6_strip_club_realism', DUR, draw)
