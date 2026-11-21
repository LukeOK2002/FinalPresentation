import os, sys
from kzs import *

DUR = 14.5

# ------------------------------------------------------------------ geography (lon, lat), simplified
FL_COAST = [  # Florida: St Marys river mouth -> down the east coast -> up the Gulf coast -> Perdido river
    (-81.45, 30.72), (-81.39, 30.29), (-81.28, 29.9), (-81.0, 29.2), (-80.7, 28.7), (-80.55, 28.45), (-80.37, 27.65),
    (-80.07, 26.95), (-80.03, 26.7), (-80.1, 26.1), (-80.13, 25.8), (-80.2, 25.5), (-80.35, 25.3), (-80.5, 25.15),
    (-81.1, 25.12), (-81.15, 25.35), (-81.4, 25.85), (-81.8, 26.15), (-82.0, 26.5), (-82.2, 26.85), (-82.55, 27.3),
    (-82.7, 27.75), (-82.85, 28.0), (-82.8, 28.6), (-83.0, 29.1), (-83.4, 29.7), (-84.0, 30.05), (-84.3, 30.05),
    (-84.4, 29.9), (-85.0, 29.7), (-85.35, 29.68), (-85.7, 30.1), (-86.5, 30.4), (-87.2, 30.33), (-87.5, 30.3)]
FL_BORDER = [(-87.6, 30.3), (-87.6, 31.0), (-85.0, 31.0), (-84.9, 30.72), (-82.2, 30.56)]

US = ([(-124.7, 48.4), (-123.0, 49.0), (-95.2, 49.0), (-94.6, 48.7), (-93.0, 48.6), (-91.5, 48.1), (-89.6, 48.0),
       (-92.1, 46.8), (-90.4, 46.6), (-88.0, 47.4), (-86.5, 46.5), (-84.5, 46.5), (-83.3, 45.0), (-82.5, 43.0),
       (-83.1, 42.3), (-83.4, 41.7), (-82.5, 41.4), (-80.5, 42.0), (-79.0, 42.8), (-79.0, 43.3), (-76.5, 43.5),
       (-76.3, 44.2), (-75.0, 45.0), (-71.5, 45.0), (-70.3, 45.9), (-69.2, 47.4), (-68.3, 47.35), (-67.8, 47.05),
       (-67.8, 45.7), (-67.0, 44.8), (-68.5, 44.3), (-70.2, 43.6), (-70.7, 42.9), (-71.0, 42.35), (-70.0, 41.7),
       (-71.4, 41.4), (-72.9, 41.2), (-73.7, 40.9), (-74.0, 40.5), (-74.0, 39.7), (-74.9, 38.9), (-75.3, 38.0),
       (-75.9, 37.1), (-76.0, 36.9), (-75.6, 35.3), (-76.5, 34.7), (-77.9, 33.9), (-79.2, 33.2), (-80.0, 32.6),
       (-81.2, 31.9)] + FL_COAST +
      [(-88.1, 30.3), (-89.2, 30.3), (-89.5, 30.2), (-89.0, 29.2), (-90.1, 29.1), (-91.3, 29.3), (-92.5, 29.6),
       (-93.8, 29.7), (-94.7, 29.3), (-95.3, 28.9), (-96.4, 28.3), (-97.2, 27.7), (-97.4, 26.8), (-97.2, 25.95),
       (-98.2, 26.1), (-99.1, 26.4), (-99.5, 27.5), (-100.4, 28.6), (-101.0, 29.4), (-102.3, 29.9), (-102.7, 29.7),
       (-103.1, 29.0), (-104.5, 29.6), (-104.9, 30.6), (-106.5, 31.75), (-108.2, 31.78), (-108.2, 31.33),
       (-111.07, 31.33), (-114.8, 32.5), (-117.1, 32.5), (-117.3, 33.0), (-118.4, 33.7), (-118.5, 34.0),
       (-120.5, 34.45), (-121.9, 36.6), (-122.5, 37.7), (-123.7, 38.9), (-124.4, 40.4), (-124.1, 41.8),
       (-124.5, 42.8), (-124.0, 44.6), (-123.9, 46.2), (-124.1, 46.9)])
FLORIDA = FL_COAST + FL_BORDER
CUBA = [(-84.95, 21.85), (-84.2, 22.65), (-83.0, 22.95), (-81.5, 23.15), (-80.1, 23.1), (-79.2, 22.5), (-77.8, 21.8),
        (-76.0, 21.15), (-75.0, 20.7), (-74.2, 20.2), (-75.6, 19.9), (-77.2, 19.9), (-77.7, 20.4), (-78.3, 21.5),
        (-79.9, 21.6), (-81.0, 22.0), (-82.5, 22.1), (-83.9, 21.8)]
BAHAMAS = [((-78.4, 26.6), 24, 6), ((-77.9, 24.5), 14, 24), ((-76.2, 24.9), 8, 14), ((-77.3, 25.1), 10, 10), ((-79.0, 26.9), 12, 4)]
MIAMI = (-80.19, 25.76)

# ------------------------------------------------------------------ Albers equal-area conic projection
_p1, _p2, _p0, _l0 = [math.radians(v) for v in (29.5, 45.5, 37.5, -96.0)]
_n = (math.sin(_p1) + math.sin(_p2)) / 2
_C = math.cos(_p1) ** 2 + 2 * _n * math.sin(_p1)
_r0 = math.sqrt(_C - 2 * _n * math.sin(_p0)) / _n


def _albers(lon, lat):
    ph, la = math.radians(lat), math.radians(lon)
    rho = math.sqrt(_C - 2 * _n * math.sin(ph)) / _n
    th = _n * (la - _l0)
    return rho * math.sin(th), -(_r0 - rho * math.cos(th))


_pts = [_albers(*p) for p in US]
_minx, _maxx = min(p[0] for p in _pts), max(p[0] for p in _pts)
_miny, _maxy = min(p[1] for p in _pts), max(p[1] for p in _pts)
SC = 1000.0 / (_maxx - _minx)
MAP_CX, MAP_CY = 540, 760


def proj(lon, lat):
    x, y = _albers(lon, lat)
    return MAP_CX + (x - (_minx + _maxx) / 2) * SC, MAP_CY + (y - (_miny + _maxy) / 2) * SC


def smooth_path(pts, closed=True):
    P = [proj(*p) for p in pts]
    n = len(P)
    path = skia.Path()
    mid = lambda a, b: ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    m0 = mid(P[-1], P[0])
    path.moveTo(*m0)
    for i in range(n):
        m = mid(P[i], P[(i + 1) % n])
        path.quadTo(P[i][0], P[i][1], m[0], m[1])
    path.close()
    return path


US_PATH = smooth_path(US)
FL_PATH = smooth_path(FLORIDA)
CUBA_PATH = smooth_path(CUBA)
BORDER_PTS = [proj(*p) for p in FL_BORDER[1:-1] + [(-82.2, 30.56), (-81.45, 30.72)]]
MIAMI_XY = proj(*MIAMI)
FOCUS_XY = proj(-81.9, 27.7)

# ------------------------------------------------------------------ scene timing
T_ZOOM0, T_ZOOM1 = 1.1, 3.8
T_PIN, T_BADGE = 3.9, 4.35
T_WIPE0, T_WIPE1 = 6.6, 7.4
PANEL = (0, 130, W, 1340)
K_END = 5.2
SCREEN_FOCUS = (640, 860)          # where Miami lands on screen at full zoom


def camera(t):
    z = ease(prog(t, T_ZOOM0, T_ZOOM1))
    k = lerp(1.0, K_END, z ** 1.15)
    # keep the focus interpolating from the map centre to Miami's final screen spot
    fx = lerp(MAP_CX, MIAMI_XY[0], z)
    fy = lerp(MAP_CY, MIAMI_XY[1], z)
    sx = lerp(MAP_CX, SCREEN_FOCUS[0], z)
    sy = lerp(MAP_CY, SCREEN_FOCUS[1], z)
    return k, fx, fy, sx, sy


def to_screen(p, cam):
    k, fx, fy, sx, sy = cam
    return sx + (p[0] - fx) * k, sy + (p[1] - fy) * k


# ------------------------------------------------------------------ pin + peace-sign hand
def peace_hand(cv, cx, cy, s):
    sk = '#FFC21A'
    sh = dark(sk, .3)

    def finger(x0, y0, x1, y1):
        p = poly([(x0, y0), (x1, y1)], False)
        cv.drawPath(p, paint(sh, stroke=.19 * s))
        cv.drawPath(p, paint(sk, stroke=.15 * s))
    finger(cx - .1 * s, cy + .02 * s, cx - .24 * s, cy - .62 * s)
    finger(cx + .1 * s, cy + .02 * s, cx + .24 * s, cy - .62 * s)
    shaded(cv, rrp(cx - .3 * s, cy - .02 * s, cx + .3 * s, cy + .52 * s, .2 * s), sk, sh, dx=-.04 * s, dy=-.04 * s)
    for dx_ in (.12, .26):                                   # curled fingers
        cv.drawCircle(cx + dx_ * s, cy + .16 * s, .1 * s, paint(sh))
        cv.drawCircle(cx + dx_ * s - .015 * s, cy + .15 * s, .09 * s, paint(sk))
    thumb = poly([(cx - .3 * s, cy + .3 * s), (cx - .02 * s, cy + .2 * s)], False)
    cv.drawPath(thumb, paint(sh, stroke=.17 * s))
    cv.drawPath(thumb, paint(sk, stroke=.13 * s))
    gloss_line(cv, cx - .2 * s, cy - .42 * s, cx - .17 * s, cy - .25 * s, .04 * s, 220)


def map_pin(cv, x, y, k, t):
    """Pin whose tip is at (x, y); pops up from the tip."""
    if k <= 0:
        return
    for i in range(2):                                      # ground ripples
        a = ((t - T_PIN) * 1.1 + i * .5) % 1
        cv.drawOval(R(x - 20 - 70 * a, y - 8 - 24 * a, x + 20 + 70 * a, y + 8 + 24 * a), paint('#E8335B', A(200 * (1 - a)), stroke=5))
    cv.save()
    cv.translate(x, y)
    cv.scale(k * 1.6, k * 1.6)
    cv.translate(-x, -y)
    cv.drawOval(R(x - 26, y - 8, x + 26, y + 8), paint('#05031a', 120))
    body = skia.Path()
    body.addCircle(x, y - 78, 38)
    body.moveTo(x - 33, y - 52)
    body.lineTo(x, y)
    body.lineTo(x + 33, y - 52)
    body.close()
    shaded(cv, body, '#E8335B', dark('#E8335B', .3), dx=-7, dy=-6)
    cv.drawCircle(x, y - 78, 15, paint('#FFFFFF'))
    gloss_arc(cv, x, y - 78, 27, 200, 50, 6)
    cv.restore()


def peace_badge(cv, x, y, k):
    """Round white badge with the peace-sign emoji, attached to the pin head."""
    if k <= 0:
        return
    cv.save()
    cv.translate(x, y)
    cv.scale(k * 1.45, k * 1.45)
    cv.translate(-x, -y)
    cv.drawPath(poly([(x - 70, y + 36), (x - 46, y + 20), (x - 40, y + 46)]), paint('#FFFFFF'))
    cv.drawCircle(x, y + 5, 72, paint('#05031a', 90, blur=8))
    cv.drawCircle(x, y, 68, paint('#FFFFFF'))
    cv.drawCircle(x, y, 68, paint('#E8335B', stroke=6))
    peace_hand(cv, x, y + 8, 62)
    cv.restore()


# ------------------------------------------------------------------ scene 1: the map
def scene_map(cv, t):
    cv.save()
    cv.clipRect(R(*PANEL))
    cv.drawRect(R(*PANEL), paint(shader=lin(0, PANEL[1], 0, PANEL[3], ['#1C4BC8', '#0F2A8C'])))
    cam = camera(t)
    k = cam[0]
    cv.save()
    cv.translate(cam[3], cam[4])
    cv.scale(k, k)
    cv.translate(-cam[1], -cam[2])
    rng = random.Random(4)
    for i in range(70):                                     # wave marks on the water (drawn under the land)
        wx, wy = rng.uniform(-300, 1380), rng.uniform(100, 1420)
        p = skia.Path()
        p.moveTo(wx, wy)
        p.quadTo(wx + 12, wy - 8, wx + 24, wy)
        p.quadTo(wx + 36, wy + 8, wx + 48, wy)
        cv.drawPath(p, paint('#61E7ED', 110, stroke=3.2 / max(1, k * .55)))
    d = 11 / k
    pop = eback(prog(t, .15, .85), 1.2)
    cv.save()
    cv.translate(MAP_CX, MAP_CY)
    cv.scale(pop, pop)
    cv.translate(-MAP_CX, -MAP_CY)
    for path_, c, sc_ in ((CUBA_PATH, TEAL, TEAL_D), (US_PATH, TEAL, TEAL_D)):
        cv.save()
        cv.translate(0, d)
        cv.drawPath(path_, paint(sc_))
        cv.restore()
        cv.drawPath(path_, paint(c))
    for (lon, lat), rx, ry in BAHAMAS:
        bx, by = proj(lon, lat)
        cv.drawOval(R(bx - rx * .42, by - ry * .42 + d, bx + rx * .42, by + ry * .42 + d), paint(TEAL_D))
        cv.drawOval(R(bx - rx * .42, by - ry * .42, bx + rx * .42, by + ry * .42), paint(TEAL))
    # Florida highlights as the camera arrives
    fl = ease(prog(t, T_ZOOM0 + .3, T_ZOOM1))
    cv.save()
    cv.translate(0, d)
    cv.drawPath(FL_PATH, paint(YEL_DD, A(255 * fl)))
    cv.restore()
    cv.drawPath(FL_PATH, paint(YEL, A(255 * fl)))
    cv.restore()
    cv.drawPath(poly(BORDER_PTS, False), paint('#0F8E88', 255, stroke=3.2 / k))
    cv.restore()
    # labels (screen space)
    la = ease(prog(t, 3.0, 3.6))
    if la > 0:
        for s_, lon, lat in (('GULF OF MEXICO', -83.75, 26.2), ('ATLANTIC OCEAN', -78.0, 29.3)):
            x_, y_ = to_screen(proj(lon, lat), cam)
            text(cv, s_, x_, y_, font('semi', 24), '#BFE9FF', A(180 * la), track=4)
        x_, y_ = to_screen(proj(-82.2, 28.1), cam)
        text(cv, 'FLORIDA', x_, y_, font('bold', 40), '#7A4A00', A(255 * la), track=8)
    # pin + peace badge at Miami
    mx, my = to_screen(MIAMI_XY, cam)
    pk = eback(prog(t, T_PIN, T_PIN + .5), 1.7)
    map_pin(cv, mx, my, pk, t)
    bk = eback(prog(t, T_BADGE, T_BADGE + .5), 1.7)
    peace_badge(cv, mx + 150, my - 250, bk)
    if pk > .5:
        w = font('bold', 30).measureText('Miami') + 30
        a = ease(prog(t, T_PIN + .2, T_PIN + .6))
        cv.drawPath(rrp(mx - w / 2, my + 26, mx + w / 2, my + 70, 12), paint('#000000', A(175 * a)))
        text(cv, 'Miami', mx, my + 48, font('bold', 30), '#FFFFFF', A(255 * a))
    cv.restore()
    return (mx, my)


# ------------------------------------------------------------------ scene 2: BBL rate chart
BARS = [  # name, value (%), colour, start, end of grow animation
    ('GTA 4', 0.2, '#5B6BFF', 7.8, 9.0),
    ('GTA 5', 3.2, '#61E7ED', 9.1, 10.4),
    ('GTA 6', 20.8, '#FF2D95', 10.5, 12.3),
]
L, RT, TT, BT = 190, 1000, 600, 1190
YMAX = 25.0
T0_CHART = T_WIPE0 + .4


def Y(v):
    return BT - v / YMAX * (BT - TT)


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


def scene_chart(cv, t):
    PT, PB = PANEL[1], PANEL[3]
    slot = (RT - L) / 3
    cx6 = L + slot * 2.5
    cv.drawRect(R(0, PT, W, PB), paint(PANEL_L))
    wk = ease(prog(t, 10.8, 12.3))
    if wk > 0:
        cv.save()
        cv.clipRect(R(0, PT, W, PB))
        sunburst(cv, cx6, 780, t, '#FF3D9A', 30 * wk, 18, 1800, .06)
        cv.restore()
    text(cv, 'BBL rate', 70, 220, font('bold', 76), '#FFFFFF', anchor='l')
    text(cv, 'Characters with a BBL, % of all characters', 70, 296, font('med', 32), '#C9C6F2', anchor='l')
    tag(cv, 60, 336, 300, 74, 'BBL rate', '#3CCB86', size=34)
    for v in (5, 10, 15, 20, 25):
        p = paint('#FFFFFF', 30, stroke=2, cap='butt')
        p.setPathEffect(skia.DashPathEffect.Make([10, 10], 0))
        cv.drawPath(poly([(L, Y(v)), (RT, Y(v))], False), p)
        text(cv, '%d%%' % v, L - 22, Y(v), font('med', 26), '#AFA9E8', anchor='r')
    arrow_axis(cv, L, BT, L, TT - 70, PERI, 8, 28)
    arrow_axis(cv, L, BT, RT + 40, BT, PERI, 8, 28)
    text(cv, 'Source: Wives and Girlfriends Association of America', 60, PB - 26, font('med', 24), '#FFFFFF', 190, anchor='l')

    bw = 176
    for i, (name, val, colr, a, b) in enumerate(BARS):
        cx = L + slot * (i + .5)
        x0, x1 = cx - bw / 2, cx + bw / 2
        p = prog(t, a, b)
        hk = eback(p, .9) if i == 2 else eout(p)
        shown = val * min(1.0, hk)
        ytop = Y(val * hk)
        if i == 2 and p > 0:
            glow(cv, cx, (ytop + BT) / 2, 480, colr, 70 * clamp(p * 1.5), mid=1)
        if hk > .004:
            path = bar_path(x0, x1, ytop, BT - 2, 24)
            shaded(cv, path, colr, dark(colr, .3), dx=-12, dy=0)
            h = BT - ytop
            if h > 90:
                gloss_line(cv, x0 + 30, ytop + 34, x0 + 30, ytop + 34 + min(h * .3, 120), 11)
                cv.drawCircle(x0 + 30, ytop + 34 + min(h * .3, 120) + 22, 6, paint('#FFFFFF', 235))
            lab = ('%.1f%%' % shown)
            text(cv, lab, cx, ytop - 36, font('bold', 58 if i == 2 else 48), '#FFFFFF', A(255 * clamp(p * 4)))
        text(cv, name, cx, BT + 56, font('bold', 42), '#FFFFFF')
    ytop = Y(BARS[2][1])
    tg = prog(t, 12.3, 12.9)
    if tg > 0:
        kk = eback(tg, 1.6)
        ty = ytop - 118
        cv.save()
        cv.translate(cx6, ty)
        cv.scale(kk, kk)
        cv.translate(-cx6, -ty)
        tag(cv, cx6 - 140, ty - 32, 280, 64, 'Highest', YEL, size=34, tc='#272448')
        cv.drawPath(star(cx6 - 90, ty, 16), paint('#272448'))
        cv.restore()
        for i in range(5):
            a = (t - 12.3 - i * .07) / .9
            if 0 < a < 1:
                ang = i * math.pi / 2.5 + .4
                r_ = 80 + 120 * eout(a)
                plus(cv, cx6 + math.cos(ang) * r_, ty + math.sin(ang) * r_ * .8, 16 * (1 - a) + 5, '#FFFFFF', A(255 * (1 - a)))
    if wk > 0:
        for (dx_, dy_, s_) in ((-150, -200, 18), (150, -140, 14), (-120, 120, 12), (160, 160, 16)):
            plus(cv, cx6 + dx_, ytop + dy_ + 140, s_ * (.7 + .3 * math.sin(t * 5 + dx_)), '#FFFFFF', A(255 * wk))


# ------------------------------------------------------------------ frame
def draw(cv, t, fi):
    cv.drawRect(R(0, 0, W, H), paint(shader=lin(0, 0, 0, H, [NAVY0, NAVY1])))
    halos(cv, 540, 1700, 120, 5, 90, NAVY2, 60)
    sparkle_field(cv, t, 41, 34, 1350, H)
    sparkle_field(cv, t, 42, 6, 0, 120)
    wipe = prog(t, T_WIPE0, T_WIPE1)
    pin_xy = None
    if wipe < 1:
        pin_xy = scene_map(cv, t)
    if wipe > 0:
        cx_, cy_ = pin_xy if pin_xy else (640, 900)
        if wipe < 1:
            cv.save()
            cv.clipPath(cp(cx_, cy_, 2300 * ease(wipe)), skia.ClipOp.kIntersect, True)
        scene_chart(cv, t)
        if wipe < 1:
            cv.restore()
            cv.drawCircle(cx_, cy_, 2300 * ease(wipe), paint(YEL, 230, stroke=12))
    subtitle(cv, t, 1.2, 6.3, "The game's setting is based on Miami,\nthe {hl:BBL capital} of America", cy=1480)
    subtitle(cv, t, 7.0, 99, "As such, there are more characters\nwith BBLs than any other game\nin the series", cy=1490, fade_out=False)
    fade = 1 - prog(t, 0, .3)
    if fade > 0:
        cv.drawRect(R(0, 0, W, H), paint('#000000', 255 * fade))


if __name__ == '__main__':
    run('gta6_bbl_map_chart', DUR, draw)
