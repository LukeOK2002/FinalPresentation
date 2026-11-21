import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gta_reel import *   # kz toolkit + shared cast, props and helpers from clip 1

DUR = 12.0
TS = 8.85                       # door slam begins
SOFA_DX = -120                   # sofa group shifted left to leave room for the door


# ------------------------------------------------------------------ in-game screen: beach club, dancing character
def dancer(cv, t, cx, base):
    """Flat-vector party dancer seen from behind: hourglass cartoon silhouette, hips bouncing to the beat."""
    sway = math.sin(t * 5.0) * 13
    hop = abs(math.sin(t * 10.0)) * 7
    skin = (214, 154, 110)
    pink, hair = '#FF4FA3', '#2A1410'
    hx, hy = cx + sway, base - 112 + hop * .6
    sy = base - 182
    tx = cx + sway * .4
    wx = lerp(tx, hx, .6)

    def limb(pts, w, c):
        p = poly(pts, False)
        cv.save()
        cv.translate(w * .12, w * .14)
        cv.drawPath(p, paint(dark(c, .25), stroke=w))
        cv.restore()
        cv.drawPath(p, paint(c, stroke=w))
    for sd in (-1, 1):
        limb([(hx + sd * 20, hy + 4), (cx + sd * (32 + sd * sway * .15), base - 52), (cx + sd * 22, base - 6)], 21, skin)
        cv.drawOval(R(cx + sd * 22 - 10, base - 9, cx + sd * 22 + 10, base + 3), paint(dark(skin, .12)))
    # arms up
    for sd in (-1, 1):
        sh = (tx + sd * 27, sy + 4)
        el = (tx + sd * 48 + sway * .4, sy - 12)
        hd = (tx + sd * 42 + sway * .7, sy - 54 + math.sin(t * 5 + sd) * 6)
        limb([sh, el, hd], 11, skin)
    # neck + torso: shoulders, bust, narrow waist, hips
    shaded(cv, rrp(tx - 7, sy - 18, tx + 7, sy + 4, 4), skin, dark(skin, .22), dx=-2, dy=-1)
    torso = skia.Path()
    torso.moveTo(tx - 27, sy - 2)
    torso.cubicTo(tx - 31, sy + 8, tx - 37, sy + 16, tx - 34, sy + 26)
    torso.cubicTo(tx - 32, sy + 38, wx - 17, sy + 40, wx - 15, sy + 50)
    torso.cubicTo(wx - 13, sy + 58, hx - 20, hy - 20, hx - 19, hy - 8)
    torso.lineTo(hx + 19, hy - 8)
    torso.cubicTo(hx + 20, hy - 20, wx + 13, sy + 58, wx + 15, sy + 50)
    torso.cubicTo(wx + 17, sy + 40, tx + 32, sy + 38, tx + 34, sy + 26)
    torso.cubicTo(tx + 37, sy + 16, tx + 31, sy + 8, tx + 27, sy - 2)
    torso.close()
    shaded(cv, torso, skin, dark(skin, .22), dx=-4, dy=-3)
    shaded(cv, rrp(hx - 40, hy - 14, hx + 40, hy + 22 - hop * .4, 18), pink, dark(pink, .25), dx=-4, dy=-4)
    cv.drawPath(poly([(tx - 35, sy + 22), (tx + 35, sy + 22)], False), paint(pink, stroke=5))
    cv.drawCircle(tx, sy + 22, 5, paint('#FF8AC8'))
    # head (from behind: hair) with swinging ponytail
    cv.drawPath(poly([(tx, sy - 44), (tx - sway * 1.3 + 12, sy + 8)], False), paint(hair, stroke=11))
    shaded(cv, cp(tx, sy - 32, 18.5), hair, dark(hair, .3), dx=-3, dy=-3)


def game_screen2(cv, t):
    cv.save()
    cv.drawRect(R(-20, -20, 720, 420), paint(shader=lin(0, 0, 0, 205, [sky_col(0), sky_col(70), sky_col(145), sky_col(205)])))
    glow(cv, 350, 170, 240, '#FF7AA0', 90, mid=1)
    cv.save()
    cv.clipPath(cp(350, 150, 82), skia.ClipOp.kIntersect, True)
    cv.drawRect(R(260, 60, 440, 240), paint(shader=lin(0, 68, 0, 232, ['#FFE08A', '#FF8E7A', '#FF4F8A'])))
    for j in range(7):
        y = 150 + j * 11
        cv.drawRect(R(260, y, 440, y + 2 + j * 1.5), paint(sky_col(y)))
    cv.restore()
    for i, (bh, bw) in enumerate(BUILD):
        bx = -20 + i * 30
        cv.drawRect(R(bx, 205 - bh, bx + bw, 207), paint('#3A1B6B'))
        for j in range(int(bh / 16)):
            if (i * 3 + j) % 3:
                cv.drawRect(R(bx + 6, 205 - bh + 8 + j * 15, bx + 11, 205 - bh + 13 + j * 15),
                            paint('#FF9FD0' if (i + j) % 2 else '#FFD66B', 190))
    cv.drawRect(R(-20, 205, 720, 420), paint(shader=lin(0, 205, 0, 394, ['#9A3F7E', '#4A1A5A'])))
    for i in range(7):
        y = 214 + i * i * 4.4
        cv.drawRect(R(-20, y, 720, y + 1.5 + i * .4), paint('#2A1048', 90))
    # party beams
    for i, c in enumerate(('#FF4FA3', '#7FC4FF', '#FFD66B')):
        x0 = 130 + i * 220
        x1 = x0 + math.sin(t * 1.6 + i * 2.1) * 170
        cv.drawPath(poly([(x0 - 6, -10), (x0 + 6, -10), (x1 + 50, 340), (x1 - 50, 340)]), paint(c, 34))
    palm(cv, 60, 394, 250, math.sin(t * 1.6), 1.0)
    palm(cv, 650, 394, 280, math.sin(t * 1.4 + 1), 1.1)
    glow(cv, 350, 372, 260, '#FF4FA3', 60)
    cv.save()
    cv.translate(350, 380)
    cv.scale(1.5, 1.5)
    cv.translate(-350, -372)
    dancer(cv, t, 350, 372)
    cv.restore()
    for i in range(12):
        bx = 40 + (i * 97) % 640
        by = 30 + (i * 53) % 160
        cv.drawCircle(bx, by, 6 + i % 4 * 3, paint(('#FF9FD0', '#9FD4FF', '#FFE08A')[i % 3], 55 + 40 * math.sin(t * 3 + i)))
    # HUD
    cv.save()
    cv.clipPath(cp(62, 334, 40), skia.ClipOp.kIntersect, True)
    cv.drawRect(R(20, 290, 110, 380), paint(shader=lin(0, 290, 0, 380, ['#17405C', '#0E2438'])))
    for (x1, y1, x2, y2) in ((20, 322, 110, 340), (50, 290, 70, 380), (20, 360, 110, 350), (92, 290, 80, 380)):
        cv.drawPath(poly([(x1, y1), (x2, y2)], False), paint('#9FD4FF', 110, stroke=5))
    cv.drawPath(poly([(62, 322), (72, 346), (62, 341), (52, 346)]), paint('#FFFFFF'))
    cv.restore()
    cv.drawCircle(62, 334, 40, paint('#FFFFFF', 230, stroke=4))
    text(cv, '$48,200', 680, 40, font('bold', 24), '#8BE08B', anchor='r', shadow=4)
    cv.restore()


def tv_popout2(cv, t, box, k, content):
    if k <= 0:
        return
    l, tp, r_, b = box
    cx, cy = (l + r_) / 2, (tp + b) / 2
    cv.save()
    s = eback(k, 1.3)
    cv.translate(cx, cy + math.sin(t * 1.4) * 3)
    cv.scale(s, s)
    cv.translate(-cx, -cy)
    glow(cv, cx, cy, (r_ - l) * .95, '#FF9FD0', 80)
    cv.drawPath(rrp(l - 6, tp + 12, r_ + 6, b + 28, 22), paint('#05031a', 150, blur=22))
    bz = (r_ - l) * .022
    shaded(cv, rrp(l - bz, tp - bz, r_ + bz, b + bz, 18), '#14162C', dx=-5, dy=-5)
    cv.save()
    cv.clipPath(rrp(l, tp, r_, b, 10), skia.ClipOp.kIntersect, True)
    cv.translate(l, tp)
    sc = (r_ - l) / 700
    cv.scale(sc, sc)
    content(cv, t)
    cv.restore()
    cv.restore()


# ------------------------------------------------------------------ door (on the right-hand side wall)
DU0, DU1 = 954, 1062            # doorway x-range on screen; hinge on the near (right) side


def wall_bot(x):
    return 1195 + 1.013 * (x - 930)


def dtop(x):
    return wall_bot(x) - 640 * (1 + (x - 930) * .0013)


def DP(x, v):
    return (x, lerp(dtop(x), wall_bot(x), v))


def door_angle(t):
    a = 78 * ease(prog(t, 3.6, 3.95))
    if t >= TS:
        a *= 1 - ein(prog(t, TS, TS + .12))
    return a


def side_wall(cv, t):
    a = door_angle(t)
    cv.drawPath(poly([(930, -400), (1100, -400), (1100, 1367), (930, 1195)]),
                paint(shader=lin(930, 0, 1100, 0, ['#1B2058', '#0F1240'])))
    cv.drawPath(poly([(930, 1195), (1100, 1367)], False), paint('#3A2D6A', stroke=8))
    cv.drawPath(poly([DP(DU0 - 10, -.04), DP(DU1 + 10, -.04), DP(DU1 + 10, 1), DP(DU0 - 10, 1)]), paint('#3B3F7A'))
    cv.drawPath(poly([DP(DU0, 0), DP(DU1, 0), DP(DU1, 1), DP(DU0, 1)]),
                paint(shader=lin(0, dtop(DU0), 0, wall_bot(DU1), ['#07041A', '#1B1240'])))
    if a > 5:
        glow(cv, (DU0 + DU1) / 2, dtop(DU0) + 80, 190, '#FFE9B5', 50 * clamp(a / 78), mid=1)


def door_leaf(cv, t):
    a = door_angle(t)
    ca = math.cos(math.radians(a))
    xf = DU1 - (DU1 - DU0) * ca
    Pm = lambda u, v: DP(lerp(DU1, xf, u), v)
    shaded(cv, poly([Pm(0, 0), Pm(1, 0), Pm(1, 1), Pm(0, 1)]), '#B5694F', dx=-(5 * ca + 1), dy=0)
    for u0, u1, v0, v1 in ((.14, .86, .08, .44), (.14, .86, .54, .92)):
        pp = poly([Pm(u0, v0), Pm(u1, v0), Pm(u1, v1), Pm(u0, v1)])
        cv.drawPath(pp, paint('#A05A44'))
        cv.drawPath(pp, paint('#8A4A38', stroke=2))
    if ca > .15:
        kx, ky = Pm(.86, .55)
        cv.drawCircle(kx, ky, 7 * ca + 2, paint('#FFD66B'))


def slam_fx(cv, t):
    ia = t - (TS + .12)
    if not (0 <= ia < .6):
        return
    dcx, dcy = (DU0 + DU1) / 2, 960
    glow(cv, dcx, dcy, 380, '#FFFFFF', 200 * max(0, 1 - ia / .3) ** 2)
    for i in range(12):
        a = i * math.pi / 6 + .2
        r0 = 150 + ia * 260
        cv.drawPath(poly([(dcx + math.cos(a) * r0, dcy + math.sin(a) * r0 * 1.1),
                          (dcx + math.cos(a) * (r0 + 70), dcy + math.sin(a) * (r0 + 70) * 1.1)], False),
                    paint('#FFE9B5', 220 * (1 - ia / .6), stroke=7))
    for i in range(7):
        px = 950 + i * 34
        py = wall_bot(px) - 6 - ia * (60 + i % 3 * 20)
        cv.drawCircle(px, py, 14 + ia * 50, paint('#B8A7D8', 120 * (1 - ia / .6)))


# ------------------------------------------------------------------ girlfriend (stylised after Nikki, see clip 1)
def girl_back_hair(cv, x, yf, r, lift, tilt):
    hx, hy = x, yf + (-3.85 + lift) * r
    hc = GIRL['hair']
    shaded(cv, rrp(hx - .7 * r, hy + .35 * r, hx + .7 * r, yf - 2.15 * r, .45 * r), hc, dark(hc, .3), dx=-.08 * r, dy=0)
    cv.save()
    cv.rotate(tilt, hx, hy + 1.1 * r)
    shaded(cv, cp(hx, hy, 1.05 * r), hc, dark(hc, .3), dx=-.1 * r, dy=-.1 * r)
    for off in (-.45, .05, .5):
        hl = skia.Path()
        hl.moveTo(hx + off * r, hy - .6 * r)
        hl.quadTo(hx + (off + .12) * r, hy + .1 * r, hx + off * r * 1.1, hy + 1.4 * r)
        cv.drawPath(hl, paint('#5A3A3E', 80, stroke=.05 * r))
    cv.restore()
    cv.save()
    hl = skia.Path()
    for off in (-.45, 0, .45):
        hl.moveTo(hx + off * r, hy + 1.2 * r)
        hl.lineTo(hx + off * r * .9, yf - 2.25 * r)
    cv.drawPath(hl, paint('#5A3A3E', 70, stroke=.05 * r))
    cv.restore()


def girl_legs(cv, x, yf, r, ph, walk):
    pants, shoes = GIRL['pants'], GIRL['shoes']
    cv.drawRect(R(x - .74 * r, yf - 1.45 * r, x + .74 * r, yf - .85 * r), paint(pants))
    for sd in (-1, 1):
        phi = ph + (0 if sd < 0 else math.pi)
        lift = max(0, math.sin(phi)) * .3 * r * walk
        hip = (x + sd * .3 * r, yf - 1.35 * r)
        foot = (x + sd * .34 * r, yf - .3 * r - lift)
        p = poly([hip, foot], False)
        cv.save()
        cv.translate(.05 * r, .06 * r)
        cv.drawPath(p, paint(dark(pants, .25), stroke=.4 * r))
        cv.restore()
        cv.drawPath(p, paint(pants, stroke=.4 * r))
        shaded(cv, op(foot[0] - .27 * r, foot[1], foot[0] + .27 * r, foot[1] + .28 * r), shoes, dx=-.05 * r, dy=-.06 * r)


REL = [((-.95, -2.0), (-.9, -1.35)), ((.95, -2.0), (.9, -1.35))]
GASP = [((-1.3, -2.3), (-.78, -2.9)), ((1.3, -2.3), (.78, -2.9))]
HIPS = [((-1.3, -2.05), (-.8, -1.5)), ((1.3, -2.05), (.8, -1.5))]


def mix_arms(a, b, k):
    return [(lerp2(a[i][0], b[i][0], k), lerp2(a[i][1], b[i][1], k)) for i in range(2)]


def girl_state(t):
    """She walks in through the right-hand door and storms back out through it, always facing the room."""
    if t < 4.0 or t > 8.7:
        return None
    if t < 5.0:
        p = ease(prog(t, 4.0, 5.0))
        return dict(x=lerp(1160, 830, p), yf=1274 + 71 * ease(prog(p, .45, 1)), back=False, sx=1, walk=1)
    if t < 7.6:
        return dict(x=830, yf=1345, back=False, sx=1, walk=0)
    p = ease(prog(t, 7.6, 8.5))
    return dict(x=lerp(830, 1170, p), yf=lerp(1345, 1274, ease(prog(p, 0, .5))), back=False, sx=1, walk=1.4)


def girl(cv, t):
    st = girl_state(t)
    if st is None or t >= TS:
        return
    x, yf, back, sx, walk = st['x'], st['yf'], st['back'], st['sx'], st['walk']
    s = .78 + .22 * clamp((yf - 1195) / 150)
    r = NR * s
    alpha = 1
    if alpha <= 0:
        return
    ph = t * (9 if t < 7.6 else 17)
    swing = math.sin(ph) * walk
    an = keyf(t, [(5.4, 0), (6.4, .15), (7.4, 1.0)])
    shock = ease(prog(t, 5.5, 5.75)) * (1 - ease(prog(t, 6.3, 6.6)))
    stomp = 1.0 if t >= 7.6 else 0
    look = lerp2((-.6, -.4), (-.95, .15), ease(prog(t, 6.3, 6.8))) if t >= 5.0 else (-.3, -.2)
    if shock > .01:
        fc = dict(eyes='wide', mouth=0, mopen=0, look=(-.3, -.3), brows=((-16 * shock, .2 * shock),) * 2,
                  blush=lerp(.4, 0, shock))
    else:
        e = ease(prog(an, .12, .7))
        ang, rs = lerp(-9, 28, e), lerp(.08, -.05, e)
        if t < 5.5:
            fc = dict(eyes='open', mouth=.3, look=look, brows=((-4, .06),) * 2, blush=.4)
            if t >= 5.0:
                fc.update(mouth=0, brows=((-8, .1),) * 2)
        else:
            fc = dict(eyes='open', squint=.45 * an, look=look, mouth=lerp(-.05, -.85, an),
                      brows=((ang, rs),) * 2, blush=lerp(.4, 1.4, an),
                      blushc=mix((255, 120, 140), (255, 70, 70), an))
    arms = mix_arms(REL, GASP, shock)
    arms = mix_arms(arms, HIPS, ease(prog(t, 6.4, 6.7)))
    pump = ease(prog(t, 7.6, 7.8))
    PUMP = [((-1.0, -1.95), (-.95, -1.5 + .3 * math.sin(ph))), ((1.0, -1.95), (.95, -1.5 - .3 * math.sin(ph)))]
    arms = mix_arms(arms, PUMP, pump)
    if walk and not stomp:
        arms = mix_arms(arms, [((-.95, -2.0), (-.9, -1.35 + .2 * swing)), ((.95, -2.0), (.9, -1.35 - .2 * swing))], .8)
    tilt = -2 * an + (math.sin(ph) * 5 * stomp) + (math.sin(ph) * 2 * (walk and not stomp))
    lift = -abs(math.sin(ph)) * .05 * walk + (.07 * clamp((an - .5) / .4) if t > 6.4 else 0)
    cv.save()
    xp = 930 + (yf - 1195) / 1.013          # where the side-wall plane sits at her depth
    if x + .9 * r > xp - 2:                  # past the wall: only visible through the doorway
        room_side = skia.Path()
        room_side.addRect(R(-3000, -3000, xp, 3000))
        opening = poly([DP(DU0, 0), DP(DU1, 0), DP(DU1, 1), DP(DU0, 1)])
        cv.clipPath(skia.Op(room_side, opening, skia.PathOp.kUnion_PathOp), skia.ClipOp.kIntersect, True)
    if alpha < 1:
        cv.saveLayerAlpha(None, A(255 * alpha))
    cv.translate(x, 0)
    cv.scale(sx, 1)
    cv.translate(-x, 0)
    girl_legs(cv, x, yf, r, ph, walk)

    def held(cv_):
        # jeans waistband over the bottom of the knit
        cv_.save()
        cv_.clipPath(rrp(x - .76 * r, yf + (-2.98 + lift) * r, x + .76 * r, yf - 1.0 * r, .62 * r), skia.ClipOp.kIntersect, True)
        cv_.drawRect(R(x - 1 * r, yf - 1.32 * r, x + 1 * r, yf - .9 * r), paint(GIRL['pants']))
        cv_.restore()
        girl_body(cv_, x, yf, r, lift, tilt, front=not back)
        if back:
            girl_back_hair(cv_, x, yf, r, lift, tilt)
        else:
            girl_head(cv_, x, yf, r, lift, tilt, fc, an, shock)
    person(cv, x, yf, r, GIRL, dict(legs=None, arms=arms, face=fc, held=held, tilt=tilt, lift=lift))
    if not back:
        st_ = clamp((an - .45) / .25) * clamp((1060 - x) / 100)
        if st_ > 0 and t > 6.4:
            steam(cv, t, x, yf - 3.85 * r, r, st_)
        if an > .8 and t > 6.4:
            anger_mark(cv, x + 108 * s, yf - 3.85 * r - 92 * s, (1 + .12 * math.sin(t * 10)) * clamp((an - .8) / .1) * s)
    if alpha < 1:
        cv.restore()
    cv.restore()


# ------------------------------------------------------------------ boyfriend
def boy2(cv, t):
    notice = ease(prog(t, 7.6, 7.95))
    sad = ease(prog(t, 7.95, 8.6))
    fl = 0
    if TS + .12 <= t < TS + .3:
        fl = 1 - (t - TS - .12) / .18
    if t < 7.6:
        fc = dict(eyes='open', squint=.1, look=(0, -.25), mouth=.75, mopen=.3 + .12 * (.5 + .5 * math.sin(t * 7)),
                  brows=((-3, .07),) * 2, blush=.55)
    elif t < 7.95:
        fc = dict(eyes='wide', mouth=0, mopen=.55, look=(1, 0), brows=((-12, .12),) * 2, blush=.4)
    else:
        lk = lerp2((1, 0), (.3, .8), ease(prog(t, 9.1, 9.8)))
        fc = dict(eyes='open', squint=lerp(0, .3, sad), look=lk, mouth=lerp(0, -.8, sad),
                  brows=((-lerp(8, 18, sad), lerp(.06, .12, sad)),) * 2, blush=.3)
    jit = 1 - sad
    jl = math.sin(t * 17) * .035 * jit
    jr = math.sin(t * 17 + 2) * .035 * jit
    dy = .35 * sad
    tr = turn(t) * (1 - sad)

    def held(cv_):
        controller(cv_, 540, NF - 2.0 * NR + dy * NR, NR, tr * 7, t)
        boy_hands(cv_, dy, jl, jr)
    boy_legs(cv)
    person(cv, 540, NF, NR, BOY, dict(legs=None, arms=boy_arms(dy, jl, jr, sad), face=fc, held=held, hands=False,
                                      tilt=lerp(math.sin(t * 2.6) * 2.2, 4, notice),
                                      lift=math.sin(t * 3) * .012 * jit + .05 * sad - .07 * fl))
    c = mix('#FF9FD0', '#7FC4FF', .5 + .5 * math.sin(t * 1.7))
    glow(cv, 540, NF - 3.75 * NR, 1.3 * NR, c, 26, mid=1)


# ------------------------------------------------------------------ room
def room(cv, t):
    ia = t - (TS + .12)
    rattle = ((1 - ia / .5) ** 2 if 0 <= ia < .5 else 0) * math.sin(t * 60) * 5
    cv.drawRect(R(-700, -1500, 1800, 1190), paint(shader=lin(0, 300, 0, 1190, ['#0E1238', '#202760'])))
    ledc = mix('#FF4FA3', '#7A5CFF', .5 + .5 * math.sin(t * 1.1))
    cv.drawRect(R(-700, 630, 1800, 690), paint(ledc, 60, blur=24))
    cv.drawRect(R(-700, 653, 1800, 661), paint(ledc))
    for fx, fy, fw, fh, c in ((40, 770, 120, 150, '#FFC94A'), (190, 800, 100, 90, '#5BC0EB')):
        cv.save()
        cv.rotate(rattle, fx + fw / 2, fy)
        shaded(cv, rrp(fx, fy, fx + fw, fy + fh, 8), '#3B3F7A', dx=-4, dy=-4)
        cv.drawPath(rrp(fx + 12, fy + 12, fx + fw - 12, fy + fh - 12, 4), paint(c, 200))
        cv.drawCircle(fx + fw / 2, fy + fh / 2, min(fw, fh) * .18, paint('#ffffff', 130))
        cv.restore()
    cv.drawRect(R(-700, 1190, 1800, 2300), paint(shader=lin(0, 1190, 0, 1920, ['#2A2052', '#140B2A', '#0A0618'])))
    cv.drawRect(R(-700, 1186, 1800, 1196), paint('#3A2D6A'))
    cv.drawOval(R(40, 1270, 800, 1380), paint('#3E2E70'))
    cv.drawOval(R(70, 1280, 770, 1370), paint('#4A3884', stroke=6))
    side_wall(cv, t)
    c = mix('#FF9FD0', '#7FC4FF', .5 + .5 * math.sin(t * 1.7))
    glow(cv, 420, 900, 900, c, 30, mid=1)
    cv.save()
    cv.translate(SOFA_DX, 0)
    shaded(cv, rrp(250, 880, 830, 1170, 60), '#6B3E8E', dx=-10, dy=-10)
    for cx_ in (335, 745):
        shaded(cv, rrp(cx_ - 72, 915, cx_ + 72, 1080, 40), '#7D4CA0', dx=-6, dy=-6)
    sofa_front(cv)
    boy2(cv, t)
    cv.restore()
    girl(cv, t)
    door_leaf(cv, t)
    slam_fx(cv, t)


# ------------------------------------------------------------------ frame
def draw(cv, t, fi):
    cv.drawRect(R(0, 0, W, H), paint(shader=lin(0, 0, 0, H, ['#0A0720', '#150E30'])))
    ia = t - (TS + .12)
    sh = (1 - ia / .45) ** 2 if 0 <= ia < .45 else 0
    cv.save()
    cv.translate(math.sin(t * 83) * sh * 14, math.cos(t * 71) * sh * 10)
    room(cv, t)
    tv_popout2(cv, t, (130, 100, 950, 561), prog(t, 0, .45), game_screen2)
    cv.restore()
    vignette(cv, 140)
    scrim(cv, 1260, 210)
    subtitle(cv, t, .4, 4.4, "The game contains {hl:highly sexualised}\ndepictions of women, which are\n{hl:impossible to avoid}", cy=1440)
    typewriter(cv, t, 4.5, [[("This has placed a ", '#FFFFFF'), ("strain", '#FF6B6B')],
                                 [("on many relationships", '#FFFFFF')]], 1478, 70)
    fade = 1 - prog(t, 0, .15)
    if fade > 0:
        cv.drawRect(R(0, 0, W, H), paint('#000000', 255 * fade))


if __name__ == '__main__':
    run('gta6_strain', DUR, draw)
