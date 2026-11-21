import os, sys
from kzs import *

DUR = 15.5

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
T_ZOOM0, T_ZOOM1 = 2.1, 4.8
T_PIN, T_BADGE = 4.9, 5.35
T_WIPE0, T_WIPE1 = 7.6, 8.4
DT = 1.0                                      # chart runs on its own clock, shifted by DT
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


# ------------------------------------------------------------------ natural features
REGIONS = [  # (polygon lon/lat, colour, blur) painted inside the land, soft edged
    ([(-124.2, 48.4), (-121.4, 48.8), (-121.4, 43.0), (-123.4, 41.4), (-124.3, 43.0)], '#1AA070', 10),                    # Pacific forest
    ([(-105.0, 48.6), (-96.5, 48.9), (-95.8, 43.0), (-96.2, 37.0), (-97.6, 33.0), (-101.6, 32.0), (-103.6, 36.0), (-105.0, 41.0)], '#8FDB6C', 24),   # Great Plains
    ([(-90.0, 47.2), (-84.0, 46.2), (-82.0, 41.0), (-79.5, 38.0), (-76.0, 37.0), (-79.5, 34.0), (-85.0, 31.4), (-90.0, 31.0), (-92.2, 35.0), (-92.0, 40.0), (-90.3, 43.5)], '#22B27C', 16),   # Eastern forest
    ([(-119.6, 41.6), (-116.0, 42.1), (-112.4, 41.2), (-110.9, 39.5), (-112.4, 37.8), (-114.4, 37.0), (-117.4, 37.5), (-119.8, 39.0)], '#E6C970', 12),    # Great Basin
    ([(-118.0, 36.0), (-115.0, 37.0), (-113.0, 35.5), (-110.0, 34.8), (-107.5, 34.0), (-105.5, 32.0), (-104.0, 30.5), (-106.0, 29.9), (-109.0, 31.2), (-112.5, 31.4), (-114.8, 32.4), (-116.5, 33.5), (-118.3, 34.3)], '#F6D071', 10),   # SW deserts
    ([(-104.2, 30.0), (-103.0, 33.0), (-101.5, 34.6), (-99.2, 34.0), (-98.2, 31.0), (-99.8, 29.2), (-102.0, 29.5)], '#C9DB68', 14),   # Texas scrub
    ([(-81.9, 25.2), (-80.4, 25.2), (-80.5, 26.4), (-81.5, 26.3)], '#2FA79A', 6),                                               # Everglades
]
DUNES = [(-116.0, 34.6), (-114.0, 33.2), (-111.8, 33.0), (-109.0, 32.5), (-107.0, 32.4), (-113.0, 36.0), (-117.0, 36.2), (-106.0, 33.8)]
RIVERS = [
    [(-95.2, 47.3), (-93.0, 45.0), (-91.0, 43.0), (-91.0, 40.0), (-90.0, 38.0), (-89.2, 36.8), (-90.0, 34.0), (-91.2, 32.0), (-90.6, 30.0)],   # Mississippi
    [(-111.5, 45.8), (-104.0, 47.5), (-100.0, 45.0), (-97.0, 42.5), (-95.8, 40.0), (-90.2, 38.8)],                                             # Missouri
    [(-80.5, 40.3), (-84.5, 39.1), (-88.0, 37.2), (-89.1, 37.0)],                                                                             # Ohio
    [(-107.0, 40.5), (-110.0, 38.0), (-111.5, 36.9), (-114.5, 35.5), (-114.7, 32.6)],                                                         # Colorado
    [(-117.5, 47.0), (-120.0, 46.0), (-123.9, 46.2)],                                                                                         # Columbia
]
LAKES = [([(-87.9, 42.5), (-87.7, 43.4), (-87.9, 44.5), (-87.6, 45.1), (-87.3, 45.7), (-86.2, 45.9), (-85.0, 45.8), (-85.5, 45.2), (-86.2, 44.6), (-86.5, 43.6), (-86.4, 42.4), (-87.0, 41.65), (-87.8, 41.7)])]
def _cluster(ridge, spread, n_per, seed, smin=.5, smax=1.15):
    """Scatter several peaks of mixed sizes around each ridge point so ranges read as clusters, not lines."""
    rng = random.Random(seed)
    out = []
    for lon, lat, sz in ridge:
        for _ in range(n_per):
            out.append((lon + rng.gauss(0, spread), lat + rng.gauss(0, spread * .6), sz * rng.uniform(smin, smax)))
    return out


RANGES = {
    'rockies': _cluster([(-113.0, 48.3, 18), (-112.0, 47.0, 20), (-110.8, 45.5, 22), (-110.2, 44.3, 24), (-109.5, 43.0, 22),
                         (-108.2, 41.0, 22), (-106.8, 39.8, 26), (-106.2, 38.5, 24), (-105.8, 37.0, 22), (-106.0, 35.8, 17)],
                        .85, 5, 3),
    'sierra': _cluster([(-120.6, 40.0, 15), (-120.0, 38.8, 18), (-119.0, 37.6, 20), (-118.4, 36.5, 18), (-118.0, 35.6, 13)], .4, 4, 5),
    'cascades': _cluster([(-121.7, 48.5, 15), (-121.6, 47.0, 18), (-121.7, 45.4, 16), (-122.0, 43.5, 15), (-122.2, 41.6, 16)], .42, 4, 8),
    'apps': _cluster([(-84.2, 35.6, 11), (-82.8, 36.5, 11), (-81.5, 37.5, 11), (-80.2, 38.6, 11), (-78.8, 39.8, 11),
                      (-77.5, 40.6, 11), (-75.8, 41.3, 11), (-74.2, 42.0, 11)], .5, 4, 11, .6, 1.1),
}
def _land(lon, lat, r=0):
    x, y = proj(lon, lat)
    return all(US_PATH.contains(x + dx_, y + dy_) for dx_, dy_ in ((0, 0), (-r, 0), (r, 0), (0, -r * .6)))


RANGES = {k: [p for p in v if _land(p[0], p[1], p[2] * .75)] for k, v in RANGES.items()}

CITIES = [  # name, lon, lat
    ('Houston', -95.4, 29.8), ('Dallas', -96.8, 32.8), ('Austin', -97.7, 30.3), ('New York', -74.0, 40.7),
    ('Los Angeles', -118.2, 34.0), ('San Francisco', -122.4, 37.8), ('Chicago', -87.7, 41.95), ('Atlanta', -84.4, 33.75)]
PUMPJACKS = [(-102.2, 31.7), (-101.0, 32.4), (-103.0, 30.9), (-100.5, 31.3), (-99.0, 29.3), (-97.9, 28.6), (-101.6, 30.6)]
SOLAR = [(-116.7, 35.0, 1.0), (-119.6, 35.6, .8)]
MAN_LL = (-75.6, 41.9)
FLAMINGOS = [(-81.35, 28.3, 0, False), (-82.0, 27.0, 1.7, True), (-81.3, 26.55, 3.1, False), (-81.55, 25.55, 4.4, True)]


def region_path(pts):
    return smooth_path(pts)


MOUNTAIN_PATHS = {}
SNOW = [  # lon/lat polygons painted soft-edged inside the land
    [(-124.3, 49.0), (-95.4, 49.0), (-95.4, 47.5), (-100.0, 47.3), (-104.0, 46.9), (-109.0, 46.6), (-113.0, 46.9),
     (-117.0, 47.3), (-120.5, 47.9), (-123.6, 48.3)],
    [(-69.0, 47.5), (-67.8, 47.1), (-67.8, 45.9), (-69.6, 45.6)],
    [(-92.2, 47.6), (-88.0, 47.6), (-86.5, 46.7), (-90.5, 46.7)],
    [(-122.2, 48.9), (-120.4, 48.9), (-120.6, 47.2), (-122.0, 47.2)],
]
SNOW_PINES = [(-122.8, 48.5), (-121.6, 48.7), (-119.8, 48.5), (-118.2, 48.7), (-116.4, 48.4), (-114.4, 48.7), (-112.4, 48.6), (-110.4, 48.7),
              (-108.4, 48.5), (-106.4, 48.7), (-104.4, 48.4), (-102.4, 48.7), (-100.4, 48.5), (-98.4, 48.7), (-96.6, 48.4),
              (-94.0, 48.1), (-91.4, 47.4), (-88.6, 46.9), (-68.9, 46.9), (-69.2, 46.0), (-121.4, 47.7), (-119.2, 47.9)]
ICE_FLOES = [(-125.9, 48.7), (-126.6, 47.6), (-125.8, 46.9), (-90.2, 48.0), (-88.6, 48.5), (-87.4, 47.8), (-89.4, 47.4)]
REDWOODS = [(-123.4, 46.5), (-123.5, 45.1), (-123.4, 43.7), (-123.4, 42.3), (-123.2, 41.0)]
BISON = [(-104.3, 45.9, False), (-101.3, 45.1, True), (-103.7, 43.2, False), (-100.5, 42.6, True)]
SNOW_PINES = [p for p in SNOW_PINES if _land(p[0], p[1], 9)]
CATTLE = [(-94.7, 45.5, False), (-94.1, 45.2, True), (-94.9, 44.8, True), (-93.5, 44.5, False), (-93.0, 44.9, True)]


def mountain(cv, x, y, s, snow=True, rock=('#B98A66', '#8C5F44')):
    """Flat two-faced peak with a snow cap, base at (x, y)."""
    cv.drawOval(R(x - s * .75, y - s * .12, x + s * .75, y + s * .14), paint('#05031a', 60))
    cv.drawPath(poly([(x - s * .7, y), (x, y - s * 1.1), (x, y)]), paint(rock[0]))
    cv.drawPath(poly([(x, y - s * 1.1), (x + s * .7, y), (x, y)]), paint(rock[1]))
    if snow:
        cv.drawPath(poly([(x - s * .22, y - s * .72), (x, y - s * 1.1), (x + s * .22, y - s * .72), (x + s * .1, y - s * .62),
                          (x, y - s * .74), (x - s * .1, y - s * .62)]), paint('#FFFFFF'))


def city_icon(cv, x, y, s):
    pill_shadow(cv, x, y + 2, s * 1.6, s * .22, TEAL_D, 255)
    for dx_, w, h, c in ((-.5, .36, 1.0, '#DCE6FF'), (-.1, .32, 1.55, '#F3F7FF'), (.3, .34, .8, '#C9D6FF')):
        shaded(cv, rrp(x + dx_ * s - w * s / 2, y - h * s, x + dx_ * s + w * s / 2, y, s * .05), c, dark('#8FA2E8', .3), dx=-s * .05, dy=0)
        for wy in range(int(h * 4)):
            for wx in (-.08, .08):
                cv.drawRect(R(x + dx_ * s + wx * s - s * .03, y - h * s + s * .1 + wy * s * .22, x + dx_ * s + wx * s + s * .03, y - h * s + s * .17 + wy * s * .22), paint('#FFC21A'))
    cv.drawPath(poly([(x - .1 * s, y - 1.55 * s), (x - .1 * s, y - 1.85 * s)], False), paint('#F3F7FF', stroke=s * .05))


def name_tag(cv, x, y, label, size=15, anchor='c'):
    f = font('bold', size)
    w = f.measureText(label) + size * .9
    lx = x - w / 2 if anchor == 'c' else (x if anchor == 'l' else x - w)
    cv.drawPath(rrp(lx, y - size * .8, lx + w, y + size * .6, size * .3), paint('#000000', 185))
    text(cv, label, lx + w / 2, y - size * .08, f, '#FFFFFF')


def pumpjack(cv, x, y, s, t, ph):
    ang = math.sin(t * 2.4 + ph) * 15
    pill_shadow(cv, x, y + 1, s * 1.2, s * .2, TEAL_D, 255)
    cv.drawPath(rrp(x - s * .5, y - s * .16, x + s * .5, y, s * .05), paint(NAVY2))
    cv.drawPath(poly([(x - s * .13, y - s * .16), (x + s * .13, y - s * .16), (x, y - s * .72)]), paint('#FF6B4A'))
    cv.save()
    cv.rotate(ang, x, y - s * .72)
    cv.drawPath(rrp(x - s * .62, y - s * .8, x + s * .5, y - s * .66, s * .06), paint('#FF6B4A'))
    cv.drawPath(poly([(x - s * .62, y - s * .84), (x - s * .78, y - s * .62), (x - s * .5, y - s * .62)]), paint(NAVY2))
    cv.drawCircle(x + s * .5, y - s * .66, s * .13, paint('#FFD23F'))
    cv.restore()
    cv.drawPath(poly([(x - s * .68, y - s * .66 + math.sin(math.radians(ang)) * s * .3), (x - s * .68, y - s * .16)], False), paint(NAVY2, stroke=s * .05))


def solar_farm(cv, x, y, s):
    pill_shadow(cv, x, y + 2, s * 2.2, s * .22, TEAL_D, 255)
    for row in range(2):
        for col in range(3):
            px = x + (col - 1) * s * .62 + (row - .5) * s * .12
            py = y - row * s * .34 - s * .1
            pts = [(px - s * .26, py), (px + s * .26, py), (px + s * .3, py - s * .26), (px - s * .22, py - s * .26)]
            cv.drawPath(poly(pts), paint('#2A55D8'))
            cv.drawPath(poly(pts), paint('#8CB4FF', 150, stroke=max(.8, s * .025)))
            cv.drawPath(poly([(px - s * .02, py), (px + s * .04, py - s * .26)], False), paint('#8CB4FF', 150, stroke=max(.8, s * .025)))
            gloss_line(cv, px - s * .18, py - s * .2, px - s * .08, py - s * .2, max(1.2, s * .04), 220)
    plus(cv, x + s * .9, y - s * .9, s * .22, '#FFFFFF')
    cv.drawCircle(x + s * .9, y - s * .9, s * .1, paint('#FFD23F'))


def suit_man(cv, x, y, s):
    pill_shadow(cv, x, y + 1, s * .9, s * .16, TEAL_D, 255)
    for sd in (-1, 1):
        cv.drawPath(rrp(x + sd * s * .09 - s * .07, y - s * .55, x + sd * s * .09 + s * .07, y - s * .06, s * .03), paint('#10135A'))
        cv.drawOval(R(x + sd * s * .11 - s * .1, y - s * .08, x + sd * s * .11 + s * .1, y + s * .01), paint('#0A0A33'))
    shaded(cv, rrp(x - s * .22, y - s * 1.0, x + s * .22, y - s * .5, s * .07), '#1A1E76', dark('#1A1E76', .3), dx=-s * .03, dy=0)
    cv.drawPath(poly([(x - s * .07, y - s * 1.0), (x + s * .07, y - s * 1.0), (x, y - s * .72)]), paint('#FFFFFF'))
    cv.drawPath(poly([(x - s * .03, y - s * .94), (x + s * .03, y - s * .94), (x + s * .045, y - s * .7), (x, y - s * .64), (x - s * .045, y - s * .7)]), paint('#E8335B'))
    cv.drawPath(poly([(x - s * .24, y - s * .95), (x - s * .3, y - s * .55)], False), paint('#1A1E76', stroke=s * .1))
    cv.drawPath(poly([(x + s * .24, y - s * .95), (x + s * .3, y - s * .52)], False), paint('#1A1E76', stroke=s * .1))
    cv.drawPath(rrp(x + s * .24, y - s * .5, x + s * .56, y - s * .26, s * .04), paint('#8A4A2A'))
    cv.drawPath(rrp(x + s * .34, y - s * .55, x + s * .46, y - s * .5, s * .02), paint('#5A2E18'))
    for hx in (x - s * .3, x + s * .3):
        cv.drawCircle(hx, y - s * .52, s * .06, paint('#FFAC7E'))
    cv.drawCircle(x, y - s * 1.14, s * .17, paint('#FFAC7E'))
    cv.drawPath(poly([(x - s * .17, y - s * 1.2), (x - s * .1, y - s * 1.33), (x + s * .12, y - s * 1.31), (x + s * .17, y - s * 1.18), (x + s * .1, y - s * 1.24), (x - s * .08, y - s * 1.24)]), paint('#2B2B6B'))
    for ex in (-.06, .06):
        cv.drawCircle(x + ex * s, y - s * 1.14, s * .02, paint(INK))
    gloss_line(cv, x - s * .1, y - s * 1.28, x + s * .02, y - s * 1.3, max(1, s * .03), 220)


def flamingo(cv, x, y, s, t, ph, flip=False):
    cv.save()
    if flip:
        cv.translate(x, 0)
        cv.scale(-1, 1)
        cv.translate(-x, 0)
    pk, pk_d = '#FF6FA0', '#E8456E'
    pill_shadow(cv, x, y + 2, s * .8, s * .12, '#0F8E88', 200)
    cv.drawPath(poly([(x - s * .02, y - s * .52), (x - s * .02, y)], False), paint('#FF8AB0', stroke=max(1.4, s * .04)))
    leg = skia.Path()
    leg.moveTo(x + s * .08, y - s * .52)
    leg.lineTo(x + s * .22, y - s * .34)
    leg.lineTo(x + s * .08, y - s * .26)
    cv.drawPath(leg, paint('#FF8AB0', stroke=max(1.4, s * .04)))
    sway = math.sin(t * 1.8 + ph) * s * .05
    neck = skia.Path()
    neck.moveTo(x + s * .18, y - s * .74)
    neck.cubicTo(x + s * .36, y - s * .82, x + s * .1 + sway, y - s * 1.0, x + s * .28 + sway, y - s * 1.24)
    cv.drawPath(neck, paint(pk_d, stroke=max(2, s * .12)))
    cv.drawPath(neck, paint(pk, stroke=max(1.6, s * .09)))
    shaded(cv, op(x - s * .32, y - s * .8, x + s * .28, y - s * .46), pk, pk_d, dx=-s * .03, dy=-s * .03)
    cv.drawPath(poly([(x - s * .3, y - s * .66), (x - s * .5, y - s * .6), (x - s * .3, y - s * .54)]), paint(pk_d))
    wing = skia.Path()
    wing.moveTo(x - s * .22, y - s * .68)
    wing.quadTo(x - s * .02, y - s * .52, x + s * .16, y - s * .66)
    cv.drawPath(wing, paint('#FFB3CE', stroke=max(1.2, s * .05)))
    hx_, hy_ = x + s * .28 + sway, y - s * 1.26
    cv.drawCircle(hx_, hy_, s * .075, paint(pk))
    cv.drawPath(poly([(hx_ + s * .05, hy_ - s * .03), (hx_ + s * .17, hy_ + s * .04), (hx_ + s * .05, hy_ + s * .06)]), paint('#FFC9DA'))
    cv.drawPath(poly([(hx_ + s * .11, hy_ - s * .0), (hx_ + s * .17, hy_ + s * .04), (hx_ + s * .1, hy_ + s * .06)]), paint('#10135A'))
    cv.drawCircle(hx_ + s * .02, hy_ - s * .02, max(.8, s * .018), paint('#10135A'))
    cv.restore()


def redwood(cv, x, y, s):
    pill_shadow(cv, x, y + 1, s * .8, s * .16, '#0F6E56', 255)
    cv.drawPath(rrp(x - s * .09, y - s * .6, x + s * .09, y, s * .03), paint('#A8452B'))
    top = y - s * 1.9
    for i in range(5):
        by = y - s * .35 - i * s * .3
        hw = s * (.56 - i * .095)
        cv.drawPath(poly([(x - hw, by), (x, by - s * .5), (x, by)]), paint('#34B574'))
        cv.drawPath(poly([(x, by - s * .5), (x + hw, by), (x, by)]), paint('#1F8A5B'))
    cv.drawPath(poly([(x - s * .06, top + s * .1), (x, top - s * .05), (x + s * .06, top + s * .1)]), paint('#34B574'))


def redwood_grove(cv, x, y, s):
    for dx_, dy_, k in ((-.6, .22, .85), (.65, .16, .8), (0, 0, 1.15)):
        redwood(cv, x + dx_ * s, y + dy_ * s, s * k)


def bison(cv, x, y, s, flip=False):
    cv.save()
    if flip:
        cv.translate(x, 0)
        cv.scale(-1, 1)
        cv.translate(-x, 0)
    pill_shadow(cv, x, y + 1, s * 1.1, s * .16, '#0F6E56', 220)
    for lx in (-.3, -.1, .2, .38):
        cv.drawPath(rrp(x + lx * s - s * .045, y - s * .34, x + lx * s + s * .045, y, s * .02), paint('#3E2012'))
    shaded(cv, op(x - s * .5, y - s * .8, x + s * .42, y - s * .3), '#6B3A22', dark('#6B3A22', .35), dx=-s * .03, dy=-s * .03)
    shaded(cv, cp(x + s * .22, y - s * .68, s * .3), '#5A2E1A', dark('#5A2E1A', .35), dx=-s * .03, dy=-s * .03)
    cv.drawCircle(x + s * .5, y - s * .44, s * .2, paint('#3E2012'))
    cv.drawCircle(x + s * .5, y - s * .38, s * .26, paint('#4A2616', 200))
    cv.drawPath(poly([(x + s * .6, y - s * .62), (x + s * .66, y - s * .74), (x + s * .62, y - s * .56)]), paint('#F2E6C8'))
    cv.drawCircle(x + s * .56, y - s * .46, max(.8, s * .025), paint('#F2E6C8'))
    cv.drawPath(poly([(x - s * .5, y - s * .58), (x - s * .62, y - s * .3)], False), paint('#3E2012', stroke=max(1.2, s * .05)))
    cv.restore()


def cow(cv, x, y, s, flip=False):
    cv.save()
    if flip:
        cv.translate(x, 0)
        cv.scale(-1, 1)
        cv.translate(-x, 0)
    pill_shadow(cv, x, y + 1, s * 1.0, s * .15, '#0F6E56', 220)
    for lx in (-.28, -.1, .16, .32):
        cv.drawPath(rrp(x + lx * s - s * .04, y - s * .32, x + lx * s + s * .04, y, s * .02), paint('#E8EAF5'))
    body = op(x - s * .48, y - s * .72, x + s * .4, y - s * .28)
    shaded(cv, body, '#FFFFFF', '#CFD3EC', dx=-s * .03, dy=-s * .03)
    cv.save()
    cv.clipPath(body, skia.ClipOp.kIntersect, True)
    cv.drawCircle(x - s * .2, y - s * .55, s * .13, paint('#1D1A3A'))
    cv.drawCircle(x + s * .15, y - s * .42, s * .1, paint('#1D1A3A'))
    cv.drawCircle(x - s * .42, y - s * .38, s * .09, paint('#1D1A3A'))
    cv.restore()
    cv.drawOval(R(x + s * .3, y - s * .66, x + s * .62, y - s * .36), paint('#FFFFFF'))
    cv.drawOval(R(x + s * .5, y - s * .5, x + s * .66, y - s * .38), paint('#FFB3C7'))
    cv.drawCircle(x + s * .46, y - s * .56, max(.7, s * .022), paint('#1D1A3A'))
    cv.drawOval(R(x + s * .3, y - s * .7, x + s * .4, y - s * .6), paint('#1D1A3A'))
    cv.drawPath(poly([(x + s * .4, y - s * .68), (x + s * .44, y - s * .78)], False), paint('#F2E6C8', stroke=max(1, s * .04)))
    cv.drawOval(R(x - s * .08, y - s * .3, x + s * .08, y - s * .22), paint('#FFB3C7'))
    cv.restore()


def kanye(cv, x, y, s):
    """Flat stylised figure: all-black outfit, bald, two eyes, goatee."""
    skin = '#B8683F'
    beard = '#2A1A12'
    pill_shadow(cv, x, y + 1, s * .8, s * .14, TEAL_D, 255)
    for sd in (-1, 1):
        cv.drawPath(rrp(x + sd * s * .09 - s * .07, y - s * .55, x + sd * s * .09 + s * .07, y - s * .06, s * .03), paint('#15152B'))
        cv.drawOval(R(x + sd * s * .1 - s * .1, y - s * .08, x + sd * s * .1 + s * .1, y + s * .01), paint('#0A0A18'))
    shaded(cv, rrp(x - s * .24, y - s * 1.0, x + s * .24, y - s * .5, s * .08), '#22223C', '#15152B', dx=-s * .03, dy=0)
    cv.drawPath(poly([(x - s * .25, y - s * .93), (x - s * .32, y - s * .52)], False), paint('#22223C', stroke=s * .11))
    cv.drawPath(poly([(x + s * .25, y - s * .93), (x + s * .32, y - s * .52)], False), paint('#22223C', stroke=s * .11))
    for hx in (x - s * .32, x + s * .32):
        cv.drawCircle(hx, y - s * .5, s * .06, paint(skin))
    cv.drawPath(poly([(x - s * .12, y - s * .96), (x, y - s * .84), (x + s * .12, y - s * .96)], False), paint('#FFD23F', stroke=max(1, s * .03)))
    hy, hr = y - s * 1.16, s * .2
    shaded(cv, cp(x, hy, hr), skin, dark(skin, .25), dx=-s * .025, dy=-s * .025)
    for sd in (-1, 1):                                     # two eyes + brows
        cv.drawOval(R(x + sd * hr * .42 - hr * .1, hy - hr * .18, x + sd * hr * .42 + hr * .1, hy + hr * .06), paint('#FFFFFF'))
        cv.drawCircle(x + sd * hr * .42, hy - hr * .06, max(.9, hr * .075), paint(INK))
        cv.drawPath(poly([(x + sd * hr * .24, hy - hr * .3), (x + sd * hr * .6, hy - hr * .32)], False), paint(beard, stroke=max(1, hr * .09)))
    cv.save()
    cv.clipPath(cp(x, hy, hr), skia.ClipOp.kIntersect, True)
    cv.drawOval(R(x - hr * .34, hy + hr * .38, x + hr * .34, hy + hr * 1.0), paint(beard))                 # goatee
    mo = skia.Path()
    mo.moveTo(x - hr * .42, hy + hr * .36)
    mo.quadTo(x, hy + hr * .2, x + hr * .42, hy + hr * .36)
    cv.drawPath(mo, paint(beard, stroke=max(1.2, hr * .13)))                                                # moustache
    cv.drawPath(poly([(x - hr * .14, hy + hr * .5), (x + hr * .14, hy + hr * .5)], False), paint('#7A3A28', stroke=max(.8, hr * .07)))
    cv.restore()
    gloss_line(cv, x - s * .12, hy - s * .14, x - s * .03, hy - s * .17, max(1, s * .03), 200)


def carti(cv, x, y, s):
    """Flat stylised figure: tall, thin, dark outfit, long red dreads hanging down, sunglasses."""
    skin = '#9A5A3A'
    pill_shadow(cv, x, y + 1, s * .7, s * .14, TEAL_D, 255)
    for sd in (-1, 1):
        cv.drawPath(rrp(x + sd * s * .07 - s * .05, y - s * .62, x + sd * s * .07 + s * .05, y - s * .06, s * .03), paint('#15152B'))
        cv.drawOval(R(x + sd * s * .09 - s * .09, y - s * .08, x + sd * s * .09 + s * .09, y + s * .01), paint('#E01818'))
    shaded(cv, rrp(x - s * .2, y - s * 1.08, x + s * .2, y - s * .56, s * .07), '#1D1A3A', '#15152B', dx=-s * .03, dy=0)
    cv.drawPath(poly([(x - s * .2, y - s * 1.0), (x - s * .27, y - s * .58)], False), paint('#1D1A3A', stroke=s * .09))
    cv.drawPath(poly([(x + s * .2, y - s * 1.0), (x + s * .27, y - s * .58)], False), paint('#1D1A3A', stroke=s * .09))
    for hx in (x - s * .27, x + s * .27):
        cv.drawCircle(hx, y - s * .56, s * .05, paint(skin))
    cv.drawPath(poly([(x - s * .1, y - s * 1.02), (x, y - s * .9), (x + s * .1, y - s * 1.02)], False), paint('#FFD23F', stroke=max(1, s * .025)))
    hy, hr = y - s * 1.2, s * .16
    red, red_d = '#E01818', '#A80F0F'
    # dreads hanging behind the shoulders, then the head, then the dreads framing the face
    for k_, off in enumerate((-.2, -.12, .12, .2)):
        ln = .26 - (k_ % 2) * .04
        p = skia.Path()
        p.moveTo(x + off * s * .9, hy - hr * .6)
        p.quadTo(x + off * s * 1.9 + (-1) ** k_ * s * .02, hy + s * ln * .45, x + off * s * 1.45, hy + s * ln)
        cv.drawPath(p, paint(red_d, stroke=max(1.8, s * .07)))
    shaded(cv, cp(x, hy, hr), skin, dark(skin, .25), dx=-s * .02, dy=-s * .02)
    cv.save()
    cv.clipPath(cp(x, hy, hr), skia.ClipOp.kIntersect, True)
    cv.drawRect(R(x - hr * 1.2, hy - hr * 1.3, x + hr * 1.2, hy - hr * .5), paint(red))                       # fringe
    cv.restore()
    cv.drawCircle(x, hy - hr * .95, hr * .85, paint(red))                                                     # crown of hair
    cv.drawRect(R(x - hr * .8, hy - hr * .95, x + hr * .8, hy - hr * .45), paint(red))
    cv.drawPath(rrp(x - hr * .95, hy - hr * .22, x + hr * .95, hy + hr * .22, hr * .2), paint('#15152B'))     # shades
    for k_, off in enumerate((-.22, -.15, .15, .22)):
        ln = .30 - (k_ % 2) * .04
        p = skia.Path()
        p.moveTo(x + off * s, hy - hr * .5)
        p.quadTo(x + off * s * 1.6 + (-1) ** k_ * s * .015, hy + s * ln * .5, x + off * s * 1.3, hy + s * ln)
        cv.drawPath(p, paint(red, stroke=max(1.8, s * .075)))
        cv.drawCircle(x + off * s * 1.3, hy + s * ln, max(1, s * .036), paint(red_d))
    gloss_line(cv, x - hr * .6, hy - hr * 1.15, x - hr * .1, hy - hr * 1.2, max(1, s * .03), 200)


def dc_monument(cv, x, y, s):
    pill_shadow(cv, x, y + 1, s * .8, s * .14, TEAL_D, 255)
    cv.drawPath(poly([(x - s * .14, y), (x - s * .08, y - s * 2.0), (x, y - s * 2.3), (x, y)]), paint('#F3F7FF'))
    cv.drawPath(poly([(x, y - s * 2.3), (x + s * .08, y - s * 2.0), (x + s * .14, y), (x, y)]), paint('#C9D6FF'))
    cv.drawCircle(x, y - s * 2.3, max(1, s * .05), paint('#E01818'))


def trump(cv, x, y, s):
    """Flat stylised figure: dark suit, long red tie, pale yellow swept quiff."""
    skin, hair = '#FFA977', '#F7E58A'
    pill_shadow(cv, x, y + 1, s * .85, s * .15, TEAL_D, 255)
    for sd in (-1, 1):
        cv.drawPath(rrp(x + sd * s * .09 - s * .075, y - s * .55, x + sd * s * .09 + s * .075, y - s * .06, s * .03), paint('#10135A'))
        cv.drawOval(R(x + sd * s * .11 - s * .1, y - s * .08, x + sd * s * .11 + s * .1, y + s * .01), paint('#0A0A33'))
    shaded(cv, rrp(x - s * .27, y - s * 1.02, x + s * .27, y - s * .46, s * .08), '#1B1F8F', dark('#1B1F8F', .3), dx=-s * .03, dy=0)
    cv.drawPath(poly([(x - s * .27, y - s * .96), (x - s * .33, y - s * .52)], False), paint('#1B1F8F', stroke=s * .11))
    cv.drawPath(poly([(x + s * .27, y - s * .96), (x + s * .33, y - s * .52)], False), paint('#1B1F8F', stroke=s * .11))
    for hx in (x - s * .33, x + s * .33):
        cv.drawCircle(hx, y - s * .5, s * .06, paint(skin))
    cv.drawPath(poly([(x - s * .09, y - s * 1.0), (x + s * .09, y - s * 1.0), (x, y - s * .74)]), paint('#FFFFFF'))
    cv.drawPath(poly([(x - s * .035, y - s * .94), (x + s * .035, y - s * .94), (x + s * .055, y - s * .52), (x, y - s * .44), (x - s * .055, y - s * .52)]), paint('#E01818'))
    hy, hr = y - s * 1.2, s * .19
    shaded(cv, cp(x, hy, hr), skin, dark(skin, .25), dx=-s * .02, dy=-s * .02)
    for sd in (-1, 1):
        cv.drawOval(R(x + sd * hr * .42 - hr * .09, hy - hr * .16, x + sd * hr * .42 + hr * .09, hy + hr * .06), paint('#FFFFFF'))
        cv.drawCircle(x + sd * hr * .42, hy - hr * .05, max(.9, hr * .07), paint(INK))
    cv.drawPath(poly([(x - hr * .2, hy + hr * .46), (x + hr * .2, hy + hr * .46)], False), paint('#A8452B', stroke=max(.9, hr * .08)))
    q = skia.Path()                                        # side-swept fringe combed across the forehead
    q.moveTo(x - hr * 1.02, hy - hr * .02)
    q.cubicTo(x - hr * 1.3, hy - hr * 1.5, x + hr * .6, hy - hr * 1.9, x + hr * 1.18, hy - hr * .9)
    q.lineTo(x + hr * 1.02, hy - hr * .05)
    q.cubicTo(x + hr * .55, hy - hr * .72, x - hr * .05, hy - hr * .5, x - hr * .6, hy - hr * .28)
    q.cubicTo(x - hr * .82, hy - hr * .22, x - hr * .95, hy - hr * .12, x - hr * 1.02, hy - hr * .02)
    q.close()
    shaded(cv, q, hair, dark(hair, .25), dx=-s * .02, dy=-s * .02)
    qh = skia.Path()
    qh.moveTo(x + hr * .95, hy - hr * .55)
    qh.cubicTo(x + hr * .4, hy - hr * 1.05, x - hr * .3, hy - hr * .95, x - hr * .7, hy - hr * .5)
    cv.drawPath(qh, paint('#FFF6C8', 230, stroke=max(1, hr * .11)))
    qh2 = skia.Path()
    qh2.moveTo(x - hr * .5, hy - hr * 1.3)
    qh2.quadTo(x + hr * .3, hy - hr * 1.7, x + hr * .9, hy - hr * 1.2)
    cv.drawPath(qh2, paint('#FFFFFF', 190, stroke=max(1, hr * .1)))


def dennys(cv, x, y, s):
    pill_shadow(cv, x, y + 1, s * 2.2, s * .2, TEAL_D, 255)
    shaded(cv, rrp(x - s * .9, y - s * .75, x + s * .7, y, s * .06), '#FFF1C8', dark('#FFF1C8', .3), dx=-s * .04, dy=0)
    cv.drawPath(rrp(x - s * .96, y - s * .9, x + s * .76, y - s * .7, s * .05), paint('#E8335B'))
    for wx in (-.7, -.2):
        cv.drawPath(rrp(x + wx * s, y - s * .55, x + (wx + .38) * s, y - s * .22, s * .04), paint('#61E7ED'))
    cv.drawPath(rrp(x + s * .3, y - s * .55, x + s * .52, y, s * .03), paint('#8A4A2A'))
    cv.drawPath(rrp(x + s * .9, y - s * 1.7, x + s * .96, y, s * .02), paint('#4A45A8'))
    shaded(cv, rrp(x + s * .5, y - s * 2.25, x + s * 1.4, y - s * 1.6, s * .08), '#FFD23F', dark('#FFD23F', .3), dx=-s * .03, dy=-s * .03)
    text(cv, "Denny's", x + s * .95, y - s * 1.92, font('bold', s * .28), '#E8335B')


def pine_snow(cv, x, y, s):
    cv.drawPath(rrp(x - s * .05, y - s * .25, x + s * .05, y, s * .02), paint('#6B3A22'))
    for i in range(3):
        by = y - s * .18 - i * s * .32
        hw = s * (.42 - i * .1)
        cv.drawPath(poly([(x - hw, by), (x, by - s * .55), (x + hw, by)]), paint('#1F8A5B'))
        cv.drawPath(poly([(x - hw * .62, by - s * .2), (x, by - s * .55), (x + hw * .62, by - s * .2), (x + hw * .3, by - s * .13), (x, by - s * .22), (x - hw * .3, by - s * .13)]), paint('#FFFFFF'))


def ice_floe(cv, x, y, s, t, ph):
    bob = math.sin(t * 1.3 + ph) * s * .04
    cv.drawPath(poly([(x - s * .6, y + bob + s * .1), (x - s * .35, y + bob - s * .12), (x + s * .3, y + bob - s * .15), (x + s * .62, y + bob + s * .08),
                      (x + s * .3, y + bob + s * .24), (x - s * .3, y + bob + s * .22)]), paint('#9BDDF2'))
    cv.drawPath(poly([(x - s * .55, y + bob + s * .05), (x - s * .32, y + bob - s * .16), (x + s * .28, y + bob - s * .18), (x + s * .56, y + bob + s * .02),
                      (x + s * .2, y + bob + s * .08), (x - s * .3, y + bob + s * .08)]), paint('#EAF8FF'))


def peach(cv, cx, cy, s):
    """Flat peach emoji: round fruit, soft blush, cleft, leaf."""
    body = skia.Path()
    body.addCircle(cx - .1 * s, cy + .04 * s, .44 * s)
    body.addCircle(cx + .1 * s, cy + .04 * s, .44 * s)
    cv.drawPath(body, paint('#FF8A65'))
    cv.save()
    cv.clipPath(body, skia.ClipOp.kIntersect, True)
    cv.drawCircle(cx + .3 * s, cy + .3 * s, .5 * s, paint('#FF5C7A', 200))
    cv.drawCircle(cx - .32 * s, cy - .3 * s, .3 * s, paint('#FFB08A', 160))
    cv.restore()
    cleft = skia.Path()
    cleft.moveTo(cx - .01 * s, cy - .4 * s)
    cleft.quadTo(cx + .1 * s, cy + .05 * s, cx - .01 * s, cy + .46 * s)
    cv.drawPath(cleft, paint('#D93F5A', stroke=.055 * s))
    leaf = skia.Path()
    leaf.moveTo(cx + .02 * s, cy - .42 * s)
    leaf.quadTo(cx + .2 * s, cy - .74 * s, cx + .5 * s, cy - .6 * s)
    leaf.quadTo(cx + .32 * s, cy - .36 * s, cx + .02 * s, cy - .42 * s)
    cv.drawPath(leaf, paint('#3FB866'))
    cv.drawPath(poly([(cx + .06 * s, cy - .44 * s), (cx + .38 * s, cy - .56 * s)], False), paint('#2C9A52', stroke=.03 * s))
    cv.drawPath(poly([(cx - .01 * s, cy - .4 * s), (cx - .05 * s, cy - .58 * s)], False), paint('#7A4A2A', stroke=.06 * s))
    gloss_arc(cv, cx - .1 * s, cy + .02 * s, .32 * s, 205, 50, .06 * s)


# ------------------------------------------------------------------ pin + peach badge
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
    head = skia.Path()
    head.addCircle(x, y - 78, 38)
    tail = poly([(x - 31, y - 60), (x, y), (x + 31, y - 60)])
    body = skia.Op(head, tail, skia.PathOp.kUnion_PathOp)
    shaded(cv, body, '#E8335B', dark('#E8335B', .3), dx=-7, dy=-6)
    cv.drawCircle(x, y - 78, 15, paint('#FFFFFF'))
    gloss_arc(cv, x, y - 78, 27, 200, 50, 6)
    cv.restore()


def peach_badge(cv, x, y, k):
    """Round white badge with the peach emoji, attached to the pin head."""
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
    peach(cv, x, y + 4, 92)
    cv.restore()


# ------------------------------------------------------------------ scene 1: the map
REGION_PATHS = [(smooth_path(p), c, b) for p, c, b in REGIONS]
LAKE_PATHS = [smooth_path(p) for p in LAKES]
SNOW_PATHS = [smooth_path(p) for p in SNOW]
RIVER_PATHS = []
for _r in RIVERS:
    _pp = skia.Path()
    for _i, _p in enumerate(_r):
        _x, _y = proj(*_p)
        (_pp.moveTo if _i == 0 else _pp.lineTo)(_x, _y)
    RIVER_PATHS.append(_pp)
OKEE = proj(-80.85, 26.95)


def draw_land(cv, t, k, d):
    for path_, c, sc_ in ((CUBA_PATH, TEAL, TEAL_D), (US_PATH, '#46D39A', '#1E9A78')):
        cv.save()
        cv.translate(0, d)
        cv.drawPath(path_, paint(sc_))
        cv.restore()
        cv.drawPath(path_, paint(c))
    for (lon, lat), rx, ry in BAHAMAS:
        bx, by = proj(lon, lat)
        cv.drawOval(R(bx - rx * .42, by - ry * .42 + d, bx + rx * .42, by + ry * .42 + d), paint(TEAL_D))
        cv.drawOval(R(bx - rx * .42, by - ry * .42, bx + rx * .42, by + ry * .42), paint(TEAL))
    cv.save()
    cv.clipPath(US_PATH, skia.ClipOp.kIntersect, True)
    for path_, c, b in REGION_PATHS:
        cv.drawPath(path_, paint(c, 255, blur=b))
    for pts_ in SNOW_PATHS:
        cv.drawPath(pts_, paint('#EAF8FF', 235, blur=9))
    for lon, lat in DUNES:                                   # dune ripples in the deserts
        x_, y_ = proj(lon, lat)
        for q in range(3):
            p = skia.Path()
            p.moveTo(x_ - 12 + q * 5, y_ + q * 6)
            p.quadTo(x_ - 4 + q * 5, y_ - 6 + q * 6, x_ + 6 + q * 5, y_ + q * 6)
            cv.drawPath(p, paint('#D9A441', 200, stroke=2.2 / max(1, k * .5)))
    for lp in LAKE_PATHS:
        cv.drawPath(lp, paint('#1C4BC8'))
        cv.drawPath(lp, paint('#61E7ED', 150, stroke=2.4 / max(1, k * .6)))
    for rp in RIVER_PATHS:
        cv.drawPath(rp, paint('#4FD6F0', 255, stroke=3.0 / max(1, k * .6)))
    cv.restore()


def draw_florida(cv, t, k, d, fl):
    cv.save()
    cv.translate(0, d)
    cv.drawPath(FL_PATH, paint('#1E9A78', A(255 * fl)))
    cv.restore()
    cv.drawPath(FL_PATH, paint('#3FD07A', A(255 * fl)))
    cv.save()
    cv.clipPath(FL_PATH, skia.ClipOp.kIntersect, True)
    cv.drawPath(FL_PATH, paint('#FFE29A', A(255 * fl), stroke=13 / k))                       # beach rim
    cv.drawPath(smooth_path(REGIONS[-1][0]), paint('#2FA79A', A(255 * fl), blur=7))
    ox, oy = OKEE
    cv.drawOval(R(ox - 9, oy - 7, ox + 9, oy + 7), paint('#1C4BC8', A(255 * fl)))
    cv.restore()
    cv.drawPath(FL_PATH, paint('#FFD23F', A(255 * fl), stroke=3.2 / k))


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
    draw_land(cv, t, k, d)
    fl = ease(prog(t, T_ZOOM0 + .5, T_ZOOM1))
    draw_florida(cv, t, k, d, fl)
    cv.drawPath(poly(BORDER_PTS, False), paint('#0F8E88', 255, stroke=3.2 / k))
    # mountain clusters (back to front by latitude)
    peaks = []
    for name, lst in RANGES.items():
        for lon, lat, sz in lst:
            peaks.append((proj(lon, lat), sz, name))
    for (x_, y_), sz, name in sorted(peaks, key=lambda p: p[0][1]):
        if name == 'apps':
            mountain(cv, x_, y_, sz, False, ('#7DBB6A', '#5E9A52'))
        else:
            mountain(cv, x_, y_, sz * .95, sz > 13)
    for lon, lat in SNOW_PINES:
        x_, y_ = proj(lon, lat)
        pine_snow(cv, x_, y_, 15)
    for lon, lat in REDWOODS:
        x_, y_ = proj(lon, lat)
        redwood_grove(cv, x_, y_, 19)
    # icons
    for (lon, lat) in PUMPJACKS:
        x_, y_ = proj(lon, lat)
        pumpjack(cv, x_, y_, 19, t, lon)
    for lon, lat, sc_ in SOLAR:
        x_, y_ = proj(lon, lat)
        solar_farm(cv, x_, y_, 30 * sc_)
    for nm, lon, lat in CITIES:
        x_, y_ = proj(lon, lat)
        city_icon(cv, x_, y_, 21)
    for lon, lat, fp in BISON:
        x_, y_ = proj(lon, lat)
        bison(cv, x_, y_, 28, fp)
    for lon, lat, fp in CATTLE:
        x_, y_ = proj(lon, lat)
        cow(cv, x_, y_, 20, fp)
    x_, y_ = proj(-88.9, 41.6)
    kanye(cv, x_, y_, 36)
    x_, y_ = proj(-85.6, 33.5)
    carti(cv, x_, y_, 38)
    x_, y_ = proj(-83.2, 40.1)
    dennys(cv, x_, y_, 19)
    x_, y_ = proj(-77.0, 38.9)
    dc_monument(cv, x_, y_, 15)
    x_, y_ = proj(-78.3, 38.6)
    trump(cv, x_, y_, 40)
    x_, y_ = proj(*MAN_LL)
    suit_man(cv, x_, y_, 38)
    for lon, lat, ph, fp in sorted(FLAMINGOS, key=lambda f: f[1], reverse=True):
        x_, y_ = proj(lon, lat)
        flamingo(cv, x_, y_, 26, t, ph, fp)
    for k_, (lon, lat) in enumerate(ICE_FLOES):
        x_, y_ = proj(lon, lat)
        ice_floe(cv, x_, y_, 26, t, k_ * 1.3)
    cv.restore()
    cv.restore()
    # labels (screen space)
    la = ease(prog(t, T_ZOOM1 - .8, T_ZOOM1 - .2))
    if la > 0:
        for s_, lon, lat in (('GULF OF MEXICO', -83.75, 26.2), ('ATLANTIC OCEAN', -78.0, 29.3)):
            x_, y_ = to_screen(proj(lon, lat), cam)
            text(cv, s_, x_, y_, font('semi', 24), '#BFE9FF', A(180 * la), track=4)
        x_, y_ = to_screen(proj(-82.6, 29.6), cam)
        w = font('bold', 38).measureText('FLORIDA') + 36
        cv.drawPath(rrp(x_ - w / 2, y_ - 30, x_ + w / 2, y_ + 30, 14), paint('#000000', A(175 * la)))
        text(cv, 'FLORIDA', x_, y_, font('bold', 38), '#FFFFFF', A(255 * la), track=6)
    # pin + peach badge at Miami
    mx, my = to_screen(MIAMI_XY, cam)
    pk = eback(prog(t, T_PIN, T_PIN + .5), 1.7)
    map_pin(cv, mx, my, pk, t)
    bk = eback(prog(t, T_BADGE, T_BADGE + .5), 1.7)
    peach_badge(cv, mx + 150, my - 250, bk)
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
        scene_chart(cv, t - DT)
        if wipe < 1:
            cv.restore()
            cv.drawCircle(cx_, cy_, 2300 * ease(wipe), paint(YEL, 230, stroke=12))
    subtitle(cv, t, 1.2, 7.3, "The game's setting is based on Miami,\nthe {hl:BBL capital} of America", cy=1480)
    subtitle(cv, t, 8.0, 99, "As such, there are more characters\nwith BBLs than any other game\nin the series", cy=1490, fade_out=False)
    fade = 1 - prog(t, 0, .3)
    if fade > 0:
        cv.drawRect(R(0, 0, W, H), paint('#000000', 255 * fade))


if __name__ == '__main__':
    run('gta6_bbl_map_chart', DUR, draw)
