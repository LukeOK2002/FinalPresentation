import os, sys
from kzs import *

DUR = 13.0
SCENE_BOTTOM = 1340
TV = (300, 430, 780, 700)           # in-game screen (480 x 270), world coords
CAPTION = "Men are spending more time on\nchores in {hl:game} than in {hl:real life}"
DEEP = '#00B3B0'                     # floor shadow colour


def A(x):
    return int(clamp(x, 0, 255))


# ------------------------------------------------------------------ in-game screen: Jason painting (local 480 x 270)
def jason_scene(cv, t):
    prog_paint = clamp(t / (DUR - 1.5)) * .78
    # two-tone green walls + floor (as in the reference clip)
    cv.drawRect(R(0, 0, 480, 270), paint('#0D5C34'))
    cv.drawRect(R(300, 0, 480, 270), paint('#C8E58A'))
    cv.drawRect(R(300, 0, 300 + 180 * prog_paint, 270), paint('#46C463'))          # fresh paint going on
    cv.drawRect(R(300 + 180 * prog_paint - 5, 0, 300 + 180 * prog_paint, 270), paint('#8CEB8A', 200))
    cv.drawRect(R(0, 236, 480, 270), paint('#6B4A2E'))
    cv.drawRect(R(0, 228, 480, 238), paint('#E8F2C8'))
    cv.drawPath(poly([(300, 0), (300, 238)], False), paint('#0A3F24', stroke=5))
    cv.drawRect(R(430, 150, 450, 190), paint('#EDEAD0'))                           # socket
    cv.drawRect(R(436, 160, 444, 168), paint('#BDB99A'))
    fl = 232
    x = 170
    ph = t * 3.2
    ry = 100 + math.sin(ph) * 40
    cv.save()
    cv.translate(300, 232)
    cv.scale(.66, .66)
    cv.translate(-300, -232)
    # legs + shoes
    for sd in (-1, 1):
        cv.drawPath(rrp(x + sd * 16 - 11, fl - 74, x + sd * 16 + 11, fl - 6, 5), paint('#3A5BD0'))
        cv.drawOval(R(x + sd * 16 - 15 + 6, fl - 10, x + sd * 16 + 21, fl + 2), paint('#FFFFFF'))
    pill_shadow(cv, x + 8, fl + 4, 110, 12, '#07391F', 200)
    shaded(cv, rrp(x - 33, fl - 152, x + 35, fl - 62, 18), '#24204F', dark('#24204F', .3), dx=-4, dy=0)
    # pole + roller
    bx, by = x + 34, fl - 52
    tx, ty = 292, ry
    px = lambda u: (lerp(bx, tx, u), lerp(by, ty, u))
    cv.drawPath(poly([px(0), px(1)], False), paint('#FFB300', stroke=7))
    cv.drawPath(poly([px(.08), px(.2)], False), paint('#C96A00', stroke=7))
    cv.save()
    cv.translate(tx + 2, ty - 4)
    cv.rotate(-18)
    shaded(cv, rrp(-30, -12, 24, 12, 8), '#3FD07A', dark('#3FD07A', .3), dx=-3, dy=-2)
    cv.drawPath(rrp(-34, -14, -26, 14, 3), paint('#1E8E4E'))
    gloss_line(cv, -20, -5, 8, -5, 3)
    cv.restore()
    # arms
    h1, h2 = px(.5), px(.78)
    cv.drawPath(poly([(x + 12, fl - 138), ((x + 12 + h1[0]) / 2, (fl - 138 + h1[1]) / 2 + 10), h1], False), paint('#24204F', stroke=15))
    cv.drawPath(poly([(x + 24, fl - 140), ((x + 24 + h2[0]) / 2, (fl - 140 + h2[1]) / 2 - 6), h2], False), paint('#24204F', stroke=15))
    for h in (h1, h2):
        cv.drawCircle(h[0], h[1], 8, paint('#FFAC7E'))
    # head, beard, trucker cap
    hx, hy = x + 8, fl - 176
    cv.drawCircle(hx, hy, 25, paint('#FFAC7E'))
    cv.drawPath(poly([(hx - 20, hy + 6), (hx + 22, hy + 6), (hx + 16, hy + 26), (hx, hy + 32), (hx - 14, hy + 24)]), paint('#2A1A12'))
    cv.drawCircle(hx + 12, hy - 2, 2.6, paint(INK))
    cv.drawPath(poly([(hx + 4, hy + 14), (hx + 16, hy + 14)], False), paint('#7A3A28', stroke=3))
    shaded(cv, cp(hx - 2, hy - 8, 26), '#1D1A3A', dark('#1D1A3A', .3), dx=-3, dy=-3)               # mesh back
    cv.drawPath(poly([(hx + 4, hy - 30), (hx + 28, hy - 12), (hx + 28, hy - 2), (hx + 2, hy - 4)]), paint('#FFFFFF'))   # white front panel
    cv.drawPath(rrp(hx + 14, hy - 6, hx + 40, hy + 1, 3), paint('#FFFFFF'))                                           # brim
    cv.restore()
    # in-game UI like the reference short
    text(cv, 'GTA 6', 242, 31, font('bold', 40), '#7A0A4A', 255)
    text(cv, 'GTA 6', 240, 28, font('bold', 40), '#FF3D9A', 255)
    cv.drawPath(rrp(118, 52, 364, 82, 7), paint('#FFFFFF'))
    text(cv, 'Jason Painting his House', 241, 67, font('bold', 17), '#1D1A3A', 255)


def tv_unit(cv, t):
    l, tp, r_, b = TV
    glow(cv, 540, 565, 620, '#7FFFA0', 45, mid=1)
    shaded(cv, rrp(l - 14, tp - 14, r_ + 14, b + 14, 20), '#101A78', dx=-5, dy=-5)
    gloss_line(cv, l - 4, tp + 6, l - 4, tp + 40, 5, 160)
    cv.save()
    cv.clipPath(rrp(l, tp, r_, b, 8), skia.ClipOp.kIntersect, True)
    cv.translate(l, tp)
    jason_scene(cv, t)
    cv.restore()
    cv.drawPath(poly([(l, tp), (l + 150, tp), (l, tp + 90)]), paint('#FFFFFF', 18))
    cv.drawPath(rrp(500, b + 14, 580, b + 36, 6), paint('#0B1052'))


# ------------------------------------------------------------------ the messy room
def room_bg(cv, t):
    cv.drawRect(R(-300, -800, 1400, 1180), paint(YEL))
    cv.drawRect(R(-300, 1180, 1400, 2200), paint(TEAL))
    cv.drawRect(R(-300, 1166, 1400, 1182), paint(YEL_DD))
    cv.drawPath(rrp(555, 90, 760, 300, 14), paint(YEL_D))                                # tone-on-tone picture frame
    cv.drawPath(rrp(575, 110, 740, 280, 8), paint('#FFB300'))
    cv.drawPath(rrp(330, 730, 750, 1180, 18), paint('#FF7A59'))                         # TV cabinet
    shaded(cv, rrp(340, 740, 740, 1175, 14), '#FF9E3D', dark('#FF9E3D', .3), dx=-6, dy=-6)
    for yy in (850, 980):
        cv.drawPath(rrp(350, yy, 730, yy + 12, 4), paint('#E27A12'))
    shaded(cv, rrp(380, 880, 560, 970, 10), '#1A1E76', dx=-4, dy=-4)                     # console
    cv.drawCircle(400, 1050, 12, paint('#FF3D5A'))
    pill_shadow(cv, 540, 1188, 520, 30, DEEP)


def wallpaper(cv, t):
    x0, y0, x1, y1 = 20, 190, 272, 735
    sw = math.sin(t * 1.4) * 4
    cv.drawPath(rrp(x0, y0, x1, y1, 4), paint('#F1DCA0'))                                # bare plaster
    sheet = poly([(x0 + 90, y0), (x1, y0), (x1, y1 - 40), (x0 + 130, y1), (x0, y1 - 60), (x0, y0 + 150)])
    cv.save()
    cv.clipPath(sheet, skia.ClipOp.kIntersect, True)
    cv.drawPath(sheet, paint('#FFF1C8'))
    for gy in range(y0, y1 + 60, 58):
        for gx in range(x0 - 20, x1 + 40, 58):
            ox = 29 if ((gy - y0) // 58) % 2 else 0
            c_ = (gx + ox, gy + 29)
            cv.drawPath(poly([(c_[0], c_[1] - 17), (c_[0] + 13, c_[1]), (c_[0], c_[1] + 17), (c_[0] - 13, c_[1])]), paint('#FFB300'))
            cv.drawCircle(c_[0], c_[1], 4, paint('#FF7A59'))
    cv.restore()
    cv.drawPath(poly([(x0 + 90, y0), (x0, y0 + 150)], False), paint('#D9C48C', stroke=3))
    # top-left corner flap, curled outward
    flap = poly([(x0 + 90, y0), (x0 + 6 + sw, y0 + 150 - sw * 2), (x0 + 118 + sw, y0 + 118 + sw), (x0 + 140, y0 + 40)])
    shaded(cv, flap, '#FFFFFF', '#D8D2C0', dx=-4, dy=-4)
    cv.drawPath(poly([(x0 + 22 + sw, y0 + 125), (x0 + 108 + sw, y0 + 100)], False), paint('#C9C3B0', 150, stroke=3))
    # right edge strip peeling away from the wall
    st = poly([(x1, y0 + 230), (x1 - 12, y0 + 230), (x1 - 26 + sw, y0 + 340), (x1 - 8 + sw * 2, y0 + 440), (x1 + 34 + sw * 2, y0 + 420), (x1 + 18 + sw, y0 + 330)])
    shaded(cv, st, '#FFFFFF', '#D8D2C0', dx=-3, dy=-3)
    # bottom curl
    bc = poly([(x0 + 130, y1), (x0 + 200, y1 - 38), (x0 + 236, y1 + 6 + sw), (x0 + 170, y1 + 56 + sw * 2), (x0 + 96, y1 + 40)])
    shaded(cv, bc, '#FFFFFF', '#D8D2C0', dx=-4, dy=-3)
    for (a_, b_, c_, d_) in ((x0 + 60, y0 + 330, x0 + 90, y0 + 350), (x0 + 150, y0 + 460, x0 + 180, y0 + 440), (x0 + 40, y0 + 480, x0 + 70, y0 + 505)):
        cv.drawPath(poly([(a_, b_), ((a_ + c_) / 2, (b_ + d_) / 2 - 8), (c_, d_)], False), paint('#D9B96A', stroke=3))


def kitchen(cv, t):
    pill_shadow(cv, 150, 1190, 300, 28, DEEP)
    shaded(cv, rrp(14, 900, 286, 1182, 10), '#FF7A59', dark('#FF7A59', .3), dx=-8, dy=-8)
    for dx_ in (40, 160):
        cv.drawPath(rrp(dx_, 940, dx_ + 100, 1160, 10), paint('#F2553A', 120))
    gloss_line(cv, 50, 960, 50, 1000, 6)
    shaded(cv, rrp(4, 878, 296, 914, 8), '#FFF1C8', dark('#FFF1C8', .3), dx=-4, dy=-3)
    cv.drawPath(rrp(52, 878, 244, 892, 8), paint('#9AB0D8'))                             # sink basin lip
    # pile of dirty plates (leaning tower)
    for i in range(7):
        px = 128 + math.sin(i * 1.7) * 10
        py = 872 - i * 15
        cv.drawOval(R(px - 66, py - 12, px + 66, py + 12), paint('#C9D3E8'))
        cv.drawOval(R(px - 66, py - 15, px + 66, py + 9), paint('#FFFFFF'))
        cv.drawOval(R(px - 44, py - 12, px + 44, py + 3), paint('#EEF1FA'))
        if i % 2 == 0:
            cv.drawOval(R(px - 28, py - 11, px - 4, py - 1), paint('#B8742E', 200))
        if i % 3 == 1:
            cv.drawOval(R(px + 10, py - 10, px + 36, py - 1), paint('#E8B53A', 200))
    # mugs, pan, cutlery
    shaded(cv, rrp(190, 822, 240, 880, 8), '#61E7ED', dark('#61E7ED', .3), dx=-4, dy=-3)
    cv.drawPath(poly([(240, 836), (258, 842), (240, 862)], False), paint('#61E7ED', stroke=7))
    shaded(cv, rrp(28, 830, 76, 880, 8), '#FF3D9A', dark('#FF3D9A', .3), dx=-4, dy=-3)
    cv.drawCircle(60, 770, 40, paint('#2A2E5E'))
    cv.drawCircle(60, 770, 30, paint('#3A3F78'))
    cv.drawPath(rrp(96, 764, 170, 776, 6), paint('#2A2E5E'))
    cv.drawPath(poly([(112, 770), (126, 640)], False), paint('#D8DCF0', stroke=5))        # fork sticking up
    for fx in (-6, 0, 6):
        cv.drawPath(poly([(126 + fx, 650), (126 + fx, 630)], False), paint('#D8DCF0', stroke=3))
    # tap + dripping drop
    cv.drawPath(rrp(150, 700, 166, 770, 6), paint('#C9D6FF'))
    sp = skia.Path()
    sp.moveTo(158, 700)
    sp.quadTo(158, 668, 192, 668)
    cv.drawPath(sp, paint('#C9D6FF', stroke=14))
    d = (t * 1.1) % 1
    cv.drawOval(R(186, 686 + d * 150, 198, 704 + d * 150 + d * 8), paint('#7FD8FF', A(255 * (1 - d * .5))))


def door_cat(cv, t):
    cv.drawPath(rrp(792, 310, 1028, 1182, 10), paint(YEL_DD))                             # frame (tone-on-tone)
    shaded(cv, rrp(810, 330, 1010, 1180, 8), '#FF6B4A', dark('#FF6B4A', .3), dx=-8, dy=0)
    for (a_, b_) in ((350, 700), (730, 1160)):
        cv.drawPath(rrp(830, a_, 990, b_, 8), paint('#F2553A'))
        cv.drawPath(rrp(830, a_, 990, b_, 8), paint('#C93E26', stroke=3))
    cv.drawCircle(842, 800, 14, paint(YEL))
    # scratch marks
    for sx in (-30, 0, 30):
        cv.drawPath(poly([(955 + sx, 880), (965 + sx, 1090)], False), paint('#FFD2BF', stroke=5))
    cat(cv, 958, 1182, 110, t)
    k = ease(prog(t, 7.4, 7.9))
    if k > 0:
        pulse = 1 + .06 * math.sin(t * 8)
        cv.save()
        cv.translate(850, 860)
        cv.scale(k * pulse, k * pulse)
        cv.translate(-850, -860)
        cv.drawPath(rrp(770, 830, 930, 890, 26), paint('#FFFFFF'))
        cv.drawPath(poly([(880, 886), (912, 920), (912, 884)]), paint('#FFFFFF'))
        text(cv, 'meow!', 850, 861, font('bold', 38), '#1D1A3A')
        cv.restore()


def cat(cv, x, y, s, t):
    sc = math.sin(t * 9)
    pill_shadow(cv, x, y + 2, s * 1.3, s * .18, DEEP)
    tail = skia.Path()
    tail.moveTo(x + s * .22, y - s * .22)
    tail.cubicTo(x + s * .7, y - s * .1, x + s * .8, y - s * .6, x + s * .55, y - s * .9)
    cv.drawPath(tail, paint('#E8741A', stroke=s * .15))
    cv.drawPath(tail, paint('#FF9A3D', stroke=s * .11))
    for sd in (-1, 1):                                   # reaching front legs / paws on the door
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


def bin_pile(cv, x, y, s, t):
    pill_shadow(cv, x, y + 2, s * 1.9, s * .2, DEEP)
    # spilled rubbish on the floor
    shaded(cv, rrp(x + s * .5, y - s * .16, x + s * 1.1, y - s * .02, s * .04), '#FFF1C8', dark('#FFF1C8', .3), dx=-3, dy=-2)
    cv.drawPath(rrp(x + s * .5, y - s * .1, x + s * 1.1, y - s * .06, 2), paint('#E8335B'))
    for cx_, c in ((x - s * .78, '#FF3D5A'), (x - s * .6, '#61E7ED')):
        shaded(cv, rrp(cx_ - s * .09, y - s * .22, cx_ + s * .09, y - s * .02, s * .03), c, dark(c, .3), dx=-2, dy=-1)
    cv.drawPath(poly([(x - s * 1.0, y - s * .04), (x - s * .86, y - s * .12), (x - s * .76, y - s * .05)]), paint('#FFD23F'))
    # bin
    body = poly([(x - s * .52, y - s * 1.1), (x + s * .52, y - s * 1.1), (x + s * .44, y), (x - s * .44, y)])
    shaded(cv, body, '#8E9AD8', dark('#8E9AD8', .3), dx=-s * .06, dy=0)
    for k_ in (-.22, 0, .22):
        cv.drawPath(poly([(x + k_ * s, y - s * 1.0), (x + k_ * s * .9, y - s * .1)], False), paint('#7480C4', stroke=max(1.5, s * .04)))
    cv.drawPath(rrp(x - s * .58, y - s * 1.2, x + s * .58, y - s * 1.06, s * .05), paint('#6B77C8'))
    # heap of bags spilling over the top
    for bx, by, r, c in ((-.3, -1.5, .4, '#1A1E3A'), (.28, -1.55, .42, '#252A55'), (0, -1.95, .36, '#1A1E3A'), (.6, -1.28, .26, '#252A55')):
        shaded(cv, cp(x + bx * s, y + by * s, r * s), c, dark(c, .3), dx=-s * .05, dy=-s * .05)
        cv.drawPath(poly([(x + bx * s - s * .05, y + by * s - r * s), (x + bx * s, y + by * s - r * s - s * .13), (x + bx * s + s * .06, y + by * s - r * s)]), paint(c))
        gloss_line(cv, x + bx * s - r * s * .5, y + by * s - r * s * .3, x + bx * s - r * s * .25, y + by * s - r * s * .6, max(1.5, s * .035), 150)
    cv.save()                                            # lid knocked ajar
    cv.translate(x + s * .62, y - s * 1.12)
    cv.rotate(-28)
    cv.drawPath(rrp(-s * .5, -s * .08, s * .5, s * .08, s * .05), paint('#6B77C8'))
    cv.restore()
    # stink lines + flies
    for i in range(3):
        ph = (t * .8 + i * .33) % 1
        p = skia.Path()
        sx = x - s * .3 + i * s * .3
        p.moveTo(sx, y - s * 2.3 - ph * s * .7)
        p.cubicTo(sx + s * .1, y - s * 2.45 - ph * s * .7, sx - s * .1, y - s * 2.6 - ph * s * .7, sx, y - s * 2.75 - ph * s * .7)
        cv.drawPath(p, paint('#8BE04F', A(220 * (1 - ph)), stroke=max(2, s * .05)))
    for i in range(4):
        a = t * 3 + i * 1.6
        fx = x + math.cos(a) * s * (.5 + i * .12)
        fy = y - s * 2.35 + math.sin(a * 1.3) * s * .25
        cv.drawCircle(fx, fy, max(1.6, s * .035), paint('#15152B'))
        cv.drawPath(poly([(fx - s * .05, fy - s * .04), (fx, fy - s * .01), (fx + s * .05, fy - s * .04)], False), paint('#FFFFFF', 200, stroke=1.4))


def sofa_and_player(cv, t):
    sway = math.sin(t * 2.3) * 5
    lean = math.sin(t * 1.1) * 2
    cx = 540
    glow(cv, cx, 930, 170, '#7FFFA0', 55)
    pill_shadow(cv, cx, 1346, 800, 46, DEEP)
    # player seen from behind
    hoodie = '#2E6BFF'
    cv.save()
    cv.rotate(lean, cx, 1150)
    cv.drawCircle(cx + sway * .4, 1010, 66, paint(dark(hoodie, .15)))                    # hood
    shaded(cv, rrp(cx - 125 + sway, 1015, cx + 125 + sway, 1240, 60), hoodie, dark(hoodie, .3), dx=-10, dy=-4)
    for sd in (-1, 1):
        cv.drawPath(poly([(cx + sd * 108 + sway, 1055), (cx + sd * 150 + sway, 1160)], False), paint(dark(hoodie, .3), stroke=62))
        cv.drawPath(poly([(cx + sd * 108 + sway, 1055), (cx + sd * 150 + sway, 1160)], False), paint(hoodie, stroke=56))
    cv.drawPath(rrp(cx - 22 + sway * .5, 985, cx + 22 + sway * .5, 1040, 8), paint('#FFAC7E'))
    for sd in (-1, 1):
        cv.drawCircle(cx + sd * 66 + sway * .6, 955, 14, paint('#FFAC7E'))
    shaded(cv, cp(cx + sway * .6, 940, 68), '#1F2A78', dark('#1F2A78', .3), dx=-8, dy=-6)
    gloss_arc(cv, cx + sway * .6, 940, 52, 205, 50, 7)
    gloss_arc(cv, cx + sway * .6, 940, 52, 258, 8, 7)
    cv.drawOval(R(cx - 32 + sway * .6, 985, cx + 32 + sway * .6, 1012), paint('#FFAC7E'))     # nape
    cv.restore()
    # sofa back + arms in front
    shaded(cv, rrp(215, 1070, 865, 1346, 70), PURP, dx=-12, dy=-12)
    for cx_ in (350, 730):
        shaded(cv, rrp(cx_ - 100, 1110, cx_ + 100, 1340, 40), '#B65BE0', dx=-8, dy=-8)
        gloss_line(cv, cx_ - 70, 1140, cx_ - 70, 1195, 8)
    for x0 in (150, 840):
        shaded(cv, rrp(x0, 1090, x0 + 100, 1346, 44), '#8A2BB0', dx=-9, dy=-9)
        gloss_line(cv, x0 + 28, 1125, x0 + 28, 1185, 8)


# ------------------------------------------------------------------ camera
def camera(t):
    z1 = ease(prog(t, 3.2, 5.2))
    z2 = ease(prog(t, 5.9, 8.4))
    k = 2.3 + .08 * prog(t, 0, 3.2)
    k = lerp(k, 1.5, z1)
    k = lerp(k, 1.0, z2)
    fy = lerp(lerp(565, 700, z1), 670, z2)
    sy = lerp(lerp(640, 700, z1), 670, z2)
    return k, 540, fy, 540, sy


def draw(cv, t, fi):
    cv.drawRect(R(0, 0, W, H), paint(shader=lin(0, 0, 0, H, [NAVY0, NAVY1])))
    halos(cv, 540, 1700, 120, 5, 90, NAVY2, 60)
    sparkle_field(cv, t, 61, 30, 1350, H)
    cv.save()
    cv.clipRect(R(0, 0, W, SCENE_BOTTOM))
    k, fx, fy, sx, sy = camera(t)
    cv.translate(sx, sy)
    cv.scale(k, k)
    cv.translate(-fx, -fy)
    room_bg(cv, t)
    wallpaper(cv, t)
    kitchen(cv, t)
    door_cat(cv, t)
    tv_unit(cv, t)
    bin_pile(cv, 76, 1318, 82, t)
    sofa_and_player(cv, t)
    cv.restore()
    cv.drawRect(R(0, SCENE_BOTTOM, W, SCENE_BOTTOM + 8), paint(YEL))
    subtitle(cv, t, .5, 99, CAPTION, cy=1500, fade_out=False)
    fade = 1 - prog(t, 0, .3)
    if fade > 0:
        cv.drawRect(R(0, 0, W, H), paint('#000000', 255 * fade))


if __name__ == '__main__':
    run('gta6_chores', DUR, draw)
