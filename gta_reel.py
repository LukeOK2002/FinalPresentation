import os, sys
SK = '/root/.claude/skills/synced/4e0ea4d7-c568-4bbf-ae1d-e23fce685fc3_d1ab2ef0-75cd-4219-be4f-f884141ad564/kurzgesagt-reel'
sys.path.insert(0, SK + '/scripts')
sys.path.insert(0, SK + '/examples')
from kz import *
from phone_misunderstanding import phone_back, steam, sofa_front

DUR = 5.2
NF, NR = 1300, 115
PHONE_Y = NF - 2.12 * NR

# ------------------------------------------------------------------ cast
BOY = dict(skin=(238, 190, 160), hair='#3A2418', style='short', top='#E3A83B', pants='#3A4678',
           shoes='#ECECF4', hoodie=True)
# girlfriend: stylised after Nikki from Obsession (long dark hair, warm skin, pink top)
GIRL = dict(skin=(226, 176, 142), hair='#12080A', style='long', top='#E9D6B8', pants='#3A3470',
            shoes='#F2F2FA', nikki=True)
CREAM = '#E9D6B8'

import kz


def lock_path(hx, hy, r, sd):
    """Long front lock that hugs the cheek and jaw (keeps the face narrow) and falls over the shoulder."""
    p = skia.Path()
    p.moveTo(hx + sd * .6 * r, hy - .5 * r)
    p.cubicTo(hx + sd * .72 * r, hy - .1 * r, hx + sd * .66 * r, hy + .5 * r, hx + sd * .4 * r, hy + .94 * r)
    p.cubicTo(hx + sd * .34 * r, hy + 1.2 * r, hx + sd * .5 * r, hy + 1.6 * r, hx + sd * .56 * r, hy + 1.85 * r)
    p.quadTo(hx + sd * .8 * r, hy + 2.0 * r, hx + sd * 1.0 * r, hy + 1.78 * r)
    p.cubicTo(hx + sd * 1.14 * r, hy + 1.0 * r, hx + sd * 1.18 * r, hy + .1 * r, hx + sd * .9 * r, hy - .62 * r)
    p.close()
    return p


def nikki_hair_cap(cv, hx, hy, r, hc):
    """Hair on top of the head with smooth curtain bangs opening from a part."""
    cv.save()
    cv.clipPath(cp(hx, hy, r * 1.07), skia.ClipOp.kIntersect, True)
    E = skia.Path()
    E.addOval(R(hx - 1.3 * r, hy - 1.55 * r, hx + 1.3 * r, hy))
    C = skia.Path()
    C.moveTo(hx - .05 * r, hy - .98 * r)
    C.cubicTo(hx - .2 * r, hy - .85 * r, hx - .62 * r, hy - .55 * r, hx - .84 * r, hy - .02 * r)
    C.lineTo(hx - .84 * r, hy + .3 * r)
    C.lineTo(hx + .84 * r, hy + .3 * r)
    C.lineTo(hx + .82 * r, hy - .04 * r)
    C.cubicTo(hx + .55 * r, hy - .6 * r, hx + .18 * r, hy - .88 * r, hx - .05 * r, hy - .98 * r)
    C.close()
    hair = skia.Op(E, C, skia.PathOp.kDifference_PathOp)
    shaded(cv, hair, hc, dark(hc, .25), dx=-.06 * r, dy=-.08 * r)
    for sd in (-1, 1):
        hl = skia.Path()
        hl.moveTo(hx + sd * .1 * r, hy - 1.1 * r)
        hl.cubicTo(hx + sd * .3 * r, hy - 1.0 * r, hx + sd * .75 * r, hy - .7 * r, hx + sd * .95 * r, hy - .15 * r)
        cv.drawPath(hl, paint('#5A3A3E', 75, stroke=.05 * r))
    cv.drawPath(poly([(hx - .05 * r, hy - 1.15 * r), (hx - .05 * r, hy - .96 * r)], False), paint('#5A3A3E', 130, stroke=.03 * r))
    cv.restore()


_orig_front_hair = kz._front_hair


def _front_hair_nikki(cv, x, y, r, sp):
    if not sp.get('nikki'):
        return _orig_front_hair(cv, x, y, r, sp)
    hc = sp['hair']
    for sd in (-1, 1):
        shaded(cv, lock_path(x, y, r, sd), hc, dark(hc, .25), dx=-.05 * r * sd, dy=-.05 * r)
    nikki_hair_cap(cv, x, y, r, hc)


kz._front_hair = _front_hair_nikki

# ------------------------------------------------------------------ story data
MSG = [("hey, dinner's ready", .2), ("babe?", .65), ("are you ignoring me", 1.1), ("it's been 3 hours", 1.55),
       ("HELLO??", 2.0), ("seriously?", 3.0), ("I'm going to bed", 3.6), ("enjoy your game.", 4.2)]
T = [m[1] for m in MSG]
CRASH = [1.2, 3.8]
SPLIT_A, SPLIT_B = 2.5, 3.2


def A(x):
    return int(clamp(x, 0, 255))


def turn(t):
    return math.sin(t * 1.3) * .6 + math.sin(t * 2.9 + 1) * .4


def shake_amp(t):
    s = 0
    for c in CRASH:
        a = t - c
        if 0 <= a < .5:
            s = max(s, (1 - a / .5) ** 2)
    return s


def pulse(t):
    s = 0
    for tt in T:
        a = t - tt
        if 0 <= a < .6:
            s = max(s, (1 - a / .6) ** 2)
    return s


def buzz(t):
    s = 0
    for tt in T:
        a = t - tt
        if 0 <= a < .35:
            s = max(s, (1 - a / .35) * math.sin(t * 70))
    return s


def count_at(t):
    return sum(1 for tt in T if t >= tt)


def keyf(t, keys):
    if t <= keys[0][0]:
        return keys[0][1]
    for (a, va), (b, vb) in zip(keys, keys[1:]):
        if t < b:
            return lerp(va, vb, ease(prog(t, a, b)))
    return keys[-1][1]


# ------------------------------------------------------------------ GTA 6 game screen (local 700x394)
SKY = [(0, (27, 15, 78)), (.35, (122, 42, 138)), (.7, (255, 111, 142)), (1, (255, 179, 107))]


def sky_col(y, h=205):
    u = clamp(y / h)
    for (a, ca), (b, cb) in zip(SKY, SKY[1:]):
        if u <= b:
            return mix(ca, cb, (u - a) / (b - a))
    return SKY[-1][1]


_rb = random.Random(7)
BUILD = [(_rb.randint(40, 120), _rb.randint(26, 44)) for _ in range(26)]


def star_path(cx, cy, r):
    pts = []
    for i in range(10):
        rr = r if i % 2 == 0 else r * .45
        a = -math.pi / 2 + i * math.pi / 5
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return poly(pts)


def palm(cv, x, base, h, sway, s, c='#120830'):
    top = (x + 18 * s * 0 + sway * 6 + 26 * s, base - h)
    p = skia.Path()
    p.moveTo(x, base)
    p.quadTo(x + 4 * s, base - h * .55, top[0], top[1])
    cv.drawPath(p, paint(c, stroke=14 * s))
    for ang in (-170, -135, -100, -60, -25, 10, 35):
        a = math.radians(ang)
        wob = math.sin(sway * 2 + ang) * 4 * s
        q = skia.Path()
        q.moveTo(*top)
        q.quadTo(top[0] + math.cos(a) * 55 * s, top[1] + math.sin(a) * 40 * s - 28 * s + wob,
                 top[0] + math.cos(a) * 100 * s, top[1] + math.sin(a) * 55 * s + 22 * s + wob)
        cv.drawPath(q, paint(c, stroke=8 * s))


def game_screen(cv, t, logo=True):
    tr = turn(t)
    sh = shake_amp(t)
    cv.save()
    cv.translate(math.sin(t * 61) * 9 * sh, math.cos(t * 53) * 7 * sh)
    cv.drawRect(R(-20, -20, 720, 420), paint(shader=lin(0, 0, 0, 205, [sky_col(0), sky_col(70), sky_col(145), sky_col(205)])))
    vx = 350 + tr * 60
    sx = 350 + tr * 25
    glow(cv, sx, 170, 240, '#FF7AA0', 90, mid=1)
    cv.save()
    cv.clipPath(cp(sx, 150, 82), skia.ClipOp.kIntersect, True)
    cv.drawRect(R(sx - 90, 60, sx + 90, 240), paint(shader=lin(0, 68, 0, 232, ['#FFE08A', '#FF8E7A', '#FF4F8A'])))
    for j in range(7):
        y = 150 + j * 11
        cv.drawRect(R(sx - 90, y, sx + 90, y + 2 + j * 1.5), paint(sky_col(y)))
    cv.restore()
    # skyline
    for i, (bh, bw) in enumerate(BUILD):
        bx = -20 + i * 30 + tr * 10
        cv.drawRect(R(bx, 205 - bh, bx + bw, 207), paint('#3A1B6B'))
        for j in range(int(bh / 16)):
            if (i * 3 + j) % 3:
                cv.drawRect(R(bx + 6, 205 - bh + 8 + j * 15, bx + 11, 205 - bh + 13 + j * 15),
                            paint('#FF9FD0' if (i + j) % 2 else '#FFD66B', 190))
    # ground and road
    cv.drawRect(R(-20, 205, 720, 420), paint(shader=lin(0, 205, 0, 394, ['#4A1A6A', '#2A1048'])))
    bx = 350 - tr * 40
    road = poly([(vx - 12, 205), (vx + 12, 205), (bx + 330, 394), (bx - 330, 394)])
    cv.drawPath(road, paint(shader=lin(0, 205, 0, 394, ['#3B3560', '#26223F'])))
    for sd in (-1, 1):
        cv.drawPath(poly([(vx + sd * 12, 205), (bx + sd * 330, 394)], False), paint('#FF9FD0', 200, stroke=3))
    sp = 1.6
    for i in range(9):
        u = ((i + t * sp) % 9) / 9
        z = u ** 2.1
        y = 205 + 189 * z
        cx_ = lerp(vx, bx, z)
        wd = 1 + 9 * z
        ln = 4 + 40 * z
        cv.drawRect(R(cx_ - wd / 2, y, cx_ + wd / 2, y + ln), paint('#FFE9B5', 220))
    # palms
    palm(cv, 60 + tr * 6, 394, 250, math.sin(t * 1.6), 1.0)
    palm(cv, 650 + tr * 6, 394, 280, math.sin(t * 1.4 + 1), 1.1)
    palm(cv, 160, 300, 120, math.sin(t * 1.8 + 2), .5, '#1E0E40')
    palm(cv, 560, 296, 130, math.sin(t * 1.5), .5, '#1E0E40')
    # car (rear view)
    cx_ = 350 + tr * 45
    cy_ = 372 + math.sin(t * 40) * 1.6
    cv.save()
    cv.rotate(-tr * 5, cx_, cy_)
    cv.drawOval(R(cx_ - 78, cy_ - 4, cx_ + 78, cy_ + 14), paint('#05031a', 150, blur=6))
    shaded(cv, rrp(cx_ - 46, cy_ - 76, cx_ + 46, cy_ - 38, 14), '#B8343F', dx=-4, dy=-4)
    cv.drawPath(rrp(cx_ - 36, cy_ - 68, cx_ + 36, cy_ - 44, 9), paint('#241B4A'))
    shaded(cv, rrp(cx_ - 66, cy_ - 50, cx_ + 66, cy_, 15), '#E5484D', dx=-6, dy=-6)
    cv.drawPath(rrp(cx_ - 72, cy_ - 54, cx_ + 72, cy_ - 46, 4), paint('#8E2430'))
    for sd in (-1, 1):
        glow(cv, cx_ + sd * 50, cy_ - 24, 40, '#FF3B3B', 150)
        cv.drawPath(rrp(cx_ + sd * 50 - 15, cy_ - 32, cx_ + sd * 50 + 15, cy_ - 16, 5), paint('#FF6B6B'))
        cv.drawPath(rrp(cx_ + sd * 58 - 8, cy_ - 4, cx_ + sd * 58 + 8, cy_ + 10, 3), paint('#15112A'))
    cv.drawPath(rrp(cx_ - 20, cy_ - 14, cx_ + 20, cy_ - 4, 3), paint('#F3F2FA'))
    cv.restore()
    # police lights
    fl = int(t * 3) % 2
    glow(cv, 0, 394, 260, '#FF3B3B', 55 if fl else 10)
    glow(cv, 700, 394, 260, '#3B7BFF', 10 if fl else 55)
    # HUD
    cv.save()
    cv.clipPath(cp(62, 334, 40), skia.ClipOp.kIntersect, True)
    cv.drawRect(R(20, 290, 110, 380), paint(shader=lin(0, 290, 0, 380, ['#17405C', '#0E2438'])))
    for (x1, y1, x2, y2) in ((20, 322, 110, 340), (50, 290, 70, 380), (20, 360, 110, 350), (92, 290, 80, 380)):
        cv.drawPath(poly([(x1, y1), (x2, y2)], False), paint('#9FD4FF', 110, stroke=5))
    cv.drawPath(poly([(62, 322), (72, 346), (62, 341), (52, 346)]), paint('#FFFFFF'))
    cv.restore()
    cv.drawCircle(62, 334, 40, paint('#FFFFFF', 230, stroke=4))
    for i in range(5):
        on = i < 3
        c = '#FFC94A' if on else '#FFFFFF'
        if i == 3 and fl:
            c = '#FF5A6A'
        cv.drawPath(star_path(566 + i * 28, 34, 12), paint(c, 255 if (on or (i == 3 and fl)) else 90))
    text(cv, '$48,200', 680, 72, font('bold', 24), '#8BE08B', anchor='r', shadow=4)
    if logo:
        lg = 1 - ein(prog(t, .55, .95))
        if lg > 0:
            cv.drawRect(R(-20, -20, 720, 420), paint('#12082E', 150 * lg))
            text(cv, 'GTA VI', 356, 186, font('bold', 118), '#B0357A', 255 * lg, track=6)
            text(cv, 'GTA VI', 350, 180, font('bold', 118), '#FFE9B8', 255 * lg, track=6)
    cv.restore()


def tv_popout(cv, t, box, k):
    if k <= 0:
        return
    l, tp, r_, b = box
    cx, cy = (l + r_) / 2, (tp + b) / 2
    cv.save()
    s = eback(k, 1.3)
    cv.translate(cx, cy + math.sin(t * 1.4) * 3)
    cv.scale(s, s)
    cv.translate(-cx, -cy)
    glow(cv, cx, cy, (r_ - l) * .95, '#7FC4FF', 85)
    cv.drawPath(rrp(l - 6, tp + 12, r_ + 6, b + 28, 22), paint('#05031a', 150, blur=22))
    bz = (r_ - l) * .022
    shaded(cv, rrp(l - bz, tp - bz, r_ + bz, b + bz, 18), '#14162C', dx=-5, dy=-5)
    scr = rrp(l, tp, r_, b, 10)
    cv.save()
    cv.clipPath(scr, skia.ClipOp.kIntersect, True)
    cv.translate(l, tp)
    sc = (r_ - l) / 700
    cv.scale(sc, sc)
    game_screen(cv, t)
    cv.restore()
    cv.restore()


# ------------------------------------------------------------------ boy's room (design coords, floor = 1300)
def controller(cv, x, y, s, rot, t):
    """Controller seen from behind: its back faces the viewer, the grips hang down into his hands."""
    cv.save()
    cv.rotate(rot, x, y)
    for sd in (-1, 1):
        gx, gy = x + sd * .66 * s, y + .02 * s
        cv.save()
        cv.rotate(-sd * 12, gx, gy)
        shaded(cv, rrp(gx - .19 * s, gy, gx + .19 * s, gy + .72 * s, .19 * s), '#2C3050', dx=-4, dy=-3)
        cv.restore()
    shaded(cv, rrp(x - .86 * s, y - .22 * s, x + .86 * s, y + .22 * s, .2 * s), '#363B62', dx=-5, dy=-5)
    cv.drawPath(rrp(x - .3 * s, y - .14 * s, x + .3 * s, y + .12 * s, .08 * s), paint('#2A2E4E'))
    for sd in (-1, 1):
        a_, b_ = sorted((x + sd * .28 * s, x + sd * .78 * s))
        cv.drawPath(rrp(a_, y - .31 * s, b_, y - .2 * s, .05 * s), paint('#4F5588'))
    cv.restore()


def boy_arms(dy=0, jl=0, jr=0, sad=0):
    return [((-1.05, -1.5 + .15 * sad), (-.68, -1.72 + dy + jl)), ((1.05, -1.5 + .15 * sad), (.68, -1.72 + dy + jr))]


def boy_hands(cv, dy, jl, jr):
    skin = BOY['skin']
    for sd, j in ((-1, jl), (1, jr)):
        hx, hy = 540 + sd * .68 * NR, NF + (-1.72 + dy + j) * NR
        for k in range(3):   # fingers wrapped round the grip
            shaded(cv, rrp(hx - .17 * NR, hy + k * .11 * NR, hx + .17 * NR, hy + (.1 + k * .11) * NR, .05 * NR),
                   skin, dark(skin, .2), dx=-2, dy=-2)
        hand(cv, hx, hy - .05 * NR, .2 * NR, skin)


def boy_legs(cv):
    """Seated legs: short foreshortened lap, slim shins, small rounded knees (drawn before the torso)."""
    pants, shoes = BOY['pants'], BOY['shoes']
    x, yf, r = 540, NF, NR
    shaded(cv, rrp(x - .6 * r, yf - 1.42 * r, x + .6 * r, yf - .86 * r, .16 * r), pants, dx=0, dy=-.05 * r)
    for sd in (-1, 1):
        shaded(cv, rrp(x + sd * .35 * r - .17 * r, yf - 1.02 * r, x + sd * .35 * r + .17 * r, yf - .1 * r, .13 * r),
               pants, dx=-.05 * r, dy=0)
        shaded(cv, op(x + sd * .38 * r - .27 * r, yf - .26 * r, x + sd * .38 * r + .27 * r, yf + .02 * r),
               shoes, dx=-.05 * r, dy=-.06 * r)


def boy_figure(cv, t):
    tr = turn(t)
    crash = None
    for c in CRASH:
        if 0 <= t - c < 1.4:
            crash = t - c
    if crash is not None and crash < .5:
        fc = dict(eyes='wide', mouth=.2, mopen=.95, look=(0, -.3), brows=((-14, .1), (-14, .1)), blush=.4)
    elif crash is not None and crash < 1.3:
        fc = dict(eyes='happy', mouth=.9, mopen=.7 + .15 * math.sin(t * 18), blush=.7)
    else:
        fc = dict(eyes='open', squint=.2, look=(tr * .8, -.3), mouth=.5,
                  mopen=.12 + .1 * (.5 + .5 * math.sin(t * 5)), brows=((9, 0), (9, 0)), blush=.35)
    jl = math.sin(t * 17) * .035
    jr = math.sin(t * 17 + 2) * .035

    def held(cv_):
        controller(cv_, 540, NF - 2.0 * NR, NR, tr * 7, t)
        boy_hands(cv_, 0, jl, jr)
    boy_legs(cv)
    person(cv, 540, NF, NR, BOY, dict(legs=None, arms=boy_arms(0, jl, jr), face=fc, held=held, hands=False,
                                      tilt=tr * 3.5, lift=math.sin(t * 3) * .015))
    c = mix('#7FC4FF', '#FF8AB0', .5 + .5 * math.sin(t * 1.7))
    glow(cv, 540, NF - 3.75 * NR, 1.3 * NR, c, 26, mid=1)


def boy_notifs(cv, t):
    px, base = 860, 1302
    pul, bz = pulse(t), buzz(t)
    x = px + bz * 4
    n = count_at(t)
    glow(cv, x, base - 80, 320, '#9FD4FF', 35 + 95 * pul, mid=1)
    for tt in T:
        a = (t - tt) / .6
        if 0 <= a < 1:
            cv.drawCircle(x, base - 85, 40 + 150 * ease(a), paint('#9FD4FF', 170 * (1 - a), stroke=4))
    cv.save()
    cv.rotate(bz * 2.5, x, base)
    cv.drawOval(R(x - 52, base - 6, x + 52, base + 8), paint('#05031a', 130, blur=6))
    shaded(cv, rrp(x - 44, base - 158, x + 44, base, 14), '#262A44', dx=-4, dy=-4)
    scr = rrp(x - 37, base - 150, x + 37, base - 10, 9)
    cv.drawPath(scr, paint(shader=lin(0, base - 150, 0, base - 10, [mix('#2A3A8A', '#CFEBFF', pul * .8), mix('#6A3A9A', '#9FD4FF', pul * .8)])))
    for i in range(min(n, 4)):
        cv.drawPath(rrp(x - 30, base - 130 + i * 24, x + 30, base - 112 + i * 24, 5), paint('#FFFFFF', 200))
    cv.restore()
    if n:
        bx_, by_ = x + 40, base - 158
        cv.drawCircle(bx_, by_, 17, paint('#FF3B3B'))
        text(cv, str(n), bx_, by_ - 1, font('bold', 20), '#FFFFFF')
    if bz:
        for sd in (-1, 1):
            for r_ in (62, 80):
                cv.drawPath(poly([(x + sd * r_, base - 100), (x + sd * (r_ + 8), base - 85), (x + sd * r_, base - 70)], False),
                            paint('#FFFFFF', 150 * abs(bz), stroke=4))
    # cards
    nn = len(T)
    for i in range(nn):
        if t < T[i]:
            continue
        pop = prog(t, T[i], T[i] + .3)
        shift = sum(ease(prog(t, T[j], T[j] + .25)) for j in range(i + 1, nn))
        al = clamp(4.0 - shift) * clamp(pop * 3)
        if al <= 0:
            continue
        top = 1030 - 96 * shift
        sc = eback(pop, 1.4)
        cv.save()
        cv.translate(860, top + 42)
        cv.scale(sc, sc)
        cv.translate(-860, -(top + 42))
        cv.drawPath(rrp(866 - 170, top + 10, 866 + 170, top + 94, 22), paint('#05031a', 95 * al, blur=10))
        cv.drawPath(rrp(690, top, 1030, top + 84, 22), paint('#F6F5FF', A(245 * al)))
        cv.drawPath(rrp(708, top + 19, 754, top + 65, 12), paint('#38C172', A(255 * al)))
        cv.drawPath(rrp(714, top + 27, 748, top + 51, 8), paint('#FFFFFF', A(255 * al)))
        cv.drawPath(poly([(720, top + 49), (719, top + 58), (729, top + 50)]), paint('#FFFFFF', A(255 * al)))
        text(cv, 'Babe', 768, top + 28, font('bold', 22), '#272448', A(255 * al), anchor='l')
        text(cv, MSG[i][0], 768, top + 58, font('med', 21), '#4A4870', A(255 * al), anchor='l')
        text(cv, 'now', 1016, top + 26, font('med', 17), '#8A88AA', A(255 * al), anchor='r')
        cv.restore()


def boy_scene(cv, t):
    cv.drawRect(R(-700, -1500, 1800, 1190), paint(shader=lin(0, 300, 0, 1190, ['#0E1238', '#202760'])))
    ledc = mix('#7A5CFF', '#FF4FA3', .5 + .5 * math.sin(t * 1.1))
    cv.drawRect(R(-700, 630, 1800, 690), paint(ledc, 60, blur=24))
    cv.drawRect(R(-700, 653, 1800, 661), paint(ledc))
    # plant
    shaded(cv, rrp(100, 1110, 170, 1220, 12), '#E9E4F4', dx=-4, dy=-4)
    for k, (ox, oy, rr_) in enumerate(((-26, -150, 40), (26, -168, 38), (0, -215, 40), (-36, -230, 30), (34, -250, 28))):
        shaded(cv, cp(135 + ox + math.sin(t * .9 + k) * 2, 1125 + oy * .55, rr_), '#4FB874', dx=-5, dy=-5)
    # floor + rug
    cv.drawRect(R(-700, 1190, 1800, 2300), paint(shader=lin(0, 1190, 0, 1920, ['#2A2052', '#140B2A', '#0A0618'])))
    cv.drawRect(R(-700, 1186, 1800, 1196), paint('#3A2D6A'))
    cv.drawOval(R(160, 1270, 920, 1380), paint('#3E2E70'))
    cv.drawOval(R(190, 1280, 890, 1370), paint('#4A3884', stroke=6))
    # TV light wash on the room
    c = mix('#7FC4FF', '#FF8AB0', .5 + .5 * math.sin(t * 1.7))
    glow(cv, 540, 900, 900, c, 30, mid=1)
    # sofa back
    shaded(cv, rrp(250, 880, 830, 1170, 60), '#6B3E8E', dx=-10, dy=-10)
    for cx_ in (335, 745):
        shaded(cv, rrp(cx_ - 72, 915, cx_ + 72, 1080, 40), '#7D4CA0', dx=-6, dy=-6)
    sofa_front(cv)          # seat front first, so his legs sit in front of the cushion
    boy_figure(cv, t)
    # coffee table + cans
    for lx in (700, 988):
        cv.drawPath(rrp(lx - 7, 1326, lx + 7, 1400, 3), paint('#3A2150'))
    shaded(cv, rrp(660, 1300, 1030, 1332, 10), '#8B5A8E', dx=-6, dy=-5)
    for cx_, c in ((730, '#E5484D'), (770, '#3FB6A8')):
        shaded(cv, rrp(cx_ - 13, 1258, cx_ + 13, 1303, 5), c, dx=-4, dy=-3)
        cv.drawPath(rrp(cx_ - 9, 1264, cx_ + 9, 1270, 3), paint('#FFFFFF', 170))
    boy_notifs(cv, t)


# ------------------------------------------------------------------ girl's room
def chat_phone(cv, t, box):
    l, tp, r_, b = box
    cx, cy = (l + r_) / 2, (tp + b) / 2
    k = eback(prog(t, SPLIT_A + .15, SPLIT_A + .6), 1.3)
    if k <= 0:
        return
    cv.save()
    cv.translate(cx, cy)
    cv.scale(k, k)
    cv.translate(-cx, -cy)
    glow(cv, cx, cy, 340, '#FF9FC8', 55)
    cv.drawPath(rrp(l - 4, tp + 10, r_ + 4, b + 22, 38), paint('#05031a', 140, blur=18))
    shaded(cv, rrp(l - 12, tp - 12, r_ + 12, b + 12, 42), '#1B1D33', dx=-4, dy=-4)
    scr = rrp(l, tp, r_, b, 32)
    cv.save()
    cv.clipPath(scr, skia.ClipOp.kIntersect, True)
    cv.drawPath(scr, paint('#F3F2FA'))
    n = len(T)
    base_y = b - 92
    BH, GAP = 36, 18
    font_b = font('med', 16)
    for i in range(n):
        if t < T[i]:
            continue
        pop = eback(prog(t, T[i], T[i] + .2), 1.3)
        off = sum(ease(prog(t, T[j], T[j] + .2)) for j in range(i + 1, n)) * (BH + GAP)
        yb = base_y - off
        w = font_b.measureText(MSG[i][0]) + 26
        bx1 = r_ - 14
        cv.save()
        cv.translate(bx1, yb)
        cv.scale(pop, pop)
        cv.translate(-bx1, -yb)
        cv.drawPath(rrp(bx1 - w, yb - BH, bx1, yb, 17), paint(shader=lin(0, yb - BH, 0, yb, ['#FF7FB4', '#E8548F'])))
        text(cv, MSG[i][0], bx1 - w / 2, yb - BH / 2, font_b, '#FFFFFF')
        cv.restore()
        if i == max(j for j in range(n) if t >= T[j]):
            text(cv, 'Delivered', bx1, yb + 13, font('med', 12), '#8A88AA', A(255 * prog(t, T[i] + .2, T[i] + .4)), anchor='r')
    cv.drawRect(R(l, tp, r_, tp + 66), paint('#FFFFFF'))
    cv.drawRect(R(l, tp + 66, r_, tp + 68), paint('#E4E2F0'))
    cv.drawCircle(l + 34, tp + 38, 17, paint('#E8B07A'))
    cv.drawOval(R(l + 22, tp + 20, l + 46, tp + 34), paint('#3A2418'))
    text(cv, 'Babe', l + 62, tp + 38, font('bold', 20), '#272448', anchor='l')
    # input bar
    cv.drawRect(R(l, b - 70, r_, b), paint('#FFFFFF'))
    cv.drawPath(rrp(l + 14, b - 58, r_ - 58, b - 18, 20), paint('#E9E7F4'))
    cv.drawCircle(r_ - 32, b - 38, 19, paint('#E8548F'))
    cv.drawPath(poly([(r_ - 39, b - 46), (r_ - 24, b - 38), (r_ - 39, b - 30)]), paint('#FFFFFF'))
    for tt in T:
        a = prog(t, tt - .4, tt - .03)
        if 0 < a < 1 and t < tt:
            cv.drawPath(rrp(l + 26, b - 44, l + 26 + (r_ - l - 120) * a, b - 32, 6), paint('#9A98B8'))
    cv.restore()
    cv.drawPath(rrp(cx - 40, tp + 6, cx + 40, tp + 22, 8), paint('#1B1D33'))
    cv.restore()


def typing_amp(t):
    for tt in T:
        if tt - .4 <= t < tt:
            return 1.0
    return .12


ANGER = [(2.4, .15), (3.0, .4), (3.6, .66), (4.2, .92), (4.8, 1.0)]


def anger_mark(cv, x, y, s):
    for i in range(4):
        a = math.radians(45 + i * 90)
        ox, oy = math.cos(a) * 15 * s, math.sin(a) * 15 * s
        cv.drawArc(R(x + ox - 15 * s, y + oy - 15 * s, x + ox + 15 * s, y + oy + 15 * s),
                   math.degrees(a) + 180 - 55 - 90 + 90, 110, False, paint('#FF4A5A', stroke=6 * s))


def girl_body(cv, x, yf, r, lift, tilt, front=True):
    """Bare shoulders, cream ruched off-shoulder knit and thin gold pendant."""
    U = lambda px, py: (x + px * r, yf + py * r)
    hy = yf + (-3.85 + lift) * r
    skin = GIRL['skin']
    cv.save()
    cv.rotate(tilt, x, hy + 1.1 * r)
    cv.clipPath(cp(x, hy, r), skia.ClipOp.kDifference, True)
    cv.rotate(-tilt, x, hy + 1.1 * r)
    shaded(cv, rrp(*U(-.92, -3.02 + lift), *U(.92, -2.45 + lift), .42 * r), skin, dark(skin, .16), dx=-.04 * r, dy=-.05 * r)
    if front:
        for sd in (-1, 1):
            cb = skia.Path()
            cb.moveTo(*U(sd * .08, -2.74 + lift))
            cb.quadTo(*U(sd * .26, -2.84 + lift), *U(sd * .5, -2.76 + lift))
            cv.drawPath(cb, paint(dark(skin, .22), 110, stroke=.03 * r))
    shaded(cv, rrp(*U(-1.0, -2.64 + lift), *U(1.0, -2.18 + lift), .2 * r), CREAM, dx=-.06 * r, dy=-.07 * r)
    for yy in (-2.5, -2.36):
        w_ = skia.Path()
        w_.moveTo(*U(-.95, yy + lift))
        w_.cubicTo(*U(-.5, yy - .05 + lift), *U(-.2, yy + .05 + lift), *U(0, yy + lift))
        w_.cubicTo(*U(.2, yy - .05 + lift), *U(.5, yy + .05 + lift), *U(.95, yy + lift))
        cv.drawPath(w_, paint(dark(CREAM, .22), 140, stroke=.028 * r))
    if front:
        ch = skia.Path()
        ch.moveTo(*U(-.22, -2.9 + lift))
        ch.quadTo(*U(0, -2.45 + lift), *U(.22, -2.9 + lift))
        cv.drawPath(ch, paint('#F0C25A', 230, stroke=.022 * r))
        shaded(cv, rrp(*U(-.055, -2.6 + lift), *U(.055, -2.47 + lift), .03 * r), '#F0C25A', '#B98A2E', dx=-.015 * r, dy=-.015 * r)
    cv.restore()


def girl_head(cv, x, yf, r, lift, tilt, fc, an, shock=0):
    """Details over the toolkit face: locks redrawn over the knit, lashes, shocked 'O' mouth."""
    hx, hy = x, yf + (-3.85 + lift) * r
    skin, hc = GIRL['skin'], GIRL['hair']
    cv.save()
    cv.rotate(tilt, hx, hy + 1.1 * r)
    for sd in (-1, 1):
        shaded(cv, lock_path(hx, hy, r, sd), hc, dark(hc, .25), dx=-.05 * r * sd, dy=-.05 * r)
        hl = skia.Path()
        hl.moveTo(hx + sd * .78 * r, hy + .1 * r)
        hl.quadTo(hx + sd * .86 * r, hy + .9 * r, hx + sd * .8 * r, hy + 1.5 * r)
        cv.drawPath(hl, paint('#5A3A3E', 90, stroke=.05 * r))
    lx, ly = fc.get('look', (0, 0))
    sq = fc.get('squint', 0)
    for sd in (-1, 1):
        cx = hx + sd * .34 * r + lx * .07 * r
        cy = hy + .06 * r + ly * .07 * r
        oh = .125 * r * (1 - .45 * sq) * (1.22 if fc.get('eyes') == 'wide' else 1)
        lid = skia.Path()
        lid.moveTo(cx - .12 * r, cy - oh * .35)
        lid.quadTo(cx, cy - oh * 1.7, cx + .12 * r, cy - oh * .35)
        cv.drawPath(lid, paint(INK, stroke=.038 * r))
        cv.drawPath(poly([(cx + sd * .09 * r, cy - oh * .9), (cx + sd * .19 * r, cy - oh * 1.25)], False), paint(INK, stroke=.04 * r))
    if shock > .05:
        cv.drawOval(R(hx - .22 * r, hy + .33 * r, hx + .22 * r, hy + .47 * r), paint(skin))
        mw, mh = .09 * r, .15 * r * shock
        cy_ = hy + .43 * r
        cv.drawOval(R(hx - mw, cy_ - mh, hx + mw, cy_ + mh), paint((132, 36, 62)))
        cv.drawOval(R(hx - mw * .5, cy_ + mh * .1, hx + mw * .5, cy_ + mh * .8), paint((240, 110, 120)))
        cv.drawOval(R(hx - mw, cy_ - mh, hx + mw, cy_ + mh), paint(INK, stroke=.03 * r))
        for k in (-1, 0, 1):
            a = math.radians(-90 + k * 30)
            cv.drawPath(poly([(hx + math.cos(a) * 1.22 * r, hy + math.sin(a) * 1.22 * r),
                              (hx + math.cos(a) * 1.5 * r, hy + math.sin(a) * 1.5 * r)], False),
                        paint('#FFFFFF', 210 * shock, stroke=.04 * r))
    cv.restore()


def girl_figure(cv, t):
    an = keyf(t, ANGER)
    e = ease(prog(an, .12, .7))
    ang = lerp(-9, 28, e)
    rs = lerp(.08, -.05, e)
    look_y = lerp(.8, -.1, ease(prog(t, 4.45, 4.8)))
    fc = dict(eyes='open', squint=.45 * an, look=(0, look_y), mouth=lerp(-.05, -.85, an),
              brows=((ang, rs), (ang, rs)), blush=lerp(.4, 1.4, an),
              blushc=mix((255, 120, 140), (255, 70, 70), an))
    amp = typing_amp(t)
    jl = math.sin(t * 24) * .05 * amp
    jr = math.sin(t * 24 + 2) * .05 * amp
    arms = [((-.98, -1.45), (-.38, -1.72 + jl)), ((.98, -1.45), (.38, -1.72 + jr))]
    tilt = math.sin(t * 1.1) * 2 * an - 2 * an
    lift = math.sin(t * 2.2) * .015 + .07 * clamp((an - .5) / .4)

    def held(cv_):
        girl_body(cv_, 540, NF, NR, lift, tilt, True)
        girl_head(cv_, 540, NF, NR, lift, tilt, fc, an)
        phone_back(cv_, 540, NF - 1.82 * NR, 1.0, .9)
    person(cv, 540, NF, NR, GIRL, dict(legs='sit', arms=arms, face=fc, held=held, tilt=tilt, lift=lift))
    glow(cv, 540, NF - 3.75 * NR, 1.3 * NR, '#FFB0D0', 26, mid=1)
    st = clamp((an - .45) / .25)
    if st > 0:
        steam(cv, t, 540, NF - 3.85 * NR, NR, st)
    if an > .8:
        pk = 1 + .12 * math.sin(t * 10)
        anger_mark(cv, 540 + 108, NF - 3.85 * NR - 92, pk * clamp((an - .8) / .1))


def girl_room(cv, t):
    cv.drawRect(R(-700, -1500, 1800, 1190), paint(shader=lin(0, 300, 0, 1190, ['#3A1F5C', '#7A3F78'])))
    cv.drawRect(R(-700, 1190, 1800, 2300), paint(shader=lin(0, 1190, 0, 1700, ['#4A2A5A', '#25123A'])))
    cv.drawRect(R(-700, 1186, 1800, 1196), paint('#6A3E7A'))
    cv.drawOval(R(120, 1290, 960, 1400), paint('#8A4A8A'))
    cv.drawOval(R(150, 1300, 930, 1390), paint('#A55AA0', stroke=6))
    # wall clock (hands race: time dragging)
    cx, cy = 150, 790
    shaded(cv, cp(cx, cy, 56), '#F6EFFF', dx=-5, dy=-5)
    cv.drawCircle(cx, cy, 56, paint('#8A5A6E', stroke=7))
    for i in range(12):
        a = i * math.pi / 6
        cv.drawPath(poly([(cx + math.cos(a) * 44, cy + math.sin(a) * 44), (cx + math.cos(a) * 50, cy + math.sin(a) * 50)], False),
                    paint('#8A88AA', stroke=3))
    am = t * 3.2
    ah = am / 12
    cv.drawPath(poly([(cx, cy), (cx + math.cos(am) * 40, cy + math.sin(am) * 40)], False), paint('#272448', stroke=4))
    cv.drawPath(poly([(cx, cy), (cx + math.cos(ah) * 26, cy + math.sin(ah) * 26)], False), paint('#272448', stroke=6))
    cv.drawCircle(cx, cy, 5, paint('#E5484D'))
    # nightstand + lamp
    glow(cv, 135, 1030, 460, '#FFD28A', 110, mid=1)
    shaded(cv, rrp(60, 1120, 210, 1296, 14), '#6E4268', dx=-6, dy=-5)
    cv.drawPath(rrp(80, 1160, 190, 1168, 3), paint('#4A2A44'))
    shaded(cv, rrp(115, 1062, 155, 1120, 8), '#F4D6A0', dx=-3, dy=-3)
    shaded(cv, poly([(88, 1000), (182, 1000), (166, 1066), (104, 1066)]), '#FFE2A8', dx=-4, dy=-3)
    glow(cv, 135, 1040, 90, '#FFF4D6', 160)
    # headboard + pillows
    shaded(cv, rrp(240, 850, 840, 1190, 56), '#8A5A6E', dx=-10, dy=-10)
    shaded(cv, rrp(300, 930, 520, 1080, 50), '#F4E8F2', dx=-6, dy=-6)
    shaded(cv, rrp(560, 930, 780, 1080, 50), '#FFD9E6', dx=-6, dy=-6)


def girl_front(cv):
    for lx in (230, 850):
        cv.drawPath(rrp(lx - 10, 1300, lx + 10, 1340, 4), paint('#4A2A44'))
    shaded(cv, rrp(200, 1186, 880, 1312, 34), '#3FB6A8', dx=-8, dy=-8)
    cv.drawPath(rrp(214, 1196, 866, 1214, 9), paint('#6FD3C4', 150))


def girl_panel(cv, t):
    """Drawn in panel-local coordinates (panel top = 0, 634 tall)."""
    cv.save()
    cv.clipRect(R(0, 0, W, 634))
    z = 1 + .04 * ease(prog(t, SPLIT_A, DUR))
    kg = .8 * z
    cv.save()
    cv.translate(520, 548)
    cv.scale(kg, kg)
    cv.translate(-540, -1300)
    girl_room(cv, t)
    girl_figure(cv, t)
    girl_front(cv)
    cv.restore()
    chat_phone(cv, t, (768, 62, 1018, 502))
    cv.restore()


# ------------------------------------------------------------------ title (letter by letter)
def typewriter(cv, t, t0, lines, cy, size, cps=32):
    n_show = (t - t0) * cps
    if n_show <= 0:
        return
    f = font('semi', size)
    lh = size * 1.28
    y0 = cy - (len(lines) - 1) * lh / 2
    idx = 0
    for li, toks in enumerate(lines):
        full = ''.join(tx for tx, _ in toks)
        x0 = W / 2 - f.measureText(full) / 2
        pos = 0
        for tx, c in toks:
            for ch in tx:
                a = clamp(n_show - idx)
                if a > 0 and ch != ' ':
                    x = x0 + f.measureText(full[:pos])
                    base = y0 + li * lh + (1 - eout(a)) * 16 + size * .35
                    cv.drawString(ch, x, base + 4, f, paint('#08061a', 170 * a, blur=7))
                    cv.drawString(ch, x, base, f, paint(c, 255 * a))
                idx += 1
                pos += 1


# ------------------------------------------------------------------ frame
def draw(cv, t, fi):
    cv.drawRect(R(0, 0, W, H), paint(shader=lin(0, 0, 0, H, ['#0A0720', '#150E30'])))
    p = ease(prog(t, SPLIT_A, SPLIT_B))
    ytop = lerp(H + 14, 706, p)
    bb = ytop - 14
    push = 1 + .04 * ease(prog(t, 0, SPLIT_B))
    fy = lerp(1300, 610, p)
    k = lerp(push, .82, p)
    # boy panel
    cv.save()
    cv.clipRect(R(0, 0, W, bb))
    cv.save()
    cv.translate(540, fy)
    cv.scale(k, k)
    cv.translate(-540, -1300)
    boy_scene(cv, t)
    cv.restore()
    tvk = prog(t, 0, .45)
    full = (130, 100, 950, 561)
    small = (36, 66, 396, 268)
    box = tuple(lerp(a, b, p) for a, b in zip(full, small))
    tv_popout(cv, t, box, tvk)
    cv.restore()
    # girl panel
    if p > 0:
        cv.save()
        cv.translate(0, ytop)
        girl_panel(cv, t)
        cv.restore()
        cv.drawRect(R(0, ytop - 10, W, ytop - 4), paint('#FFC94A'))
        glow(cv, W / 2, ytop - 7, 520, '#FFC94A', 28 * p)
        cv.drawRect(R(0, ytop + 634, W, ytop + 638), paint('#FFC94A', 190))
    vignette(cv, 140)
    scrim(cv, 1260, 210)
    typewriter(cv, t, SPLIT_A, [[("GTA VI is ", '#FFFFFF'), ("killing", '#FF6B6B')], [("relationships", '#FFFFFF')]], 1478, 70)
    fade = 1 - prog(t, 0, .15)
    if fade > 0:
        cv.drawRect(R(0, 0, W, H), paint('#000000', 255 * fade))


if __name__ == '__main__':
    run('gta6_relationships', DUR, draw)
