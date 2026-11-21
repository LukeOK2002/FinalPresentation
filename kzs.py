"""Style layer for the reels: Kurzgesagt-like flat saturated look matched to the reference images.

Importing this module patches the shared kz toolkit (shading palette, faces, hair gloss, subtitles) and adds
helpers: sparkles, halos, sunbursts, pill shadows, glossy highlights, label tags and arrow axes.
Use `from kzs import *` instead of `from kz import *`.
"""
import os, sys, colorsys
SK = '/root/.claude/skills/synced/4e0ea4d7-c568-4bbf-ae1d-e23fce685fc3_d1ab2ef0-75cd-4219-be4f-f884141ad564/kurzgesagt-reel'
sys.path.insert(0, SK + '/scripts')
sys.path.insert(0, SK + '/examples')
import kz
from kz import *

# ------------------------------------------------------------------ palette sampled from the references
NAVY0, NAVY1, NAVY2 = '#010127', '#0B1052', '#1A1E76'
YEL, YEL_D, YEL_DD = '#FEBF00', '#F5A800', '#E89A00'
TEAL, TEAL_D, CYAN, SKYB = '#01D1AF', '#00B3B0', '#61E7ED', '#38C6FF'
MAG, MAG_D, PURP, LAV = '#C4007A', '#5C0059', '#9F35C4', '#9D7AEC'
PINK, RED, ORANGE, GOLD, GREEN, PERI = '#FF4FA0', '#E8335B', '#EF7010', '#F7C246', '#5EBA53', '#5B6BFF'
PANEL_L, PANEL_R = '#261B5F', '#143980'


def A(x):
    return int(clamp(x, 0, 255))


def _rgb(c):
    if isinstance(c, str):
        c = c.lstrip('#')
        return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))
    return tuple(c[:3])


def dark(c, f=.2):
    """Darker but *more saturated* (flat illustration shading), not a grey/purple mix."""
    r, g, b = [v / 255 for v in _rgb(c)]
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    s = min(1.0, s * (1 + f * .8))
    v = v * (1 - f * 1.05)
    return tuple(int(x * 255) for x in colorsys.hsv_to_rgb(h, s, v))


def light(c, f=.2):
    r, g, b = [v / 255 for v in _rgb(c)]
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    s = s * (1 - f * .7)
    v = min(1.0, v + f * .7)
    return tuple(int(x * 255) for x in colorsys.hsv_to_rgb(h, s, v))


kz.dark, kz.light = dark, light
INK = (20, 22, 78)
kz.INK = INK
kz.SUBC.update({'hl': '#FFD23F', 'red': '#FF6B8A', 'od': '#FFD23F'})


# ------------------------------------------------------------------ faces: dot eyes, flat blush circles, thick brows
def face(cv, x, y, r, f, sp):
    lx, ly = f.get('look', (0, 0))
    bl = f.get('blush', 1)
    if bl:
        bc = f.get('blushc', (255, 100, 120))
        for s in (-1, 1):
            cv.drawCircle(x + s * .56 * r, y + .34 * r, .16 * r * (.8 + .22 * min(bl, 1.6)), paint(bc, A(110 + 75 * min(bl, 1.5))))
    if sp.get('freckles'):
        for s in (-1, 1):
            for fx, fy in ((.42, .22), (.53, .30), (.64, .22), (.5, .16)):
                cv.drawCircle(x + s * fx * r, y + fy * r, .025 * r, paint((214, 128, 92), 200))
    ex = .34 * r
    ey = y + .06 * r
    kind = f.get('eyes', 'open')
    brows = f.get('brows', ((0, 0), (0, 0)))
    for i, s in enumerate((-1, 1)):
        cx = x + s * ex + lx * .07 * r
        cy = ey + ly * .07 * r
        if kind == 'happy':
            p = skia.Path()
            p.moveTo(cx - .11 * r, cy + .04 * r)
            p.quadTo(cx, cy - .13 * r, cx + .11 * r, cy + .04 * r)
            cv.drawPath(p, paint(INK, stroke=.07 * r))
        else:
            sz = 1.3 if kind == 'wide' else 1.0
            sq = f.get('squint', 0)
            ow, oh = .072 * r * sz, .098 * r * sz * (1 - .45 * sq)
            cv.drawOval(R(cx - ow, cy - oh, cx + ow, cy + oh), paint(INK))
        ang, rs = brows[i]
        bx = x + s * .36 * r
        by = y - .25 * r - rs * r
        a = math.radians(ang)
        pin = (bx - s * .14 * r * math.cos(a), by + .14 * r * math.sin(a))
        pout = (bx + s * .14 * r * math.cos(a), by - .14 * r * math.sin(a))
        bc = sp.get('brow', dark(sp['hair'], .25))
        cv.drawPath(poly([pin, pout], close=False), paint(bc, stroke=.08 * r))
    my = y + .40 * r
    m = f.get('mouth', .6)
    mo = f.get('mopen', 0)
    w = .17 * r
    if mo > 0.01:
        p = skia.Path()
        p.moveTo(x - w * 1.1, my - .02 * r)
        p.cubicTo(x - w, my + .32 * r * mo, x + w, my + .32 * r * mo, x + w * 1.1, my - .02 * r)
        p.quadTo(x, my + .03 * r, x - w * 1.1, my - .02 * r)
        p.close()
        cv.save()
        cv.clipPath(p, skia.ClipOp.kIntersect, True)
        cv.drawPath(p, paint((120, 20, 70)))
        cv.drawCircle(x, my + .3 * r * mo, .13 * r, paint((255, 100, 120)))
        cv.restore()
    elif f.get('wavy'):
        p = skia.Path()
        p.moveTo(x - w, my)
        n = 4
        for k in range(n):
            x1 = x - w + (k + .5) * 2 * w / n
            x2 = x - w + (k + 1) * 2 * w / n
            p.quadTo(x1, my + (.05 if k % 2 else -.05) * r, x2, my)
        cv.drawPath(p, paint(INK, stroke=.06 * r))
    else:
        if m < 0:
            w *= .85
        p = skia.Path()
        p.moveTo(x - w, my)
        p.quadTo(x, my + m * .17 * r, x + w, my)
        cv.drawPath(p, paint(INK, stroke=.065 * r))
    if sp.get('glasses'):
        for s in (-1, 1):
            cv.drawCircle(x + s * ex, ey, .17 * r, paint(INK, stroke=.045 * r))
        cv.drawPath(poly([(x - ex + .17 * r, ey), (x + ex - .17 * r, ey)], False), paint(INK, stroke=.045 * r))


kz.face = face

# ------------------------------------------------------------------ glossy white highlight on hair (reference look)
_orig_front_hair = kz._front_hair


def gloss_arc(cv, cx, cy, rad, a0, sweep, w, a=235):
    cv.drawArc(R(cx - rad, cy - rad, cx + rad, cy + rad), a0, sweep, False, paint('#FFFFFF', a, stroke=w))


def _front_hair_gloss(cv, x, y, r, sp):
    _orig_front_hair(cv, x, y, r, sp)
    if sp.get('nikki'):
        return
    if sp['style'] in ('short', 'buzz', 'curly', 'bun'):
        gloss_arc(cv, x, y, 1.0 * r, 205, 42, .075 * r)
        gloss_arc(cv, x, y, 1.0 * r, 253, 9, .075 * r)


kz._front_hair = _front_hair_gloss


# ------------------------------------------------------------------ decoration helpers
def plus(cv, x, y, s, c='#FFFFFF', a=255):
    """Four-point 'plus' sparkle from the reference."""
    if s <= 0:
        return
    cv.drawPath(rrp(x - s, y - s * .17, x + s, y + s * .17, s * .17), paint(c, a))
    cv.drawPath(rrp(x - s * .17, y - s, x + s * .17, y + s, s * .17), paint(c, a))


def sparkle_field(cv, t, seed=3, n=46, y0=0, y1=1920, dots=True):
    rng = random.Random(seed)
    cols = ['#FF4F7A', '#4F6BFF', '#FFFFFF', '#FF8AD0', '#61E7ED']
    for i in range(n):
        x, y = rng.uniform(10, 1070), rng.uniform(y0, y1)
        kind = rng.random()
        ph = rng.uniform(0, 6.28)
        tw = .65 + .35 * math.sin(t * rng.uniform(1.5, 3.5) + ph)
        if kind < .26:
            plus(cv, x, y, rng.uniform(8, 18) * tw, '#FFFFFF', 235)
        elif dots:
            cv.drawCircle(x, y, rng.uniform(2.5, 6) * (.6 + .4 * tw), paint(rng.choice(cols), 210))


def halos(cv, x, y, r0, n=4, step=70, c='#1A1E76', a=70):
    for i in range(n, 0, -1):
        cv.drawCircle(x, y, r0 + i * step, paint(c, a))


def sunburst(cv, x, y, t, c='#FFFFFF', a=34, n=18, rad=2400, spin=.03):
    for i in range(n):
        a0 = (i / n) * 2 * math.pi + t * spin
        a1 = a0 + math.pi / n
        cv.drawPath(poly([(x, y), (x + math.cos(a0) * rad, y + math.sin(a0) * rad),
                          (x + math.cos(a1) * rad, y + math.sin(a1) * rad)]), paint(c, a))


def pill_shadow(cv, x, y, w, h, c='#00B3B0', a=255):
    cv.drawPath(rrp(x - w / 2, y - h / 2, x + w / 2, y + h / 2, h / 2), paint(c, a))


def gloss_line(cv, x0, y0, x1, y1, w, a=235):
    cv.drawPath(poly([(x0, y0), (x1, y1)], False), paint('#FFFFFF', a, stroke=w))


def gloss_rrect(cv, l, t, r, b, w=6):
    """Short white highlight stroke + dot along the top-left inside edge of a rounded shape."""
    h = b - t
    gloss_line(cv, l + w * 2.4, t + h * .2, l + w * 2.4, t + h * .45, w)
    cv.drawCircle(l + w * 2.4, t + h * .56, w * .55, paint('#FFFFFF', 235))


def tag(cv, x, y, w, h, label, c, size=None, tc='#FFFFFF', a=255):
    """Flat label tag like 'Fast Spread' in the chart reference."""
    cv.drawPath(rrp(x, y + 5, x + w, y + h + 5, 8), paint(dark(c, .35), a))
    cv.drawPath(rrp(x, y, x + w, y + h, 8), paint(c, a))
    text(cv, label, x + w / 2, y + h / 2, font('bold', size or h * .56), tc, a)


def arrow_axis(cv, x0, y0, x1, y1, c=PERI, w=8, head=24):
    cv.drawPath(poly([(x0, y0), (x1, y1)], False), paint(c, 255, stroke=w, cap='butt'))
    ang = math.atan2(y1 - y0, x1 - x0)
    tip = (x1 + math.cos(ang) * head * .6, y1 + math.sin(ang) * head * .6)
    l = (x1 - math.cos(ang) * head * .4 + math.cos(ang + math.pi / 2) * head * .62,
         y1 - math.sin(ang) * head * .4 + math.sin(ang + math.pi / 2) * head * .62)
    r_ = (x1 - math.cos(ang) * head * .4 + math.cos(ang - math.pi / 2) * head * .62,
          y1 - math.sin(ang) * head * .4 + math.sin(ang - math.pi / 2) * head * .62)
    cv.drawPath(poly([tip, l, r_]), paint(c, 255))


# ------------------------------------------------------------------ subtitles: white text in a translucent black box (chart reference)
def subtitle(cv, t, a, b, s, cy=1430, size=56, fade_out=True):
    if not (a <= t < b):
        return
    lines = parse(s)
    if len(lines) >= 3:
        size *= .9
    lh = size * 1.34
    y0 = cy - (len(lines) - 1) * lh / 2
    out = 1 - ein(prog(t, b - .3, b)) if fade_out else 1
    for i, toks in enumerate(lines):
        sz = size

        def fnt(sz_):
            return font('semi', sz_)
        wtot = sum(fnt(sz).measureText(tx) for tx, st in toks)
        if wtot > 920:
            sz *= 920 / wtot
            wtot = 920
        ap = eout(prog(t, a + .08 * i, a + .08 * i + .4))
        al = 255 * ap * out
        y = y0 + i * lh + (1 - ap) * 20
        x = W / 2 - wtot / 2
        cv.drawPath(rrp(x - 26, y - sz * .72, x + wtot + 26, y + sz * .58, 14), paint('#000000', A(185 * ap * out)))
        for tx, st in toks:
            f = fnt(sz)
            base = y + sz * .35
            cv.drawString(tx, x, base, f, paint(kz.SUBC.get(st, '#fff'), al))
            x += f.measureText(tx)


kz.subtitle = subtitle


def boxed_lines(cv, alpha, cy, n_lines, size, pad=30, w=980):
    """Translucent dark box behind a block of title text."""
    lh = size * 1.28
    h = n_lines * lh + pad
    cv.drawPath(rrp(W / 2 - w / 2, cy - h / 2, W / 2 + w / 2, cy + h / 2, 18), paint('#000000', A(175 * alpha)))
