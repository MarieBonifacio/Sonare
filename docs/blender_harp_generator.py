"""
blender_harp_generator.py — Harpe renard celtique 36 cordes
======================================================================
Exécuter dans Blender 3.x / 4.x :
  Scripting → ouvrir ce fichier → Exécuter le script
ou en ligne de commande :
  blender --python blender_harp_generator.py

Sortie : public/models/harp/harp_fox.glb (chemin relatif au script)

Dimensions nominales :
  Hauteur 1200 mm × Largeur 400 mm × Profondeur 100 mm (max)
  36 cordes cylindriques (rayon 1 mm), C2 → C7, accord do majeur
  Origine (0, 0, 0) = centre bas de la harpe
  Axe Z = hauteur ; axe X = largeur ; axe Y = profondeur (face avant Y+)

Anatomie d'une harpe celtique (vue de face, joueur côté Y+) :

       ╭─renard──╮
       |   ╲╲╲   |╲
   pilier   ╲╲╲╲ |  ╲   ← console (cou) en arche
   (courbe)  ╲╲╲╲|    ╲
       |     ╲╲╲╲|     ╲
       |      ╲╲╲╲|     ╲  ← caisse de résonance
       |        ╲╲╲|      ╲    triangulaire évasée vers le haut
       |          ╲|       ╲
       |           |        ╲
   ────┴─── socle ──╲────────╲
   (0,0,0)

Hiérarchie de collections :
  Harpe_Structure  : Socle, Pilier, Console, Caisse_resonance, Table_harmonie
  Harpe_Renard     : Renard_crane, _museau, _truffe, _oreilles, _yeux
  Harpe_Chevilles  : Cheville_01 … Cheville_36
  Harpe_Cordes     : Corde_01_C2 … Corde_36_C7
"""

import bpy
import bmesh
import math
import os
from mathutils import Vector, Quaternion

# ── Constantes de dimension ───────────────────────────────────────────────────

MM = 0.001        # 1 mm → 1 m (unité native Blender)

H = 1200 * MM     # hauteur totale
W = 400  * MM     # largeur totale
D = 100  * MM     # profondeur (maximum, en haut de la caisse)

RAYON_CORDE = 1 * MM
NB_CORDES   = 36

# ── Palette de couleurs ───────────────────────────────────────────────────────

BOIS_CLAIR = (0.784, 0.565, 0.290, 1.0)   # cerisier clair — corps
BOIS_MID   = (0.628, 0.408, 0.157, 1.0)   # cerisier mi-ton — table
BOIS_FONCE = (0.431, 0.247, 0.063, 1.0)   # cerisier foncé — caisse, socle
LAITON     = (0.749, 0.690, 0.380, 1.0)   # chevilles dorées
CORDE_C    = (0.878, 0.188, 0.188, 1.0)   # rouge  — Do
CORDE_F    = (0.227, 0.227, 0.690, 1.0)   # bleu   — Fa
CORDE_NAT  = (0.847, 0.812, 0.678, 1.0)   # ivoire — autres

# ── Séquence des 36 notes (C2 → C7) ──────────────────────────────────────────

GAMME = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
NOTES = [n for _ in range(5) for n in GAMME] + ['C']

# ── Points de référence structurels ───────────────────────────────────────────
#
# Pilier : courbe convexe vers la gauche
#   pied  : X ≈ -W·0.42, Z = 40 mm
#   ventre: X ≈ -W·0.55, Z ≈ H·0.50  (point le plus à gauche)
#   tête  : X ≈ -W·0.42, Z ≈ H·0.93  (jonction console)

X_PILIER_PIED   = -W * 0.42
Z_PILIER_PIED   = 40 * MM
X_PILIER_VENTRE = -W * 0.55
Z_PILIER_VENTRE = H * 0.50
X_PILIER_TETE   = -W * 0.42
Z_PILIER_TETE   = H * 0.93

# Console : arche depuis le haut du pilier jusque dans la caisse
#   départ : haut du pilier (X ≈ -W·0.42, Z ≈ H·0.93)
#   sommet : X ≈ 0, Z ≈ H·1.0
#   arrivée: X ≈ W·0.18, Z ≈ H·0.90  (entre dans le haut de la caisse)

X_CONSOLE_FIN   = W * 0.18
Z_CONSOLE_FIN   = H * 0.90

# Caisse de résonance : prisme évasé
#   bas (étroit)     : X ∈ [+W·0.10, +W·0.22], Z = 50 mm
#   haut (large)     : X ∈ [-W·0.05, +W·0.30], Z ≈ H·0.88
#   profondeur Y     : ±20 mm en bas → ±D/2 en haut

X_CAISSE_BAS_G   = W * 0.10
X_CAISSE_BAS_D   = W * 0.22
X_CAISSE_HAUT_G  = -W * 0.05
X_CAISSE_HAUT_D  = W * 0.30
Z_CAISSE_BAS     = 50 * MM
Z_CAISSE_HAUT    = H * 0.88
Y_CAISSE_BAS     = 18 * MM
Y_CAISSE_HAUT    = D / 2

# Tête de renard : à la jonction pilier ↔ console (en haut à gauche)
X_RENARD = X_PILIER_TETE + 5 * MM
Z_RENARD = Z_PILIER_TETE + 35 * MM

# Plage paramétrique sur la console pour les chevilles/cordes
T_CORDE_MIN = 0.06
T_CORDE_MAX = 0.94

# ── Utilitaires scène ─────────────────────────────────────────────────────────

def purger_scene():
    """Supprime tous les objets et données orphelines."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    for bloc in list(bpy.data.meshes):
        bpy.data.meshes.remove(bloc)
    for bloc in list(bpy.data.curves):
        bpy.data.curves.remove(bloc)
    for bloc in list(bpy.data.materials):
        bpy.data.materials.remove(bloc)


def configurer_scene():
    """Système métrique."""
    s = bpy.context.scene
    s.unit_settings.system       = 'METRIC'
    s.unit_settings.scale_length = 1.0
    s.unit_settings.length_unit  = 'METERS'


def creer_materiau(nom, rgba, roughness=0.65, metallic=0.02):
    """Principled BSDF avec couleur de base."""
    mat = bpy.data.materials.new(name=nom)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = rgba
    bsdf.inputs['Roughness'].default_value  = roughness
    bsdf.inputs['Metallic'].default_value   = metallic
    return mat


def affecter_mat(obj, mat):
    """Affecte un matériau à un mesh ou une courbe."""
    data = obj.data
    if data.materials:
        data.materials[0] = mat
    else:
        data.materials.append(mat)


# ── Socle ─────────────────────────────────────────────────────────────────────

def creer_socle(mat):
    """Traverse horizontale de base, Z = 0 → 40 mm."""
    bpy.ops.mesh.primitive_cube_add(location=(0, 0, 20 * MM))
    obj = bpy.context.active_object
    obj.name  = 'Socle'
    obj.scale = (W / 2, D / 2 * 0.95, 20 * MM)
    bpy.ops.object.transform_apply(scale=True)
    affecter_mat(obj, mat)
    return obj


# ── Pilier (courbe Bézier convexe vers la gauche) ─────────────────────────────

def _pilier_data():
    """Retourne les 3 points de contrôle Bézier du pilier."""
    return [
        Vector((X_PILIER_PIED,   0, Z_PILIER_PIED)),
        Vector((X_PILIER_VENTRE, 0, Z_PILIER_VENTRE)),
        Vector((X_PILIER_TETE,   0, Z_PILIER_TETE)),
    ]


def creer_pilier(mat):
    """
    Pilier : colonne avant courbée vers la gauche (forepillar typique).
    Section ronde, rayon 18 mm, bevel rond pour un volume plein.
    """
    data = bpy.data.curves.new('Pilier_data', type='CURVE')
    data.dimensions      = '3D'
    data.resolution_u    = 32
    data.bevel_depth     = 18 * MM
    data.bevel_resolution = 8
    data.use_fill_caps   = True

    spl = data.splines.new('BEZIER')
    spl.bezier_points.add(2)   # 3 points
    pts = spl.bezier_points

    p0, p1, p2 = _pilier_data()

    pts[0].co           = p0
    pts[0].handle_left  = p0 + Vector((0,      0, -0.06))
    pts[0].handle_right = p0 + Vector((-0.04,  0,  0.20))

    pts[1].co           = p1
    pts[1].handle_left  = p1 + Vector((0,      0, -0.20))
    pts[1].handle_right = p1 + Vector((0,      0,  0.20))

    pts[2].co           = p2
    pts[2].handle_left  = p2 + Vector((-0.04,  0, -0.18))
    pts[2].handle_right = p2 + Vector(( 0.04,  0,  0.04))

    for pt in pts:
        pt.handle_left_type  = 'FREE'
        pt.handle_right_type = 'FREE'

    obj = bpy.data.objects.new('Pilier', data)
    bpy.context.collection.objects.link(obj)
    affecter_mat(obj, mat)
    return obj


# ── Console (arche depuis le pilier jusqu'à la caisse) ───────────────────────

def _console_pts():
    """4 points de contrôle Bézier de la console."""
    return [
        Vector((X_PILIER_TETE + 8 * MM, 0, Z_PILIER_TETE + 25 * MM)),  # P0 départ
        Vector((-W * 0.18,              0, H * 1.005)),                 # P1 montée
        Vector(( W * 0.05,              0, H * 0.99)),                  # P2 sommet
        Vector((X_CONSOLE_FIN,          0, Z_CONSOLE_FIN)),             # P3 arrivée caisse
    ]


def creer_console(mat):
    """Console : arche en S, rentre dans le haut de la caisse."""
    data = bpy.data.curves.new('Console_data', type='CURVE')
    data.dimensions      = '3D'
    data.resolution_u    = 40
    data.bevel_depth     = 16 * MM
    data.bevel_resolution = 6
    data.use_fill_caps   = True

    spl = data.splines.new('BEZIER')
    spl.bezier_points.add(3)
    pts = spl.bezier_points

    p0, p1, p2, p3 = _console_pts()

    pts[0].co           = p0
    pts[0].handle_left  = p0 + Vector((-0.04, 0, -0.04))
    pts[0].handle_right = p0 + Vector(( 0.06, 0,  0.05))

    pts[1].co           = p1
    pts[1].handle_left  = p1 + Vector((-0.06, 0, -0.005))
    pts[1].handle_right = p1 + Vector(( 0.06, 0,  0.005))

    pts[2].co           = p2
    pts[2].handle_left  = p2 + Vector((-0.06, 0,  0.01))
    pts[2].handle_right = p2 + Vector(( 0.05, 0, -0.02))

    pts[3].co           = p3
    pts[3].handle_left  = p3 + Vector((-0.04, 0,  0.05))
    pts[3].handle_right = p3 + Vector(( 0.02, 0, -0.03))

    for pt in pts:
        pt.handle_left_type  = 'FREE'
        pt.handle_right_type = 'FREE'

    obj = bpy.data.objects.new('Console', data)
    bpy.context.collection.objects.link(obj)
    affecter_mat(obj, mat)
    return obj


def _point_console(t):
    """
    Cubique de Bézier reprenant les 4 points de _console_pts().
    Utilisée pour placer chevilles + extrémité haute des cordes.
    """
    p0, p1, p2, p3 = _console_pts()
    u = 1 - t
    return u**3 * p0 + 3 * u**2 * t * p1 + 3 * u * t**2 * p2 + t**3 * p3


# ── Caisse de résonance (prisme évasé) ────────────────────────────────────────

def creer_caisse(mat):
    """
    Caisse de résonance triangulaire vue de profil :
      - Bas étroit  : X ∈ [+0.10W, +0.22W], Y ∈ [-18, +18] mm
      - Haut large  : X ∈ [-0.05W, +0.30W], Y ∈ [-D/2, +D/2]
    Construite via bmesh — 8 sommets, 6 faces.
    Face avant Y+ = table d'harmonie ; cordes y sont fixées.
    """
    bm = bmesh.new()

    # 8 sommets — bas (4) + haut (4)
    v_bas_av_g = bm.verts.new((X_CAISSE_BAS_G,  +Y_CAISSE_BAS,  Z_CAISSE_BAS))
    v_bas_av_d = bm.verts.new((X_CAISSE_BAS_D,  +Y_CAISSE_BAS,  Z_CAISSE_BAS))
    v_bas_ar_d = bm.verts.new((X_CAISSE_BAS_D,  -Y_CAISSE_BAS,  Z_CAISSE_BAS))
    v_bas_ar_g = bm.verts.new((X_CAISSE_BAS_G,  -Y_CAISSE_BAS,  Z_CAISSE_BAS))

    v_haut_av_g = bm.verts.new((X_CAISSE_HAUT_G, +Y_CAISSE_HAUT, Z_CAISSE_HAUT))
    v_haut_av_d = bm.verts.new((X_CAISSE_HAUT_D, +Y_CAISSE_HAUT, Z_CAISSE_HAUT))
    v_haut_ar_d = bm.verts.new((X_CAISSE_HAUT_D, -Y_CAISSE_HAUT, Z_CAISSE_HAUT))
    v_haut_ar_g = bm.verts.new((X_CAISSE_HAUT_G, -Y_CAISSE_HAUT, Z_CAISSE_HAUT))

    # 6 faces (normales sortantes)
    bm.faces.new((v_bas_ar_g,  v_bas_ar_d,  v_bas_av_d,  v_bas_av_g))    # bas
    bm.faces.new((v_haut_av_g, v_haut_av_d, v_haut_ar_d, v_haut_ar_g))   # haut
    bm.faces.new((v_bas_av_g,  v_bas_av_d,  v_haut_av_d, v_haut_av_g))   # avant (Y+)
    bm.faces.new((v_bas_ar_d,  v_bas_ar_g,  v_haut_ar_g, v_haut_ar_d))   # arrière (Y-)
    bm.faces.new((v_bas_ar_g,  v_bas_av_g,  v_haut_av_g, v_haut_ar_g))   # gauche (X-)
    bm.faces.new((v_bas_av_d,  v_bas_ar_d,  v_haut_ar_d, v_haut_av_d))   # droite (X+)

    bm.normal_update()

    me = bpy.data.meshes.new('Caisse_data')
    bm.to_mesh(me)
    bm.free()

    obj = bpy.data.objects.new('Caisse_resonance', me)
    bpy.context.collection.objects.link(obj)
    affecter_mat(obj, mat)
    return obj


# ── Table d'harmonie (face avant de la caisse, surlignée) ─────────────────────

def creer_table_harmonie(mat):
    """Plaque fine plaquée sur la face avant de la caisse (Y+)."""
    bm = bmesh.new()

    eps = 1.5 * MM   # léger relief vers l'avant
    v0 = bm.verts.new((X_CAISSE_BAS_G,  Y_CAISSE_BAS  + eps, Z_CAISSE_BAS))
    v1 = bm.verts.new((X_CAISSE_BAS_D,  Y_CAISSE_BAS  + eps, Z_CAISSE_BAS))
    v2 = bm.verts.new((X_CAISSE_HAUT_D, Y_CAISSE_HAUT + eps, Z_CAISSE_HAUT))
    v3 = bm.verts.new((X_CAISSE_HAUT_G, Y_CAISSE_HAUT + eps, Z_CAISSE_HAUT))
    bm.faces.new((v0, v1, v2, v3))
    bm.normal_update()

    me = bpy.data.meshes.new('Table_data')
    bm.to_mesh(me)
    bm.free()

    obj = bpy.data.objects.new('Table_harmonie', me)
    bpy.context.collection.objects.link(obj)
    affecter_mat(obj, mat)
    return obj


# ── Cordes ────────────────────────────────────────────────────────────────────

def _point_table(t):
    """
    Point d'attache d'une corde sur la table d'harmonie (face avant de la caisse).
    t=0  → bas-droite de la table (corde basse, longue)
    t=1  → haut-gauche de la table (corde aiguë, courte)
    Suit l'inclinaison de la diagonale avant.
    """
    # On longe la diagonale (X_CAISSE_BAS_D, Z_CAISSE_BAS) → (X_CAISSE_HAUT_G, Z_CAISSE_HAUT)
    x = X_CAISSE_BAS_D + t * (X_CAISSE_HAUT_G - X_CAISSE_BAS_D)
    z = Z_CAISSE_BAS   + t * (Z_CAISSE_HAUT   - Z_CAISSE_BAS)
    y = Y_CAISSE_BAS   + t * (Y_CAISSE_HAUT   - Y_CAISSE_BAS) + 2 * MM
    return Vector((x, y, z))


def creer_cordes(mats):
    """
    36 cordes (rayon 1 mm) tendues entre la console et la table d'harmonie.
    Corde 0  (C2, basse) : t≈0.06 console → t≈0.04 table  (corde la plus longue)
    Corde 35 (C7, aiguë) : t≈0.94 console → t≈0.96 table  (corde la plus courte)
    """
    cordes = []
    z_ax = Vector((0, 0, 1))

    for i in range(NB_CORDES):
        ratio = i / (NB_CORDES - 1)
        t_console = T_CORDE_MIN + ratio * (T_CORDE_MAX - T_CORDE_MIN)
        t_table   = 0.04 + ratio * 0.92

        pt_h = _point_console(t_console)
        pt_b = _point_table(t_table)

        direction = pt_b - pt_h
        longueur  = direction.length
        milieu    = pt_h.lerp(pt_b, 0.5)

        d_norm = direction.normalized()
        dot    = z_ax.dot(d_norm)
        if abs(dot) > 0.9999:
            rot = (math.pi if dot < 0 else 0, 0, 0)
        else:
            axe   = z_ax.cross(d_norm).normalized()
            angle = math.acos(max(-1.0, min(1.0, dot)))
            rot   = Quaternion(axe, angle).to_euler()

        note   = NOTES[i]
        octave = 2 + i // 7
        nom    = f'Corde_{i + 1:02d}_{note}{octave}'

        bpy.ops.mesh.primitive_cylinder_add(
            radius=RAYON_CORDE,
            depth=longueur,
            location=milieu,
            rotation=rot,
            vertices=8,
        )
        corde = bpy.context.active_object
        corde.name = nom
        affecter_mat(
            corde,
            mats['C'] if note == 'C' else mats['F'] if note == 'F' else mats['nat'],
        )
        cordes.append(corde)

    return cordes


# ── Chevilles d'accordage ─────────────────────────────────────────────────────

def creer_chevilles(mat):
    """36 chevilles laiton, perpendiculaires à la console, saillantes en Y+."""
    chevilles = []
    for i in range(NB_CORDES):
        ratio = i / (NB_CORDES - 1)
        t     = T_CORDE_MIN + ratio * (T_CORDE_MAX - T_CORDE_MIN)
        pos   = _point_console(t) + Vector((0, 22 * MM, 0))

        bpy.ops.mesh.primitive_cylinder_add(
            radius=3 * MM,
            depth=18 * MM,
            location=pos,
            rotation=(math.pi / 2, 0, 0),
            vertices=10,
        )
        cheville      = bpy.context.active_object
        cheville.name = f'Cheville_{i + 1:02d}'
        affecter_mat(cheville, mat)
        chevilles.append(cheville)

    return chevilles


# ── Tête de renard (jonction pilier ↔ console, en haut à gauche) ─────────────

def creer_tete_renard(mat_bois, mat_fonce):
    """
    Tête de renard sculptée à la jonction pilier ↔ console.
    Le museau pointe vers la droite (vers les cordes / le joueur).
    """
    ox, oz = X_RENARD, Z_RENARD
    objets = []

    def sphere(nom, r, pos, sc=(1, 1, 1)):
        bpy.ops.mesh.primitive_uv_sphere_add(
            radius=r, location=pos, segments=22, ring_count=14,
        )
        o = bpy.context.active_object
        o.name  = nom
        o.scale = sc
        bpy.ops.object.transform_apply(scale=True)
        return o

    def cone(nom, r1, r2, depth, pos, rot=(0, 0, 0)):
        bpy.ops.mesh.primitive_cone_add(
            radius1=r1, radius2=r2, depth=depth,
            location=pos, rotation=rot, vertices=12,
        )
        o = bpy.context.active_object
        o.name = nom
        return o

    # Crâne — ellipsoïde allongé en X (museau pointe vers X+)
    crane = sphere('Renard_crane', 32 * MM, (ox, 0, oz), sc=(1.45, 0.62, 1.00))
    affecter_mat(crane, mat_bois)
    objets.append(crane)

    # Museau — cône tronqué vers X+, légèrement incliné vers le bas
    museau = cone(
        'Renard_museau',
        18 * MM, 5 * MM, 70 * MM,
        (ox + 56 * MM, 0, oz - 14 * MM),
        rot=(0, math.pi / 2 + 0.18, 0),
    )
    affecter_mat(museau, mat_bois)
    objets.append(museau)

    # Truffe — petite sphère sombre
    truffe = sphere('Renard_truffe', 7 * MM, (ox + 90 * MM, 0, oz - 25 * MM))
    affecter_mat(truffe, mat_fonce)
    objets.append(truffe)

    # Oreilles pointues (Y± = côtés)
    for signe, nom in ((+1, 'Renard_oreille_G'), (-1, 'Renard_oreille_D')):
        oreille = cone(
            nom,
            10 * MM, 1 * MM, 56 * MM,
            (ox - 8 * MM, signe * 18 * MM, oz + 42 * MM),
            rot=(-signe * 0.10, 0, signe * 0.08),
        )
        affecter_mat(oreille, mat_bois)
        objets.append(oreille)

    # Yeux — sphères sombres
    for signe, nom in ((+1, 'Renard_oeil_G'), (-1, 'Renard_oeil_D')):
        oeil = sphere(nom, 4.5 * MM, (ox + 16 * MM, signe * 22 * MM, oz + 8 * MM))
        affecter_mat(oeil, mat_fonce)
        objets.append(oeil)

    return objets


# ── Organisation en collections ───────────────────────────────────────────────

def regrouper(nom_col, objets):
    """Déplace les objets dans une collection nommée."""
    col = bpy.data.collections.new(nom_col)
    bpy.context.scene.collection.children.link(col)
    for obj in objets:
        for c in list(obj.users_collection):
            c.objects.unlink(obj)
        col.objects.link(obj)
    return col


# ── Export GLB ────────────────────────────────────────────────────────────────

def exporter_glb():
    """Exporte vers ../public/models/harp/harp_fox.glb."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    sortie = os.path.normpath(
        os.path.join(script_dir, '..', 'public', 'models', 'harp', 'harp_fox.glb')
    )
    os.makedirs(os.path.dirname(sortie), exist_ok=True)

    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=sortie,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_materials='EXPORT',
        export_normals=True,
    )
    print(f"  GLB exporté : {sortie}")
    return sortie


# ── Point d'entrée ────────────────────────────────────────────────────────────

def main():
    """Construit la harpe renard celtique et exporte en GLB."""
    purger_scene()
    configurer_scene()

    # Matériaux
    m_bois  = creer_materiau('Bois_clair', BOIS_CLAIR)
    m_mid   = creer_materiau('Bois_mid',   BOIS_MID)
    m_fonce = creer_materiau('Bois_fonce', BOIS_FONCE)
    m_lait  = creer_materiau('Laiton',     LAITON,    roughness=0.20, metallic=0.95)
    m_c     = creer_materiau('Corde_Do',   CORDE_C,   roughness=0.40, metallic=0.55)
    m_f     = creer_materiau('Corde_Fa',   CORDE_F,   roughness=0.40, metallic=0.55)
    m_nat   = creer_materiau('Corde_Nat',  CORDE_NAT, roughness=0.40, metallic=0.55)

    mats_cordes = {'C': m_c, 'F': m_f, 'nat': m_nat}

    # Structure
    socle   = creer_socle(m_fonce)
    pilier  = creer_pilier(m_bois)
    console = creer_console(m_bois)
    caisse  = creer_caisse(m_fonce)
    table   = creer_table_harmonie(m_mid)

    # Cordes + chevilles
    cordes    = creer_cordes(mats_cordes)
    chevilles = creer_chevilles(m_lait)

    # Renard
    renard = creer_tete_renard(m_bois, m_fonce)

    # Hiérarchie
    regrouper('Harpe_Structure', [socle, pilier, console, caisse, table])
    regrouper('Harpe_Renard',    renard)
    regrouper('Harpe_Chevilles', chevilles)
    regrouper('Harpe_Cordes',    cordes)

    sortie = exporter_glb()

    print(
        f"\n✓ Harpe renard celtique générée"
        f"\n  {NB_CORDES} cordes · {H*1000:.0f} × {W*1000:.0f} × {D*1000:.0f} mm"
        f"\n  Pilier courbe + console arche + caisse triangulaire évasée"
        f"\n  Tête renard à la jonction pilier ↔ console (museau vers X+)"
        f"\n  Charger dans Sonare : public/models/harp/harp_fox.glb"
    )


main()
