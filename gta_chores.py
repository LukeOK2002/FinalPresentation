import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kzs import *
from gta_reel import BOY, boy_legs, boy_arms, boy_hands, controller, sofa_back, sofa_front, NF, NR
from gta_bars import word_caption

DUR = 13.0
SCENE_BOTTOM = 1340
_W, _G = '#FFFFFF', '#FFD23F'
CAPTION_WORDS = [
    [('Men', _W), ('are', _W), ('spending', _W), ('more', _W), ('time', _W), ('on', _W), ('chores', _W)],
    [('in', _W), ('the', _G), ('game', _G), ('than', _W), ('in', _W), ('real', _G), ('life', _G)],
]
CAP_T0, CAP_STEP = .3, .265          # 14 words: last one fully in at 4.0 s
DEEP = '#00B3B0'                                  # floor shadow
TV_FULL = (-30, 290, 1110, 931)                   # game fills the frame at the start
TV_POP = (90, 70, 990, 576)                       # floating pop-out once the room is revealed


def smooth_xy(pts):
    """Closed smooth path through (x, y) points (quadratic through midpoints)."""
    n = len(pts)
    mid = lambda a, b: ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    p = skia.Path()
    m0 = mid(pts[-1], pts[0])
    p.moveTo(*m0)
    for i in range(n):
        m = mid(pts[i], pts[(i + 1) % n])
        p.quadTo(pts[i][0], pts[i][1], m[0], m[1])
    p.close()
    return p


# ================================================================== in-game: Jason painting (local 700 x 394)
COL_W, Y_TOP, Y_BOT, X_START, TC = 46, 46, 318, 300, 1.7
WALL_NEW, WALL_OLD, PAINT = '#EEF2D2', '#11663B', '#3FBF63'


def roller_state(t):
    """Column index, roller centre and how far down the current column has been painted."""
    n = int(t // TC)
    p = (t % TC) / TC
    slide = ease(clamp(p / .15))
    cx_prev = X_START + (n - 1) * COL_W + COL_W / 2 if n > 0 else X_START + COL_W / 2
    cx_cur = X_START + n * COL_W + COL_W / 2
    rx = lerp(cx_prev, cx_cur, slide)
    q = clamp((p - .15) / .85)                    # stroke: down then back up
    ry = Y_TOP + (Y_BOT - Y_TOP) * (1 - math.cos(2 * math.pi * q)) / 2
    reached = Y_TOP + (Y_BOT - Y_TOP) * (1.0 if q >= .5 else (1 - math.cos(2 * math.pi * q)) / 2)
    return n, rx, ry, (reached if p > .15 else None)


def paint_column(cv, x0, y0, y1, i):
    jag = lambda k: math.sin(i * 2.3 + k) * 4
    pts = [(x0 + 1, y0 + jag(1)), (x0 + COL_W / 2, y0 - 4 + jag(2)), (x0 + COL_W - 1, y0 + jag(3)),
           (x0 + COL_W + 1, (y0 + y1) / 2), (x0 + COL_W - 1, y1 + jag(4)), (x0 + COL_W / 2, y1 + 4 + jag(5)),
           (x0 + 1, y1 + jag(6)), (x0 - 1, (y0 + y1) / 2)]
    cv.drawPath(smooth_xy(pts), paint(PAINT))
    cv.drawPath(poly([(x0 + 10, y0 + 12), (x0 + 10, y1 - 12)], False), paint('#5FD47E', 160, stroke=3))
    cv.drawPath(poly([(x0 + COL_W - 12, y0 + 18), (x0 + COL_W - 12, y1 - 20)], False), paint('#2FA352', 140, stroke=2))


def jason(cv, jx, fl, rx, ry, t):
    """Jason in profile facing the wall (right), both hands on the roller pole."""
    skin, skin_d = '#FFAC7E', '#F28E62'
    tee, jeans = '#24204F', '#3A5BD0'
    pill_shadow(cv, jx + 6, fl + 3, 130, 14, '#4A3220', 200)
    cv.drawPath(rrp(jx - 16, fl - 112, jx + 6, fl - 8, 8), paint(dark(jeans, .25)))
    cv.drawOval(R(jx - 18, fl - 14, jx + 22, fl + 2), paint('#D8DCF0'))
    cv.drawPath(rrp(jx - 2, fl - 112, jx + 20, fl - 8, 8), paint(jeans))
    cv.drawOval(R(jx - 4, fl - 14, jx + 38, fl + 2), paint('#FFFFFF'))
    pb = (jx + 24, fl - 92)
    pt = (rx - 30, ry + 30)
    P = lambda u: (lerp(pb[0], pt[0], u), lerp(pb[1], pt[1], u))
    shoulder = (jx + 4, fl - 196)
    h2 = P(.62)
    el2 = ((shoulder[0] + h2[0]) / 2 + 4, (shoulder[1] + h2[1]) / 2 + 16)
    cv.drawPath(poly([(shoulder[0] + 6, shoulder[1]), el2, h2], False), paint(dark(tee, .3), stroke=17))
    cv.drawPath(poly([pb, pt], False), paint('#FFB300', stroke=8))
    cv.drawPath(poly([P(-.05), P(.22)], False), paint('#C96A00', stroke=9))
    cv.drawPath(poly([pt, (rx - 26, ry + 6), (rx - COL_W / 2 - 2, ry)], False), paint('#9AA6C8', stroke=4))
    shaded(cv, rrp(rx - COL_W / 2, ry - 11, rx + COL_W / 2, ry + 11, 10), PAINT, dark(PAINT, .3), dx=-3, dy=-3)
    gloss_line(cv, rx - COL_W / 2 + 8, ry - 5, rx + COL_W / 2 - 14, ry - 5, 3)
    cv.drawCircle(h2[0], h2[1], 9, paint(skin_d))
    shaded(cv, rrp(jx - 30, fl - 212, jx + 30, fl - 98, 24), tee, dark(tee, .3), dx=-5, dy=0)
    cv.drawPath(rrp(jx - 4, fl - 226, jx + 14, fl - 200, 5), paint(skin_d))
    hx, hy = jx + 6, fl - 246
    cv.drawCircle(hx, hy, 27, paint(skin))
    cv.drawCircle(hx + 26, hy + 2, 6.5, paint(skin))                       # nose
    beard = [(hx - 9, hy + 1), (hx - 6, hy + 20), (hx + 6, hy + 31), (hx + 22, hy + 27), (hx + 29, hy + 15),
             (hx + 20, hy + 13), (hx + 10, hy + 15), (hx + 2, hy + 8)]
    cv.drawPath(smooth_xy(beard), paint('#3A2418'))
    cv.drawPath(rrp(hx + 14, hy + 9, hx + 29, hy + 14, 2.5), paint('#3A2418'))   # moustache
    cv.drawCircle(hx - 5, hy + 2, 7, paint(skin_d))                          # ear
    cv.drawCircle(hx + 15, hy - 3, 3, paint(INK))                            # eye
    cv.drawPath(poly([(hx + 9, hy - 9), (hx + 20, hy - 10)], False), paint('#3A2418', stroke=3))
    # trucker cap: navy mesh back, white front panel, navy brim pointing forward
    cv.save()
    cv.clipRect(R(hx - 40, hy - 40, hx + 40, hy - 5))
    dome = op(hx - 30, hy - 31, hx + 27, hy + 12)
    cv.drawPath(dome, paint('#1D1A3A'))
    cv.save()
    cv.clipRect(R(hx - 1, hy - 40, hx + 40, hy - 5))
    cv.drawPath(dome, paint('#FFFFFF'))
    cv.restore()
    cv.restore()
    cv.drawPath(rrp(hx - 30, hy - 9, hx + 27, hy - 4, 2.5), paint('#1D1A3A'))
    cv.drawPath(rrp(hx + 14, hy - 10, hx + 50, hy - 4, 3), paint('#1D1A3A'))
    cv.drawCircle(hx - 2, hy - 30, 3, paint('#1D1A3A'))
    gloss_line(cv, hx + 4, hy - 24, hx + 14, hy - 20, 3, 140)
    h1 = P(.3)
    el1 = ((shoulder[0] + h1[0]) / 2 - 4, (shoulder[1] + h1[1]) / 2 + 18)
    cv.drawPath(poly([shoulder, el1, h1], False), paint(tee, stroke=18))
    cv.drawCircle(h1[0], h1[1], 9.5, paint(skin))


def jason_scene(cv, t):
    cv.drawRect(R(0, 0, 700, 394), paint(WALL_NEW))
    cv.drawRect(R(0, 0, 262, 394), paint(WALL_OLD))
    cv.drawRect(R(0, 0, 700, 26), paint('#FFFFFF'))
    n, rx, ry, reached = roller_state(t)
    for i in range(n):
        paint_column(cv, X_START + i * COL_W, Y_TOP, Y_BOT, i)
    if reached is not None:
        paint_column(cv, X_START + n * COL_W, Y_TOP, max(Y_TOP + 8, reached), n)
    cv.drawPath(poly([(262, 26), (262, 352)], False), paint('#0A4A2A', stroke=5))
    cv.drawRect(R(630, 196, 652, 236), paint('#FFFFFF'))
    cv.drawRect(R(637, 206, 645, 214), paint('#C9CFE0'))
    cv.drawRect(R(0, 344, 700, 356), paint('#FFFFFF'))
    cv.drawRect(R(0, 356, 700, 394), paint('#7A5236'))
    for gx in range(0, 700, 70):
        cv.drawPath(poly([(gx, 356), (gx, 394)], False), paint('#5E3E28', stroke=2))
    jx = rx - 170 + math.sin(t * 2) * 2
    jason(cv, jx, 352, rx, ry, t)


def tv_box(t):
    z = ease(prog(t, 2.0, 3.3))
    return tuple(lerp(a, b, z) for a, b in zip(TV_FULL, TV_POP))


def tv_popout(cv, t):
    l, tp, r_, b = tv_box(t)
    cx, cy = (l + r_) / 2, (tp + b) / 2
    bob = math.sin(t * 1.4) * 3 * ease(prog(t, 3.3, 4.0))
    cv.save()
    cv.translate(0, bob)
    glow(cv, cx, cy, (r_ - l) * .9, '#7FFFA0', 80)
    cv.drawPath(rrp(l - 6, tp + 14, r_ + 6, b + 30, 24), paint('#05031a', 140, blur=22))
    bz = (r_ - l) * .022
    shaded(cv, rrp(l - bz, tp - bz, r_ + bz, b + bz, 20), '#101A78', dx=-5, dy=-5)
    cv.save()
    cv.clipPath(rrp(l, tp, r_, b, 10), skia.ClipOp.kIntersect, True)
    cv.translate(l, tp)
    cv.scale((r_ - l) / 700, (b - tp) / 394)
    jason_scene(cv, t)
    cv.restore()
    cv.drawPath(poly([(l, tp), (l + (r_ - l) * .3, tp), (l, tp + (b - tp) * .45)]), paint('#FFFFFF', 20))
    cv.restore()


# ================================================================== the room (world coords; floor line ~1190)
def room_bg(cv, t):
    cv.drawRect(R(-900, -900, 2000, 1190), paint(YEL))
    cv.drawRect(R(-900, 1190, 2000, 2400), paint(TEAL))
    cv.drawRect(R(-900, 1176, 2000, 1192), paint(YEL_DD))
    cv.drawPath(rrp(650, 560, 860, 770, 14), paint(YEL_D))
    cv.drawPath(rrp(670, 580, 840, 750, 8), paint('#FFB300'))


def wallpaper(cv, t):
    x0, y0, x1, y1 = -262, 390, 140, 742
    sw = math.sin(t * 1.4) * 4
    cv.drawPath(rrp(x0, y0, x1, y1, 4), paint('#F1DCA0'))
    sheet = poly([(x0 + 110, y0), (x1, y0), (x1, y1 - 30), (x0 + 200, y1), (x0, y1 - 40), (x0, y0 + 130)])
    cv.save()
    cv.clipPath(sheet, skia.ClipOp.kIntersect, True)
    cv.drawPath(sheet, paint('#FFF1C8'))
    for row, gy in enumerate(range(y0 - 20, y1 + 60, 56)):
        for gx in range(x0 - 20, x1 + 40, 56):
            c_ = (gx + (28 if row % 2 else 0), gy + 28)
            cv.drawPath(poly([(c_[0], c_[1] - 16), (c_[0] + 12, c_[1]), (c_[0], c_[1] + 16), (c_[0] - 12, c_[1])]), paint('#FFB300'))
            cv.drawCircle(c_[0], c_[1], 4, paint('#FF7A59'))
    cv.restore()
    flap = poly([(x0 + 110, y0), (x0 + 6 + sw, y0 + 130 - sw * 2), (x0 + 130 + sw, y0 + 118 + sw), (x0 + 160, y0 + 40)])
    shaded(cv, flap, '#FFFFFF', '#D8D2C0', dx=-4, dy=-4)
    st = poly([(x1, y0 + 150), (x1 - 12, y0 + 150), (x1 - 26 + sw, y0 + 250), (x1 - 8 + sw * 2, y0 + 330), (x1 + 34 + sw * 2, y0 + 312), (x1 + 18 + sw, y0 + 240)])
    shaded(cv, st, '#FFFFFF', '#D8D2C0', dx=-3, dy=-3)
    bc = poly([(x0 + 200, y1), (x0 + 270, y1 - 36), (x0 + 304, y1 + 6 + sw), (x0 + 240, y1 + 50 + sw * 2), (x0 + 166, y1 + 36)])
    shaded(cv, bc, '#FFFFFF', '#D8D2C0', dx=-4, dy=-3)


def kitchen(cv, t):
    X0, X1 = -282, 152
    pill_shadow(cv, (X0 + X1) / 2, 1198, X1 - X0 + 30, 30, DEEP)
    cv.drawRect(R(X0, 752, X1, 906), paint('#FFFFFF'))                      # tiled splashback
    for gx in range(X0, X1 + 1, 36):
        cv.drawPath(poly([(gx, 752), (gx, 906)], False), paint('#D8DEF0', stroke=2))
    for gy in range(752, 907, 36):
        cv.drawPath(poly([(X0, gy), (X1, gy)], False), paint('#D8DEF0', stroke=2))
    shaded(cv, rrp(X0, 958, X1, 1194, 8), '#FF7A59', dark('#FF7A59', .3), dx=-8, dy=-8)
    for dx_ in (X0 + 22, X0 + 230):
        cv.drawPath(rrp(dx_, 990, dx_ + 180, 1172, 10), paint('#F2553A'))
        cv.drawPath(rrp(dx_ + 160, 1060, dx_ + 168, 1110, 4), paint('#FFD23F'))
    # worktop seen slightly from above, with a recessed basin
    cv.drawPath(poly([(X0 + 12, 898), (X1 - 12, 898), (X1 + 4, 958), (X0 - 4, 958)]), paint('#FFF1C8'))
    cv.drawPath(rrp(-196, 906, 34, 950, 16), paint('#4A6290'))
    cv.drawPath(rrp(-190, 914, 28, 950, 14), paint('#6F8AB8'))
    # tap: rises from the worktop behind the basin and arches over it
    cv.drawPath(rrp(-176, 888, -150, 904, 5), paint('#AEB9DA'))
    cv.drawPath(rrp(-170, 810, -156, 896, 6), paint('#C9D6FF'))
    sp = skia.Path()
    sp.moveTo(-163, 816)
    sp.cubicTo(-163, 772, -110, 768, -104, 806)
    cv.drawPath(sp, paint('#C9D6FF', stroke=13))
    cv.drawPath(rrp(-112, 800, -96, 816, 4), paint('#AEB9DA'))
    cv.drawPath(rrp(-186, 838, -160, 848, 4), paint('#AEB9DA'))
    d = (t * 1.1) % 1
    # dirty dishes in the basin: pan, stack of plates, mug
    cv.drawCircle(-20, 878, 34, paint('#2A2E5E'))
    cv.drawCircle(-20, 878, 25, paint('#3A3F78'))
    cv.drawPath(rrp(8, 868, 92, 880, 6), paint('#2A2E5E'))
    for i in range(7):
        px = -70 + math.sin(i * 1.7) * 7
        py = 940 - i * 13
        cv.drawOval(R(px - 64, py - 12, px + 64, py + 12), paint('#C9D3E8'))
        cv.drawOval(R(px - 64, py - 15, px + 64, py + 9), paint('#FFFFFF'))
        cv.drawOval(R(px - 42, py - 12, px + 42, py + 3), paint('#EEF1FA'))
        if i % 2 == 0:
            cv.drawOval(R(px - 26, py - 11, px - 4, py - 2), paint('#B8742E', 210))
        if i % 3 == 1:
            cv.drawOval(R(px + 8, py - 10, px + 32, py - 2), paint('#E8B53A', 210))
    cv.drawOval(R(-110, 822 + d * 40, -100, 834 + d * 40), paint('#7FD8FF', A(255 * (1 - d))))
    shaded(cv, rrp(60, 896, 106, 950, 8), '#FF3D9A', dark('#FF3D9A', .3), dx=-4, dy=-3)
    cv.drawPath(poly([(106, 908), (122, 916), (106, 934)], False), paint('#FF3D9A', stroke=7))
    cv.drawPath(rrp(X0 - 8, 950, X1 + 8, 972, 6), paint('#F2DDA8'))         # worktop front edge
    gloss_line(cv, X0 + 14, 961, X0 + 70, 961, 5)


def bin_and_bag(cv, t):
    x, y, s = -150, 1350, 120
    pill_shadow(cv, x, y + 2, s * 2.3, s * .22, DEEP)
    cv.save()
    cv.rotate(-12, x + s * 1.05, y - s * .1)
    shaded(cv, rrp(x + s * .7, y - s * .2, x + s * 1.4, y - s * .04, s * .04), '#FFF1C8', dark('#FFF1C8', .3), dx=-3, dy=-2)
    cv.drawPath(rrp(x + s * .7, y - s * .13, x + s * 1.4, y - s * .09, 2), paint('#E8335B'))
    cv.restore()
    shaded(cv, rrp(x - s * 1.1, y - s * .24, x - s * .9, y - s * .02, s * .04), '#FF3D5A', dark('#FF3D5A', .3), dx=-2, dy=-1)
    cv.drawPath(poly([(x + s * .5, y - s * .02), (x + s * .62, y - s * .14), (x + s * .74, y - s * .03)]), paint('#FFD23F'))
    cv.drawCircle(x - s * .78, y - s * .08, s * .09, paint('#F3F7FF'))
    body = poly([(x - s * .55, y - s * 1.15), (x + s * .55, y - s * 1.15), (x + s * .46, y), (x - s * .46, y)])
    shaded(cv, body, '#8E9AD8', dark('#8E9AD8', .3), dx=-s * .06, dy=0)
    for k_ in (-.24, 0, .24):
        cv.drawPath(poly([(x + k_ * s, y - s * 1.02), (x + k_ * s * .9, y - s * .12)], False), paint('#7480C4', stroke=4))
    # one big, lumpy bin bag bulging out of the top and draping over the rim
    cx, cy = x + s * .04, y - s * 1.42
    pts = []
    for i in range(26):
        a = i / 26 * 2 * math.pi
        rr = 1 + .09 * math.sin(3 * a + .5) + .07 * math.sin(5 * a + 1.3) + .05 * math.sin(7 * a + 2.1)
        ry_ = .62 if math.sin(a) < 0 else .5
        pts.append((cx + math.cos(a) * s * .86 * rr, cy + math.sin(a) * s * ry_ * rr + (s * .1 if math.sin(a) > .3 else 0)))
    bag = smooth_xy(pts)
    shaded(cv, bag, '#1E2246', '#10132E', dx=-s * .07, dy=-s * .06)
    for (a0, a1, b0, b1) in ((-.55, -.2, -.05, .25), (.1, .45, -.1, .2), (-.3, .2, .15, .3)):
        f = skia.Path()
        f.moveTo(cx + a0 * s, cy + b0 * s)
        f.quadTo(cx + (a0 + a1) / 2 * s, cy + (b0 - .12) * s, cx + a1 * s, cy + b1 * s)
        cv.drawPath(f, paint('#10132E', stroke=4))
    tk = cy - s * .62
    cv.drawPath(poly([(cx - s * .06, tk + s * .1), (cx - s * .22, tk - s * .14), (cx - s * .02, tk - s * .05)]), paint('#1E2246'))
    cv.drawPath(poly([(cx + s * .06, tk + s * .1), (cx + s * .24, tk - s * .12), (cx + s * .02, tk - s * .05)]), paint('#1E2246'))
    cv.drawCircle(cx, tk + s * .06, s * .07, paint('#2A2F5E'))
    gloss_line(cv, cx - s * .55, cy - s * .2, cx - s * .38, cy - s * .42, 5, 170)
    cv.drawCircle(cx - s * .3, cy - s * .5, 3.5, paint('#FFFFFF', 170))
    cv.drawPath(rrp(x - s * .6, y - s * 1.2, x + s * .6, y - s * 1.08, s * .05), paint('#6B77C8'))
    cv.save()
    cv.translate(x + s * .95, y - s * .32)
    cv.rotate(-62)
    cv.drawPath(rrp(-s * .58, -s * .07, s * .58, s * .07, s * .05), paint('#6B77C8'))
    cv.restore()
    for i in range(3):
        ph = (t * .8 + i * .33) % 1
        sx = cx - s * .3 + i * s * .3
        p = skia.Path()
        p.moveTo(sx, cy - s * .8 - ph * s * .7)
        p.cubicTo(sx + s * .1, cy - s * .95 - ph * s * .7, sx - s * .1, cy - s * 1.1 - ph * s * .7, sx, cy - s * 1.25 - ph * s * .7)
        cv.drawPath(p, paint('#8BE04F', A(220 * (1 - ph)), stroke=5))
    for i in range(4):
        a = t * 3 + i * 1.6
        fx = cx + math.cos(a) * s * (.55 + i * .12)
        fy = cy - s * .9 + math.sin(a * 1.3) * s * .25
        cv.drawCircle(fx, fy, 4, paint('#15152B'))
        cv.drawPath(poly([(fx - 5, fy - 4), (fx, fy - 1), (fx + 5, fy - 4)], False), paint('#FFFFFF', 200, stroke=1.8))


def cat(cv, x, y, s, t):
    sc = math.sin(t * 9)
    pill_shadow(cv, x, y + 2, s * 1.3, s * .18, DEEP)
    tail = skia.Path()
    tail.moveTo(x + s * .22, y - s * .22)
    tail.cubicTo(x + s * .7, y - s * .1, x + s * .8, y - s * .6, x + s * .55, y - s * .9)
    cv.drawPath(tail, paint('#E8741A', stroke=s * .15))
    cv.drawPath(tail, paint('#FF9A3D', stroke=s * .11))
    for sd in (-1, 1):
        sh = (x + sd * s * .2, y - s * .88)
        pw = (x + sd * s * .3, y - s * 1.5 + sc * sd * s * .1)
        cv.drawPath(poly([sh, pw], False), paint('#E8741A', stroke=s * .17))
        cv.drawPath(poly([sh, pw], False), paint('#FF9A3D', stroke=s * .13))
        cv.drawCircle(pw[0], pw[1], s * .09, paint('#FFD2A0'))
    shaded(cv, op(x - s * .33, y - s * 1.1, x + s * .33, y - s * .12), '#FF9A3D', '#E8741A', dx=-s * .05, dy=-s * .04)
    for k_ in range(3):
        cv.drawPath(poly([(x - s * .22, y - s * (.5 + k_ * .17)), (x + s * .22, y - s * (.56 + k_ * .17))], False), paint('#E8741A', stroke=s * .05))
    for sd in (-1, 1):
        cv.drawOval(R(x + sd * s * .2 - s * .13, y - s * .08, x + sd * s * .2 + s * .13, y + s * .02), paint('#FFD2A0'))
    hy = y - s * 1.28
    shaded(cv, cp(x, hy, s * .29), '#FF9A3D', '#E8741A', dx=-s * .04, dy=-s * .04)
    for sd in (-1, 1):
        cv.drawPath(poly([(x + sd * s * .27, hy - s * .1), (x + sd * s * .2, hy - s * .46), (x + sd * s * .02, hy - s * .26)]), paint('#FF9A3D'))
        cv.drawPath(poly([(x + sd * s * .21, hy - s * .12), (x + sd * s * .19, hy - s * .34), (x + sd * s * .08, hy - s * .24)]), paint('#FF8AB0'))
    gloss_arc(cv, x, hy, s * .22, 205, 50, s * .04)


def door_cat(cv, t):
    cv.drawPath(rrp(918, 404, 1158, 1192, 10), paint(YEL_DD))
    shaded(cv, rrp(936, 424, 1140, 1190, 8), '#FF6B4A', dark('#FF6B4A', .3), dx=-8, dy=0)
    for (a_, b_) in ((446, 780), (812, 1166)):
        cv.drawPath(rrp(956, a_, 1120, b_, 8), paint('#F2553A'))
        cv.drawPath(rrp(956, a_, 1120, b_, 8), paint('#C93E26', stroke=3))
    cv.drawCircle(968, 860, 14, paint(YEL))
    for sx in (-30, 0, 30):
        cv.drawPath(poly([(1040 + sx, 930), (1050 + sx, 1120)], False), paint('#FFD2BF', stroke=5))
    cat(cv, 1044, 1192, 110, t)
    k = ease(prog(t, 4.4, 4.9))
    if k > 0:
        pulse = 1 + .06 * math.sin(t * 8)
        cv.save()
        cv.translate(930, 900)
        cv.scale(k * pulse, k * pulse)
        cv.translate(-930, -900)
        cv.drawPath(rrp(848, 868, 1012, 930, 28), paint('#FFFFFF'))
        cv.drawPath(poly([(964, 926), (998, 960), (998, 922)]), paint('#FFFFFF'))
        text(cv, 'meow!', 930, 900, font('bold', 40), '#1D1A3A')
        cv.restore()


def player(cv, t):
    jl = math.sin(t * 17) * .035
    jr = math.sin(t * 17 + 2) * .035
    fc = dict(eyes='open', squint=.15, look=(math.sin(t * 1.3) * .3, -.7), mouth=.4,
              mopen=.14 + .1 * (.5 + .5 * math.sin(t * 4)), brows=((7, .02), (7, .02)), blush=.35)

    def held(cv_):
        controller(cv_, 540, NF - 2.0 * NR, NR, math.sin(t * 1.3) * 6, t)
        boy_hands(cv_, 0, jl, jr)
    boy_legs(cv)
    person(cv, 540, NF, NR, BOY, dict(legs=None, arms=boy_arms(0, jl, jr), face=fc, held=held, hands=False,
                                      tilt=math.sin(t * 1.3) * 2.5, lift=math.sin(t * 3) * .012))
    glow(cv, 540, NF - 3.75 * NR, 1.3 * NR, '#7FFFA0', 26, mid=1)


def room(cv, t):
    room_bg(cv, t)
    wallpaper(cv, t)
    kitchen(cv, t)
    door_cat(cv, t)
    glow(cv, 540, 760, 700, '#7FFFA0', 30, mid=1)
    pill_shadow(cv, 540, 1296, 720, 44, DEEP)
    sofa_back(cv)
    sofa_front(cv)
    pill_shadow(cv, 540, 1316, 330, 30, '#009A98')
    player(cv, t)
    bin_and_bag(cv, t)


# ================================================================== camera + frame
def camera(t):
    z1 = ease(prog(t, 2.0, 3.3))          # pull out: starts at 2 s ...
    z2 = ease(prog(t, 2.5, 4.0))          # ... whole room revealed by 4 s
    k = lerp(lerp(1.9, 1.25, z1), .75, z2)
    fx = lerp(540, 440, z2)
    fy = lerp(lerp(985, 1000, z1), 860, z2)
    sy = lerp(lerp(900, 920, z1), 900, z2)
    return k, fx, fy, 540, sy


def draw(cv, t, fi):
    cv.drawRect(R(0, 0, W, H), paint(shader=lin(0, 0, 0, H, [NAVY0, NAVY1])))
    halos(cv, 540, 1700, 120, 5, 90, NAVY2, 60)
    sparkle_field(cv, t, 61, 30, 1350, H)
    cv.save()
    cv.clipRect(R(0, 0, W, SCENE_BOTTOM))
    k, fx, fy, sx, sy = camera(t)
    cv.save()
    cv.translate(sx, sy)
    cv.scale(k, k)
    cv.translate(-fx, -fy)
    room(cv, t)
    cv.restore()
    tv_popout(cv, t)
    cv.restore()
    cv.drawRect(R(0, SCENE_BOTTOM, W, SCENE_BOTTOM + 8), paint(YEL))
    word_caption(cv, t, CAP_T0, CAP_STEP, CAPTION_WORDS, cy=1500)
    fade = 1 - prog(t, 0, .3)
    if fade > 0:
        cv.drawRect(R(0, 0, W, H), paint('#000000', 255 * fade))


if __name__ == '__main__':
    run('gta6_chores', DUR, draw)
