"""Découpe les 4 décors (decor-svg-orig/*.svg, faits dans Claude Design) en plans pour le jeu
(web/assets/decor/<ambiance>_<plan>.svg) et harmonise les contours avec les personnages :
encre noire partout, trait d'environ 2 px (1,7 px pour le fond).
Usage : python3 tools/decor_build.py   (depuis la racine du projet)"""
import copy, xml.etree.ElementTree as ET

NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", NS)
q = lambda t: "{%s}%s" % (NS, t)
INK = "#1D1B22"
FAR_INK = {"jour": "#747074", "crepuscule": "#766866", "nuit": "#24212E", "hiver": "#737379"}
NUAGES = {"nuages"}                      # plan mobile
PAD = {"nenuphar-principal", "neige-nenuphar"}
T_FRONT, T_BACK = 2.0, 1.7                # épaisseur visée des contours


def f(e, k, d=0.0):
    try: return float(e.get(k, d))
    except (TypeError, ValueError): return d


def thin(parent, inks, t):
    """Amincit les contours : formes d'encre dupliquées derrière une forme colorée, et traits."""
    kids = list(parent)
    for i, e in enumerate(kids):
        tag = e.tag.split("}")[1]
        fill, stroke = (e.get("fill") or "").upper(), (e.get("stroke") or "").upper()
        ahead = kids[i + 1:i + 40]
        if fill in inks and tag in ("circle", "ellipse", "rect") and not stroke:
            for o in ahead:
                if o.tag != e.tag or (o.get("fill") or "").upper() in inks: continue
                if tag == "rect":
                    same = abs((f(e, "x") + f(e, "width") / 2) - (f(o, "x") + f(o, "width") / 2)) < 0.6 and \
                           abs((f(e, "y") + f(e, "height") / 2) - (f(o, "y") + f(o, "height") / 2)) < 0.6
                    if same and f(o, "width") < f(e, "width"):
                        e.set("x", "%.2f" % (f(o, "x") - t)); e.set("y", "%.2f" % (f(o, "y") - t))
                        e.set("width", "%.2f" % (f(o, "width") + 2 * t)); e.set("height", "%.2f" % (f(o, "height") + 2 * t))
                        if e.get("rx"): e.set("rx", "%.2f" % (f(o, "rx") + t))
                        break
                else:
                    same = abs(f(e, "cx") - f(o, "cx")) < 0.6 and abs(f(e, "cy") - f(o, "cy")) < 0.6 and \
                           e.get("transform") == o.get("transform")
                    if not same: continue
                    if tag == "circle" and f(o, "r") < f(e, "r"):
                        e.set("r", "%.2f" % (f(o, "r") + t)); break
                    if tag == "ellipse" and f(o, "rx") < f(e, "rx"):
                        e.set("rx", "%.2f" % (f(o, "rx") + t)); e.set("ry", "%.2f" % (f(o, "ry") + t)); break
        elif stroke in inks and e.get("stroke-width"):
            w = f(e, "stroke-width")
            if (e.get("fill") or "none") == "none":
                twin = next((o for o in ahead if o.get("d") and o.get("d") == e.get("d")
                             and (o.get("stroke") or "").upper() not in inks and o.get("stroke-width")), None)
                e.set("stroke-width", "%.2f" % (f(twin, "stroke-width") + 2 * t if twin is not None else max(1.2, w * 0.62)))
            else:
                e.set("stroke-width", "%.2f" % min(w, t))
        if tag == "g": thin(e, inks, t)
    for e in parent.iter():
        for k in ("fill", "stroke"):
            if (e.get(k) or "").upper() in inks: e.set(k, INK)


def build(v):
    root = ET.parse(f"decor-svg-orig/{v}.svg").getroot()
    inks = {INK, FAR_INK[v].upper()}
    tops = list(root)
    names = [e.get("id") for e in tops]
    i_mare = names.index("mare")

    def make(elems, t):
        r = ET.Element(q("svg"), {"viewBox": "0 0 320 692", "width": "960", "height": "2076"})
        for e in elems: r.append(e)
        thin(r, inks, t)
        return ET.tostring(r, encoding="unicode")

    back = [copy.deepcopy(e) for e in tops[:i_mare] if e.get("id") not in NUAGES]
    front = []
    for e in tops[i_mare:]:
        e = copy.deepcopy(e)
        for g in e.iter(q("g")):
            gid = g.get("id")
            if gid == "dalle-ombeline": g.set("transform", "translate(11 0)")   # sous les pieds d'Ombeline
            if gid in PAD: g.set("transform", "translate(-8 0)")                # centré sous la grenouille
            if gid == "fleur-lotus": g.set("transform", "translate(16 2)")
        front.append(e)
    out = f"web/assets/decor/{v}"
    open(out + "_fond.svg", "w").write(make(back, T_BACK))
    open(out + "_avant.svg", "w").write(make(front, T_FRONT))
    open(out + "_nuages.svg", "w").write(make([copy.deepcopy(e) for e in tops if e.get("id") in NUAGES], T_BACK))


for v in FAR_INK: build(v)
