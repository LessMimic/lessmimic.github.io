#!/usr/bin/env python3
"""
Precompute SDF voxel grids from OBJ mesh files.
Each voxel stores the unsigned distance to the nearest surface point.
Gradient is computed at runtime in JS via central differences.
Output: base64-encoded Float32 binary in a JSON wrapper.
"""
import numpy as np
import json
import os
import base64
import struct


def parse_obj(filepath):
    """Parse an OBJ file, return vertices and triangulated faces."""
    vertices = []
    faces = []
    with open(filepath, 'r') as f:
        for line in f:
            parts = line.strip().split()
            if not parts:
                continue
            if parts[0] == 'v':
                vertices.append([float(parts[1]), float(parts[2]), float(parts[3])])
            elif parts[0] == 'f':
                face_verts = []
                for p in parts[1:]:
                    vi = int(p.split('/')[0]) - 1  # OBJ is 1-indexed
                    face_verts.append(vi)
                # Triangulate polygons (fan triangulation)
                for i in range(1, len(face_verts) - 1):
                    faces.append([face_verts[0], face_verts[i], face_verts[i + 1]])
    return np.array(vertices, dtype=np.float64), np.array(faces, dtype=np.int32)


def closest_point_on_triangle(points, a, b, c):
    """
    For a batch of points, compute the closest point on triangle (a, b, c).
    Uses the Voronoi region method.
    points: (N, 3), a, b, c: (3,) each
    Returns: (N, 3) closest points on triangle
    """
    ab = b - a  # (3,)
    ac = c - a  # (3,)
    ap = points - a  # (N, 3)

    d1 = ap @ ab       # (N,)
    d2 = ap @ ac       # (N,)
    d3 = ab @ ab       # scalar
    d4 = ab @ ac       # scalar
    d5 = ac @ ac       # scalar

    bp = points - b
    d6 = bp @ ab       # (N,)
    d7 = bp @ ac       # (N,)

    cp = points - c
    d8 = cp @ ab       # (N,)
    d9 = cp @ ac       # (N,)

    N = len(points)
    result = np.empty((N, 3), dtype=np.float64)
    assigned = np.zeros(N, dtype=bool)

    # Region: vertex A
    mask = (d1 <= 0) & (d2 <= 0) & (~assigned)
    result[mask] = a
    assigned |= mask

    # Region: vertex B
    mask = (d6 >= 0) & (d7 <= d6) & (~assigned)
    result[mask] = b
    assigned |= mask

    # Region: vertex C
    mask = (d9 >= 0) & (d8 <= d9) & (~assigned)
    result[mask] = c
    assigned |= mask

    # Region: edge AB
    vc = d1 * d7 - d6 * d2
    mask = (vc <= 0) & (d1 >= 0) & (d6 <= 0) & (~assigned)
    if mask.any():
        denom = d1[mask] - d6[mask]
        denom = np.where(np.abs(denom) < 1e-12, 1e-12, denom)
        t = d1[mask] / denom
        result[mask] = a + np.outer(t, ab)
    assigned |= mask

    # Region: edge AC
    vb = d8 * d2 - d1 * d9
    mask = (vb <= 0) & (d2 >= 0) & (d9 <= 0) & (~assigned)
    if mask.any():
        denom = d2[mask] - d9[mask]
        denom = np.where(np.abs(denom) < 1e-12, 1e-12, denom)
        t = d2[mask] / denom
        result[mask] = a + np.outer(t, ac)
    assigned |= mask

    # Region: edge BC
    va = d6 * d9 - d8 * d7
    mask = (va <= 0) & ((d7 - d6) >= 0) & ((d8 - d9) >= 0) & (~assigned)
    if mask.any():
        denom = (d7[mask] - d6[mask]) + (d8[mask] - d9[mask])
        denom = np.where(np.abs(denom) < 1e-12, 1e-12, denom)
        t = (d7[mask] - d6[mask]) / denom
        result[mask] = b + np.outer(t, c - b)
    assigned |= mask

    # Region: inside triangle
    mask = ~assigned
    if mask.any():
        denom = va[mask] + vb[mask] + vc[mask]
        denom = np.where(np.abs(denom) < 1e-12, 1e-12, denom)
        v = vb[mask] / denom
        w = vc[mask] / denom
        result[mask] = a + np.outer(v, ab) + np.outer(w, ac)

    return result


def compute_unsigned_distances(points, vertices, faces):
    """
    For each point, compute the unsigned distance to the nearest triangle.
    points: (N, 3), vertices: (V, 3), faces: (F, 3)
    Returns: (N,) distances
    """
    N = points.shape[0]
    F = faces.shape[0]

    v0 = vertices[faces[:, 0]]
    v1 = vertices[faces[:, 1]]
    v2 = vertices[faces[:, 2]]

    min_dist_sq = np.full(N, np.inf)

    # Process face by face (vectorized over points)
    for fi in range(F):
        cp = closest_point_on_triangle(points, v0[fi], v1[fi], v2[fi])
        diff = points - cp
        dist_sq = np.sum(diff * diff, axis=1)
        mask = dist_sq < min_dist_sq
        min_dist_sq[mask] = dist_sq[mask]

    return np.sqrt(min_dist_sq)


def compute_sdf_grid(vertices, faces, grid_size=40, padding=1.0):
    """
    Compute an unsigned distance field on a voxel grid around the mesh.
    Returns a dict with grid metadata and base64-encoded distances.
    """
    bbox_min = vertices.min(axis=0) - padding
    bbox_max = vertices.max(axis=0) + padding

    x = np.linspace(bbox_min[0], bbox_max[0], grid_size)
    y = np.linspace(bbox_min[1], bbox_max[1], grid_size)
    z = np.linspace(bbox_min[2], bbox_max[2], grid_size)

    xx, yy, zz = np.meshgrid(x, y, z, indexing='ij')
    points = np.stack([xx.ravel(), yy.ravel(), zz.ravel()], axis=1)

    print(f"  Grid: {grid_size}^3 = {len(points)} points")
    print(f"  Bbox: [{bbox_min[0]:.3f}, {bbox_min[1]:.3f}, {bbox_min[2]:.3f}] to "
          f"[{bbox_max[0]:.3f}, {bbox_max[1]:.3f}, {bbox_max[2]:.3f}]")

    distances = compute_unsigned_distances(points, vertices, faces)

    # Clamp to max distance
    distances = np.clip(distances, 0.0, padding)

    # Pack as float32 binary, then base64 encode
    flat = distances.astype(np.float32)
    binary_data = flat.tobytes()
    b64_data = base64.b64encode(binary_data).decode('ascii')

    return {
        'grid_size': [grid_size, grid_size, grid_size],
        'bbox_min': [round(v, 6) for v in bbox_min.tolist()],
        'bbox_max': [round(v, 6) for v in bbox_max.tolist()],
        'distances_b64': b64_data,
    }


def unsigned_distance_to_box(points, center, half_extents):
    """
    Compute unsigned distance from each point to an axis-aligned box surface.
    points: (N, 3), center: (3,), half_extents: (3,)
    Returns: (N,) unsigned distances
    """
    q = np.abs(points - center) - half_extents
    # Outside distance: Euclidean distance from clamped components
    outside = np.sqrt(np.sum(np.maximum(q, 0.0) ** 2, axis=1))
    # Inside distance: negative of max component (all q < 0 when inside)
    inside = -np.max(q, axis=1)
    # Unsigned: use outside when outside, inside penetration depth when inside
    return np.where(outside > 0, outside, inside)


def compute_box_primitives_sdf(boxes, grid_size=40, padding=1.0):
    """
    Compute unsigned distance field for a composite object made of axis-aligned boxes.
    boxes: list of (center, half_extents) tuples, each (3,) arrays
    Returns SDF JSON dict.
    """
    # Compute bounding box over all box corners
    all_min = np.full(3, np.inf)
    all_max = np.full(3, -np.inf)
    for center, half_ext in boxes:
        c, h = np.array(center), np.array(half_ext)
        all_min = np.minimum(all_min, c - h)
        all_max = np.maximum(all_max, c + h)

    bbox_min = all_min - padding
    bbox_max = all_max + padding

    x = np.linspace(bbox_min[0], bbox_max[0], grid_size)
    y = np.linspace(bbox_min[1], bbox_max[1], grid_size)
    z = np.linspace(bbox_min[2], bbox_max[2], grid_size)

    xx, yy, zz = np.meshgrid(x, y, z, indexing='ij')
    points = np.stack([xx.ravel(), yy.ravel(), zz.ravel()], axis=1)

    print(f"  Grid: {grid_size}^3 = {len(points)} points")
    print(f"  Bbox: [{bbox_min[0]:.3f}, {bbox_min[1]:.3f}, {bbox_min[2]:.3f}] to "
          f"[{bbox_max[0]:.3f}, {bbox_max[1]:.3f}, {bbox_max[2]:.3f}]")

    # For each point, find minimum unsigned distance across all boxes
    min_dist = np.full(len(points), np.inf)
    for center, half_ext in boxes:
        d = unsigned_distance_to_box(points, np.array(center), np.array(half_ext))
        min_dist = np.minimum(min_dist, d)

    # Clamp to padding
    min_dist = np.clip(min_dist, 0.0, padding)

    flat = min_dist.astype(np.float32)
    b64_data = base64.b64encode(flat.tobytes()).decode('ascii')

    return {
        'grid_size': [grid_size, grid_size, grid_size],
        'bbox_min': [round(v, 6) for v in bbox_min.tolist()],
        'bbox_max': [round(v, 6) for v in bbox_max.tolist()],
        'distances_b64': b64_data,
    }


# MuJoCo chair definition: list of (center, half_extents) from g1_interaction.xml
CHAIR_BOXES = [
    # Seat:  size="0.22 0.22 0.025"  pos="0.0 0.0 0.0"
    ([0.0, 0.0, 0.0],       [0.22, 0.22, 0.025]),
    # Back:  size="0.025 0.22 0.20"  pos="-0.195 0.0 0.225"
    ([-0.195, 0.0, 0.225],  [0.025, 0.22, 0.20]),
    # Front-left leg:  size="0.02 0.02 0.18"  pos="0.18 0.18 -0.205"
    ([0.18, 0.18, -0.205],  [0.02, 0.02, 0.18]),
    # Front-right leg: size="0.02 0.02 0.18"  pos="0.18 -0.18 -0.205"
    ([0.18, -0.18, -0.205], [0.02, 0.02, 0.18]),
    # Back-left leg:   size="0.02 0.02 0.18"  pos="-0.18 0.18 -0.205"
    ([-0.18, 0.18, -0.205], [0.02, 0.02, 0.18]),
    # Back-right leg:  size="0.02 0.02 0.18"  pos="-0.18 -0.18 -0.205"
    ([-0.18, -0.18, -0.205],[0.02, 0.02, 0.18]),
]


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    assets_dir = os.path.join(script_dir, 'df-act-live-demo-assets')

    # Box and crate: simple single-geom objects — OBJ meshes match MuJoCo exactly
    obj_files = {
        'box': 'box_0104.obj',
        'crate': 'crate_0104.obj',
    }

    for name, filename in obj_files.items():
        filepath = os.path.join(assets_dir, filename)
        if not os.path.exists(filepath):
            print(f"Skipping {name}: {filepath} not found")
            continue

        print(f"\nProcessing {name}: {filepath}")
        vertices, faces = parse_obj(filepath)
        print(f"  Vertices: {len(vertices)}, Triangles: {len(faces)}")

        sdf_data = compute_sdf_grid(vertices, faces, grid_size=40, padding=1.0)

        output_path = os.path.join(assets_dir, f'{name}_sdf.json')
        with open(output_path, 'w') as f:
            json.dump(sdf_data, f)

        size_kb = os.path.getsize(output_path) / 1024
        print(f"  Saved: {output_path} ({size_kb:.1f} KB)")

    # Chair: composite of 6 box primitives — compute SDF from MuJoCo geom definitions
    print(f"\nProcessing chair (from MuJoCo box primitives)")
    print(f"  {len(CHAIR_BOXES)} box geoms")
    sdf_data = compute_box_primitives_sdf(CHAIR_BOXES, grid_size=40, padding=1.0)

    output_path = os.path.join(assets_dir, 'chair_sdf.json')
    with open(output_path, 'w') as f:
        json.dump(sdf_data, f)

    size_kb = os.path.getsize(output_path) / 1024
    print(f"  Saved: {output_path} ({size_kb:.1f} KB)")

    print("\nDone!")


if __name__ == '__main__':
    main()
