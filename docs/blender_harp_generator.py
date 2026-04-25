"""
blender_harp_generator.py — Harpe renard celtique 36 cordes
======================================================================
Exécuter dans Blender 3.x / 4.x :
  Scripting → ouvrir ce fichier → Exécuter le script
ou en ligne de commande :
  blender --python blender_harp_generator.py

Sortie : public/models/harp/harp_fox.glb (chemin relatif au script)

Dimensions nominales :
  Hauteur 1200 mm × Largeur 400 mm × Profondeur 100 mm
  36 cordes cylindriques (rayon 1 mm), C2 → C7, accord do majeur
  Origine (0, 0, 0) = centre bas de la harpe
  Axe Z = hauteur ; axe X = largeur ; axe Y = profondeur avant/arrière

Hiérarchie de collections :
  Harpe_Structure  : Socle, Pilier, Console, Table_harmonie
  Harpe_Renard     : Renard_crane, _museau, _truffe, _oreille_G/D, _oeil_G/D
  Harpe_Chevilles  : Cheville_01 … Cheville_36
  Harpe_Cordes     : Corde_01_C2 … Corde_36_C7
"""

import bpy
import math
import os
from mathutils import Vector, Quaternion

# ── Constantes de dimension ───────────────────────────────────────────────────

MM = 0.001        # 1 mm → 1 m (unité native Blender)

H = 1200 * MM     # hauteur totale
W = 400  * MM     # largeur totale
D = 100  * MM     # profondeur

RAYON_CORDE = 1 * MM
NB_CORDES   = 36

# ── Palette de couleurs ───────────────────────────────────────────────────────

BOIS_CLAIR = (0.784, 0.565, 0.290, 1.0)   # cerisier clair — corps
BOIS_FONCE = (0.431, 0.247, 0.063, 1.0)   # cerisier foncé — table, socle
LAITON     = (0.749, 0.690, 0.380, 1.0)   # chevilles dorées
CORDE_C    = (0.878, 0.188, 0.188, 1.0)   # rouge  — cordes Do
CORDE_F    = (0.227, 0.227, 0.690, 1.0)   # bleu   — cordes Fa
CORDE_NAT  = (0.847, 0.812, 0.678, 1.0)   # ivoire — cordes naturelles

# ── Séquence des 36 notes (C2 → C7, gamme diatonique) ────────────────────────

GAMME = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
NOTES = [n for _ in range(5) for n in GAMME] + ['C']   # 35 + 1 = 36

# ── Points de référence structurels (coordonnées en mètres) ──────────────────
#
# Vue de face :
#
#   P_SOMMET ────────────────────────╮
#       /                             ╲  console
#      / (arche)                       ● P_RENARD
#  P_PIED_CONSOLE                      |
#     |                                |  cordes
#  pilier                           table
#     |                                |
#  ───┴────────────── socle ───────────┴───
#  (0,0,0)

X_PILIER       = -W / 2 + 18 * MM     # axe du pilier (gauche)
Z_PIED_PILIER  = 40 * MM              # dessus du socle
Z_HAUT_PILIER  = H * 0.745            # jonction pilier → console

X_SOMMET       = 0.0                  # pic de l'arche (centre)
Z_SOMMET       = H * 0.97

X_RENARD       = W * 0.50             # tête de renard (extrémité droite)
Z_RENARD       = H * 0.54

X_TABLE        = W * 0.44             # axe de la table d'harmonie
Z_TABLE_BAS    = 60 * MM
Z_TABLE_HAUT   = H * 0.67

# Plage paramétrique sur la console pour les 36 cordes
T_CORDE_MIN = 0.05
T_CORDE_MAX = 0.93

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
    """Système métrique, unité mètre."""
    s = bpy.context.scene
    s.unit_settings.system      = 'METRIC'
    s.unit_settings.scale_length = 1.0
    s.unit_settings.length_unit = 'METERS'


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
    """Affecte un matériau à un objet mesh ou courbe."""
    data = obj.data
    if data.materials:
        data.materials[0] = mat
    else:
        data.materials.append(mat)


# ── Construction — structure principale ──────────────────────────────────────

def creer_socle(mat):
    """Traverse horizontale de base (Z = 0 … 40 mm)."""
    bpy.ops.mesh.primitive_cube_add(location=(0, 0, 20 * MM))
    obj = bpy.context.active_object
    obj.name  = 'Socle'
    obj.scale = (W / 2, D / 2 * 0.90, 20 * MM)
    bpy.ops.object.transform_apply(scale=True)
    affecter_mat(obj, mat)
    return obj


def creer_pilier(mat):
    """
    Colonne gauche — section ovale (planche sculptée vue de face).
    Section : rayon 18 mm × aplatissement Y 0.38.
    """
    hauteur = Z_HAUT_PILIER - Z_PIED_PILIER
    bpy.ops.mesh.primitive_cylinder_add(
        radius=18 * MM,
        depth=hauteur,
        vertices=16,
        location=(X_PILIER, 0, Z_PIED_PILIER + hauteur / 2),
    )
    obj = bpy.context.active_object
    obj.name     = 'Pilier'
    obj.scale[1] = 0.38   # chant fin, comme une planche de bois sculptée
    bpy.ops.object.transform_apply(scale=True)
    affecter_mat(obj, mat)
    return obj


def creer_console(mat):
    """
    Console (cou) : arche de Bézier en 4 points.
    Bevel pour obtenir une section rectangulaire plate.
    Pilier haut → sommet de l'arche → tête de renard.
    """
    data = bpy.data.curves.new('Console_data', type='CURVE')
    data.dimensions      = '3D'
    data.resolution_u    = 32
    data.bevel_depth     = 13 * MM
    data.bevel_resolution = 4
    data.use_fill_caps   = True

    spl = data.splines.new('BEZIER')
    spl.bezier_points.add(3)
    pts = spl.bezier_points

    # P0 — pied de la console (haut du pilier)
    p0 = Vector((X_PILIER + 10 * MM, 0, Z_HAUT_PILIER))
    pts[0].co           = p0
    pts[0].handle_left  = p0 + Vector((-0.010, 0, -0.025))
    pts[0].handle_right = p0 + Vector(( 0.025, 0,  0.065))

    # P1 — montée de l'arche (premier coude intérieur)
    p1 = Vector((X_SOMMET - W * 0.25, 0, Z_SOMMET - H * 0.04))
    pts[1].co           = p1
    pts[1].handle_left  = p1 + Vector((-0.060, 0,  0.010))
    pts[1].handle_right = p1 + Vector(( 0.060, 0, -0.010))

    # P2 — sommet de l'arche
    p2 = Vector((X_SOMMET + W * 0.20, 0, Z_SOMMET))
    pts[2].co           = p2
    pts[2].handle_left  = p2 + Vector((-0.055, 0,  0.010))
    pts[2].handle_right = p2 + Vector(( 0.055, 0, -0.010))

    # P3 — jonction tête de renard
    p3 = Vector((X_RENARD - 28 * MM, 0, Z_RENARD + 28 * MM))
    pts[3].co           = p3
    pts[3].handle_left  = p3 + Vector((-0.040, 0,  0.050))
    pts[3].handle_right = p3 + Vector(( 0.020, 0, -0.020))

    for pt in pts:
        pt.handle_left_type  = 'FREE'
        pt.handle_right_type = 'FREE'

    obj = bpy.data.objects.new('Console', data)
    bpy.context.collection.objects.link(obj)
    obj.scale[1] = 0.32   # profil plat (chant) côté spectateur
    affecter_mat(obj, mat)
    return obj


def creer_table_harmonie(mat):
    """Planche verticale droite où s'attachent le bas des cordes."""
    hauteur = (Z_TABLE_HAUT - Z_TABLE_BAS) + 70 * MM
    z_c     = Z_TABLE_BAS + hauteur / 2 - 35 * MM
    bpy.ops.mesh.primitive_cube_add(location=(X_TABLE, 0, z_c))
    obj = bpy.context.active_object
    obj.name  = 'Table_harmonie'
    obj.scale = (10 * MM, D / 2 * 0.65, hauteur / 2)
    bpy.ops.object.transform_apply(scale=True)
    affecter_mat(obj, mat)
    return obj


# ── Interpolation sur la courbe de la console ─────────────────────────────────

def _point_console(t):
    """
    Cubique de Bézier reprenant les mêmes 4 points de contrôle que la console.
    Retourne Vector(x, 0, z) pour t ∈ [0, 1].
    """
    p0 = Vector((X_PILIER + 10 * MM, 0, Z_HAUT_PILIER))
    p1 = Vector((X_SOMMET - W * 0.25, 0, Z_SOMMET - H * 0.04))
    p2 = Vector((X_SOMMET + W * 0.20, 0, Z_SOMMET))
    p3 = Vector((X_RENARD - 28 * MM, 0, Z_RENARD + 28 * MM))
    u = 1 - t
    return u**3 * p0 + 3 * u**2 * t * p1 + 3 * u * t**2 * p2 + t**3 * p3


# ── Construction — cordes ─────────────────────────────────────────────────────

def creer_cordes(mats):
    """
    36 cylindres de corde (rayon 1 mm).
    Corde 0  (C2, basse)  : t ≈ 0.05 sur la console, bas de la table.
    Corde 35 (C7, aiguë)  : t ≈ 0.93 sur la console, haut de la table.
    Chaque cylindre est orienté selon la direction haut → bas.
    """
    cordes = []
    z_ax = Vector((0, 0, 1))   # axe local du cylindre primitif

    for i in range(NB_CORDES):
        t = T_CORDE_MIN + (i / (NB_CORDES - 1)) * (T_CORDE_MAX - T_CORDE_MIN)

        # Attache haute : sur la console
        pt_h = _point_console(t)

        # Attache basse : sur la table d'harmonie (interpolation linéaire verticale)
        ratio = i / (NB_CORDES - 1)
        z_b   = Z_TABLE_BAS + ratio * (Z_TABLE_HAUT - Z_TABLE_BAS)
        pt_b  = Vector((X_TABLE, 0, z_b))

        direction = pt_b - pt_h
        longueur  = direction.length
        milieu    = pt_h.lerp(pt_b, 0.5)

        # Rotation : Z local → direction corde
        d_norm = direction.normalized()
        dot    = z_ax.dot(d_norm)
        if abs(dot) > 0.9999:
            rot = (math.pi, 0, 0) if dot < 0 else (0, 0, 0)
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
        affecter_mat(corde, mats['C'] if note == 'C' else mats['F'] if note == 'F' else mats['nat'])
        cordes.append(corde)

    return cordes


# ── Construction — chevilles ──────────────────────────────────────────────────

def creer_chevilles(mat):
    """
    36 chevilles d'accordage (laiton doré).
    Petits cylindres perpendiculaires à la console, saillants vers l'avant (Y+).
    """
    chevilles = []

    for i in range(NB_CORDES):
        t   = T_CORDE_MIN + (i / (NB_CORDES - 1)) * (T_CORDE_MAX - T_CORDE_MIN)
        pos = _point_console(t) + Vector((0, D * 0.22, 0))

        bpy.ops.mesh.primitive_cylinder_add(
            radius=3 * MM,
            depth=14 * MM,
            location=pos,
            rotation=(math.pi / 2, 0, 0),
            vertices=8,
        )
        cheville      = bpy.context.active_object
        cheville.name = f'Cheville_{i + 1:02d}'
        affecter_mat(cheville, mat)
        chevilles.append(cheville)

    return chevilles


# ── Construction — tête de renard ─────────────────────────────────────────────

def creer_tete_renard(mat_bois, mat_fonce):
    """
    Tête de renard sculptée à l'extrémité droite de la console.
    Primitives : crâne (sphère ovale) + museau (cône tronqué) + truffe +
                 oreilles pointues (cônes) + yeux (petites sphères).
    """
    ox, oz = X_RENARD, Z_RENARD
    objets = []

    def sphere(nom, r, pos, sc=(1, 1, 1)):
        bpy.ops.mesh.primitive_uv_sphere_add(
            radius=r, location=pos, segments=20, ring_count=14,
        )
        o = bpy.context.active_object
        o.name  = nom
        o.scale = sc
        bpy.ops.object.transform_apply(scale=True)
        return o

    def cone(nom, r1, r2, depth, pos, rot=(0, 0, 0)):
        bpy.ops.mesh.primitive_cone_add(
            radius1=r1, radius2=r2, depth=depth,
            location=pos, rotation=rot, vertices=10,
        )
        o = bpy.context.active_object
        o.name = nom
        return o

    # Crâne — ellipsoïde allongé vers le museau
    crane = sphere('Renard_crane', 30 * MM, (ox, 0, oz), sc=(1.40, 0.58, 1.00))
    affecter_mat(crane, mat_bois)
    objets.append(crane)

    # Museau — cône tronqué incliné légèrement vers le bas
    museau = cone(
        'Renard_museau', 15 * MM, 4 * MM, 62 * MM,
        (ox + 52 * MM, 0, oz - 12 * MM),
        rot=(0, math.pi / 2 + 0.18, 0),
    )
    affecter_mat(museau, mat_bois)
    objets.append(museau)

    # Truffe — petite sphère sombre à l'extrémité du museau
    truffe = sphere('Renard_truffe', 6 * MM, (ox + 83 * MM, 0, oz - 22 * MM))
    affecter_mat(truffe, mat_fonce)
    objets.append(truffe)

    # Oreilles (Y+ = gauche harpiste, Y- = droite harpiste)
    for signe, nom in ((+1, 'Renard_oreille_G'), (-1, 'Renard_oreille_D')):
        oreille = cone(
            nom, 9 * MM, 1 * MM, 52 * MM,
            (ox - 8 * MM, signe * 17 * MM, oz + 38 * MM),
            rot=(-signe * 0.10, 0, signe * 0.08),
        )
        affecter_mat(oreille, mat_bois)
        objets.append(oreille)

    # Yeux — sphères sombres
    for signe, nom in ((+1, 'Renard_oeil_G'), (-1, 'Renard_oeil_D')):
        oeil = sphere(nom, 4 * MM, (ox + 14 * MM, signe * 21 * MM, oz + 7 * MM))
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
    """
    Exporte la scène complète en GLTF binaire (.glb).
    Destination : ../public/models/harp/harp_fox.glb
    (chemin relatif à ce script, utilisable directement par l'application Sonare)
    """
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
        export_apply=True,         # appliquer toutes les transformations
        export_materials='EXPORT',
        export_normals=True,
    )
    print(f"  GLB exporté : {sortie}")
    return sortie


# ── Point d'entrée ────────────────────────────────────────────────────────────

def main():
    """
    Construit la harpe renard celtique complète et exporte en GLB.

    Dimensions résultantes :
      Hauteur  : 1200 mm
      Largeur  : 400 mm
      Profondeur : 100 mm
      Cordes   : 36 × cylindre r=1 mm, C2 → C7
    """
    purger_scene()
    configurer_scene()

    # Matériaux
    m_bois  = creer_materiau('Bois_clair', BOIS_CLAIR)
    m_fonce = creer_materiau('Bois_fonce', BOIS_FONCE)
    m_lait  = creer_materiau('Laiton',     LAITON,   roughness=0.20, metallic=0.95)
    m_c     = creer_materiau('Corde_Do',   CORDE_C,  roughness=0.40, metallic=0.55)
    m_f     = creer_materiau('Corde_Fa',   CORDE_F,  roughness=0.40, metallic=0.55)
    m_nat   = creer_materiau('Corde_Nat',  CORDE_NAT,roughness=0.40, metallic=0.55)

    mats_cordes = {'C': m_c, 'F': m_f, 'nat': m_nat}

    # Structure principale
    socle   = creer_socle(m_fonce)
    pilier  = creer_pilier(m_bois)
    console = creer_console(m_bois)
    table   = creer_table_harmonie(m_fonce)

    # Cordes et chevilles
    cordes    = creer_cordes(mats_cordes)
    chevilles = creer_chevilles(m_lait)

    # Tête de renard
    renard = creer_tete_renard(m_bois, m_fonce)

    # Hiérarchie de collections
    regrouper('Harpe_Structure', [socle, pilier, console, table])
    regrouper('Harpe_Renard',    renard)
    regrouper('Harpe_Chevilles', chevilles)
    regrouper('Harpe_Cordes',    cordes)

    # Export
    sortie = exporter_glb()

    print(
        f"\n✓ Harpe renard celtique générée"
        f"\n  {NB_CORDES} cordes · {H*1000:.0f} × {W*1000:.0f} × {D*1000:.0f} mm"
        f"\n  Collections : Harpe_Structure | Harpe_Renard | Harpe_Chevilles | Harpe_Cordes"
        f"\n  Charger dans Sonare : public/models/harp/harp_fox.glb"
    )


main()
