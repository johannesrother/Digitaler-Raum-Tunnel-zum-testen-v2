const MEADOW_RADIUS = 55;
const NEAR_GRASS_RADIUS = 25;
const GRASS_INSTANCE_COUNT = 330;
const WISPY_GRASS_INSTANCE_COUNT = 82;
const POLLEN_COUNT = 34;
const PACK_ROOT = "./assets/idylle%20pack/glTF/";
const TOON_SKYDOME_ROOT = "./assets/idylle/";
const TOON_SKYDOME_FILE = "Toon Skydome.glb";
const TOON_SKYDOME_SCALE = 13;
const HORIZON_HILLS_ROOT = "./assets/idylle/";
const HORIZON_HILLS_FILE = "hügel.glb";
const HOUSE_ROOT = "./assets/idylle/";
const HOUSE_FILE = "Haus.glb";
const HOUSE_SCALE = 4.6;
const HOUSE_OFFSET = new BABYLON.Vector3(-9, 0, 20.7);
// `Haus.glb` has one combined mesh (`output_unwrapped`), so the doorway is not
// a separately addressable node.  Its visible entrance is on the source +Z
// facade. Rotate that facade toward the visitor, who approaches from world -Z.
const HOUSE_ROTATION_Y = Math.PI;
const HOUSE_DOOR_LOCAL_NORMAL = new BABYLON.Vector3(0, 0, 1);

const HORIZON_HILL_LAYOUT = [
  { angle: 0.08, radius: 134, scale: [31, 15, 22], yaw: -0.64 },
  { angle: 0.68, radius: 142, scale: [26, 13, 18], yaw: 0.32 },
  { angle: 1.32, radius: 130, scale: [36, 18, 24], yaw: 1.05 },
  { angle: 1.96, radius: 146, scale: [28, 14, 20], yaw: -1.12 },
  { angle: 2.6, radius: 136, scale: [34, 17, 23], yaw: 0.7 },
  { angle: 3.2, radius: 144, scale: [25, 12, 18], yaw: -0.28 },
  { angle: 3.78, radius: 132, scale: [38, 19, 25], yaw: 1.18 },
  { angle: 4.38, radius: 148, scale: [27, 13, 19], yaw: -0.9 },
  { angle: 5.0, radius: 138, scale: [33, 16, 22], yaw: 0.46 },
  { angle: 5.64, radius: 145, scale: [29, 14, 20], yaw: -1.3 },
];

/**
 * The one visible idyll world.  It intentionally contains only a small,
 * curated subset of the Quaternius Nature MegaKit rather than an asset dump.
 */
export async function createDreamyIdyll(scene, startPosition) {
  const world = new BABYLON.TransformNode("dreamy-idyll-world", scene);
  const meadow = createRollingMeadow(scene, world, startPosition);
  const mountains = await createDistantMountainLayers(scene, world, startPosition);
  const sky = await createDreamySky(scene, world, startPosition);
  const house = await createHouseTarget(scene, world, startPosition);
  const lights = createDreamyLighting(scene);
  const libraries = await loadNatureLibraries(scene, world);
  const vegetation = placeNature(scene, world, libraries, startPosition);
  const atmosphere = createAtmosphere(scene, world, startPosition, vegetation.swayAnchors, sky);

  return {
    world,
    meadow,
    mountains,
    sky,
    house,
    lights,
    vegetation,
    startPosition: new BABYLON.Vector3(
      startPosition.x,
      getMeadowHeight(startPosition.x, startPosition.z, startPosition),
      startPosition.z,
    ),
    meadowRadius: MEADOW_RADIUS,
    excludeFromTunnel(tunnelMesh) {
      lights.forEach((light) => light.excludedMeshes.push(tunnelMesh));
    },
    hide() {
      world.setEnabled(false);
      lights.forEach((light) => light.setEnabled(false));
      atmosphere.dispose();
    },
  };
}

function createRollingMeadow(scene, world, startPosition) {
  const rings = 32;
  const sectors = 96;
  const positions = [startPosition.x, getMeadowHeight(startPosition.x, startPosition.z, startPosition), startPosition.z];
  const normals = [0, 1, 0];
  const colors = [0.36, 0.58, 0.28, 1];
  const indices = [];

  for (let ring = 1; ring <= rings; ring += 1) {
    const radius = MEADOW_RADIUS * ring / rings;
    for (let sector = 0; sector < sectors; sector += 1) {
      const angle = sector / sectors * Math.PI * 2;
      const organicEdge = 1 + Math.sin(angle * 5.0) * 0.025 + Math.sin(angle * 9.0 + 0.7) * 0.014;
      const x = startPosition.x + Math.cos(angle) * radius * organicEdge;
      const z = startPosition.z + Math.sin(angle) * radius * organicEdge;
      const shade = 0.93 + Math.sin(x * 0.25 + z * 0.17) * 0.045 + Math.cos(z * 0.43) * 0.025;
      positions.push(x, getMeadowHeight(x, z, startPosition), z);
      normals.push(0, 1, 0);
      colors.push(0.36 * shade, 0.58 * shade, 0.28 * shade, 1);
    }
  }

  for (let sector = 0; sector < sectors; sector += 1) {
    const next = (sector + 1) % sectors;
    indices.push(0, 1 + sector, 1 + next);
  }
  for (let ring = 1; ring < rings; ring += 1) {
    const inner = 1 + (ring - 1) * sectors;
    const outer = 1 + ring * sectors;
    for (let sector = 0; sector < sectors; sector += 1) {
      const next = (sector + 1) % sectors;
      indices.push(inner + sector, outer + sector, outer + next, inner + sector, outer + next, inner + next);
    }
  }
  BABYLON.VertexData.ComputeNormals(positions, indices, normals);
  const meadow = new BABYLON.Mesh("dreamy-rolling-meadow", scene);
  const vertexData = new BABYLON.VertexData();
  vertexData.positions = positions;
  vertexData.normals = normals;
  vertexData.colors = colors;
  vertexData.indices = indices;
  vertexData.applyToMesh(meadow);
  const material = new BABYLON.PBRMaterial("dreamy-meadow-material", scene);
  material.albedoColor = BABYLON.Color3.White();
  material.useVertexColors = true;
  material.metallic = 0;
  material.roughness = 0.98;
  material.environmentIntensity = 0.16;
  meadow.material = material;
  meadow.parent = world;
  meadow.isPickable = false;
  meadow.receiveShadows = true;
  return meadow;
}

function getMeadowHeight(x, z, startPosition) {
  const dx = x - startPosition.x;
  const dz = z - startPosition.z;
  const distance = Math.hypot(dx, dz);
  const fade = BABYLON.Scalar.Clamp((distance - 2.7) / 8, 0, 1);
  const broad = Math.sin(dx * 0.16 + dz * 0.045) * 0.28 + Math.cos(dz * 0.13 - dx * 0.05) * 0.19;
  const soft = Math.sin((dx - dz) * 0.11) * 0.08;
  const edgeLift = Math.max(0, distance - 34) * 0.052;
  return (broad + soft) * fade + edgeLift;
}

async function createDistantMountainLayers(scene, world, startPosition) {
  const container = await BABYLON.SceneLoader.LoadAssetContainerAsync(
    HORIZON_HILLS_ROOT,
    HORIZON_HILLS_FILE,
    scene,
  );
  container.addAllToScene();

  const source = container.meshes.find((mesh) => mesh.getTotalVertices() > 0);
  if (!source) {
    throw new Error("Hügel GLB did not contain a renderable mesh.");
  }

  container.materials.forEach((material) => {
    material.backFaceCulling = false;
    material.fogEnabled = false;
  });

  const placeHill = (hill, mesh) => {
    const [scaleX, scaleY, scaleZ] = hill.scale;
    mesh.parent = world;
    mesh.position.set(
      startPosition.x + Math.cos(hill.angle) * hill.radius,
      scaleY * 0.512 - 1.2,
      startPosition.z + Math.sin(hill.angle) * hill.radius,
    );
    mesh.scaling.set(scaleX, scaleY, scaleZ);
    mesh.rotation.y = hill.yaw;
    mesh.isPickable = false;
    mesh.receiveShadows = false;
  };

  placeHill(HORIZON_HILL_LAYOUT[0], source);
  const hills = [source];
  HORIZON_HILL_LAYOUT.slice(1).forEach((hill, index) => {
    const instance = source.createInstance(`dreamy-horizon-hill-${index + 1}`);
    placeHill(hill, instance);
    hills.push(instance);
  });
  return hills;
}

async function createDreamySky(scene, world, startPosition) {
  const container = await BABYLON.SceneLoader.LoadAssetContainerAsync(
    TOON_SKYDOME_ROOT,
    TOON_SKYDOME_FILE,
    scene,
  );
  container.addAllToScene();

  const skyRoot = container.rootNodes[0];
  const sky = container.meshes.find((mesh) => mesh.getTotalVertices() > 0);
  if (!skyRoot || !sky) {
    throw new Error("Toon Skydome did not contain a renderable sky mesh.");
  }

  // The source is a unit upper hemisphere.  This places its base at the idyll
  // ground plane and expands it well beyond the 156 m outer mountain ring.
  skyRoot.parent = world;
  skyRoot.position.copyFrom(startPosition);
  skyRoot.scaling.scaleInPlace(TOON_SKYDOME_SCALE);
  sky.isPickable = false;
  sky.infiniteDistance = false;
  sky.receiveShadows = false;
  sky.alwaysSelectAsActiveMesh = true;
  container.materials.forEach((material) => {
    material.backFaceCulling = false;
    material.disableDepthWrite = true;
    material.fogEnabled = false;
  });

  return {
    sky,
    update() {},
  };
}

async function createHouseTarget(scene, world, startPosition) {
  const container = await BABYLON.SceneLoader.LoadAssetContainerAsync(
    HOUSE_ROOT,
    HOUSE_FILE,
    scene,
  );
  container.addAllToScene();

  const house = container.meshes.find((mesh) => mesh.getTotalVertices() > 0);
  if (!house) {
    throw new Error("Haus GLB did not contain a renderable mesh.");
  }
  const houseRoot = new BABYLON.TransformNode("dreamy-idyll-house-target", scene);
  container.rootNodes.forEach((node) => {
    node.parent = houseRoot;
  });
  houseRoot.parent = world;
  houseRoot.scaling.setAll(HOUSE_SCALE);
  houseRoot.rotation.y = HOUSE_ROTATION_Y;
  houseRoot.position.set(
    startPosition.x + HOUSE_OFFSET.x,
    getMeadowHeight(startPosition.x + HOUSE_OFFSET.x, startPosition.z + HOUSE_OFFSET.z, startPosition)
      + HOUSE_SCALE * 0.47548696398735046,
    startPosition.z + HOUSE_OFFSET.z,
  );
  houseRoot.computeWorldMatrix(true);
  house.computeWorldMatrix(true);
  container.materials.forEach((material) => {
    material.backFaceCulling = false;
  });
  house.isPickable = false;
  house.receiveShadows = true;

  const bounds = house.getBoundingInfo().boundingBox;
  const localDoorPoint = new BABYLON.Vector3(
    (bounds.minimum.x + bounds.maximum.x) * 0.5,
    (bounds.minimum.y + bounds.maximum.y) * 0.5,
    bounds.maximum.z,
  );
  const doorPointWorld = BABYLON.Vector3.TransformCoordinates(localDoorPoint, house.getWorldMatrix());
  const facadeNormal = BABYLON.Vector3.TransformNormal(HOUSE_DOOR_LOCAL_NORMAL, house.getWorldMatrix())
    .normalize();
  const riftCenter = new BABYLON.Vector3(
    doorPointWorld.x + facadeNormal.x * 0.18,
    getMeadowHeight(startPosition.x + HOUSE_OFFSET.x, startPosition.z + HOUSE_OFFSET.z, startPosition),
    doorPointWorld.z + facadeNormal.z * 0.18,
  );
  const travelForward = facadeNormal.negate();
  const lateral = new BABYLON.Vector3(travelForward.z, 0, -travelForward.x);

  return {
    root: houseRoot,
    mesh: house,
    position: houseRoot.position.clone(),
    scale: HOUSE_SCALE,
    bounds,
    entrance: {
      center: riftCenter,
      forward: travelForward,
      lateral,
    },
    approachTarget: riftCenter.add(new BABYLON.Vector3(0, 1.65, 0)),
  };
}

function createDreamyLighting(scene) {
  const fill = new BABYLON.HemisphericLight("dreamy-idyll-soft-fill", new BABYLON.Vector3(0, 1, 0), scene);
  fill.intensity = 0.68;
  fill.diffuse = BABYLON.Color3.FromHexString("#e5f1f4");
  fill.groundColor = BABYLON.Color3.FromHexString("#9ab98a");
  const sun = new BABYLON.DirectionalLight("dreamy-idyll-late-afternoon-sun", new BABYLON.Vector3(-0.52, -0.72, 0.34), scene);
  sun.position = new BABYLON.Vector3(24, 32, -18);
  sun.intensity = 1.1;
  sun.diffuse = BABYLON.Color3.FromHexString("#ffe1b8");
  return [fill, sun];
}

async function loadNatureLibraries(scene, world) {
  const names = [
    "CommonTree_1", "CommonTree_2", "CommonTree_3", "CommonTree_4",
    "Grass_Common_Short", "Grass_Wispy_Tall",
    "Flower_3_Group", "Flower_4_Group", "Flower_4_Single", "Plant_1", "Fern_1", "Clover_1",
    "Bush_Common", "Bush_Common_Flowers",
    "Rock_Medium_1", "Rock_Medium_2", "Rock_Medium_3",
  ];
  const entries = await Promise.all(names.map(async (name) => [name, await loadLibrary(scene, world, name)]));
  return Object.fromEntries(entries);
}

async function loadLibrary(scene, world, name) {
  const container = await BABYLON.SceneLoader.LoadAssetContainerAsync(PACK_ROOT, `${name}.gltf`, scene);
  container.lights.forEach((light) => light.dispose());
  container.cameras.forEach((camera) => camera.dispose());
  container.animationGroups.forEach((group) => group.stop());
  container.addAllToScene();
  container.rootNodes.forEach((root) => { root.parent = world; });
  const meshes = container.meshes.filter((mesh) => mesh.getTotalVertices() > 0);
  meshes.forEach((mesh) => {
    if (name.startsWith("Grass_")) {
      // The pack's palette texture is intended for Unity's vertex-color
      // shader. Babylon otherwise exposes its black palette entries, so keep
      // the authored blade geometry and give both grass variants one clean,
      // shared stylized green material instead.
      const grassMaterial = new BABYLON.StandardMaterial(`dreamy-${name}-material`, scene);
      grassMaterial.diffuseColor = BABYLON.Color3.FromHexString("#285e2d");
      grassMaterial.emissiveColor = BABYLON.Color3.FromHexString("#0a2410");
      grassMaterial.specularColor = BABYLON.Color3.Black();
      grassMaterial.useVertexColor = false;
      grassMaterial.backFaceCulling = false;
      mesh.material = grassMaterial;
      // These assets also carry a Unity palette in COLOR_0.  Removing that
      // unused palette prevents its black swatch from tinting Babylon blades.
      mesh.removeVerticesData(BABYLON.VertexBuffer.ColorKind);
    }
    mesh.isVisible = false;
    mesh.isPickable = false;
    mesh.receiveShadows = false;
  });
  return { meshes };
}

function placeNature(scene, world, libraries, startPosition) {
  const random = createRandom(7391);
  const swayAnchors = [];
  const entries = [];
  const counts = { grass: 0, wispyGrass: 0, trees: 0, flowers: 0, plants: 0, bushes: 0, rocks: 0 };
  const add = (library, name, placement, kind) => {
    const anchor = createInstanceGroup(scene, world, library, name, placement, startPosition);
    entries.push({ anchor, prefix: name });
    counts[kind] += 1;
    if (kind === "flowers" || kind === "plants" || kind === "bushes" || kind === "grass" || kind === "wispyGrass") {
      swayAnchors.push({ anchor, phase: random() * Math.PI * 2, kind });
    }
  };

  for (let index = 0; index < GRASS_INSTANCE_COUNT; index += 1) {
    const point = randomPoint(random, 1.8, NEAR_GRASS_RADIUS);
    add(libraries.Grass_Common_Short, `meadow-grass-${index}`, {
      x: startPosition.x + point.x, z: startPosition.z + point.z,
      scale: 0.72 + random() * 0.58, rotation: random() * Math.PI * 2,
    }, "grass");
  }
  for (let index = 0; index < WISPY_GRASS_INSTANCE_COUNT; index += 1) {
    const point = randomPoint(random, 7, NEAR_GRASS_RADIUS + 5);
    add(libraries.Grass_Wispy_Tall, `meadow-wispy-grass-${index}`, {
      x: startPosition.x + point.x, z: startPosition.z + point.z,
      scale: 0.68 + random() * 0.56, rotation: random() * Math.PI * 2,
    }, "wispyGrass");
  }

  const treePlacements = [
    ["CommonTree_1", -18, -5, 1.36, 0.4], ["CommonTree_2", 13, 7, 1.2, 5.4],
    ["CommonTree_3", 19, 6, 1.45, 3.9], ["CommonTree_4", -22, 16, 1.18, 0.9],
    ["CommonTree_1", -23, 8, 1.12, 4.1], ["CommonTree_2", 4, 23, 1.28, 2.3],
    ["CommonTree_3", 23, -3, 1.1, 1.7], ["CommonTree_4", -4, -27, 1.05, 5.6],
  ];
  treePlacements.forEach(([library, x, z, scale, rotation], index) => {
    add(libraries[library], `dreamy-tree-${index}`, { x: startPosition.x + x, z: startPosition.z + z, scale, rotation }, "trees");
  });

  const middleTreePlacements = [
    ["CommonTree_1", -34, -14, 0.86, 1.1], ["CommonTree_2", -42, 4, 0.9, 4.2],
    ["CommonTree_3", -31, 28, 0.78, 2.7], ["CommonTree_4", -12, 43, 0.92, 5.1],
    ["CommonTree_1", 17, 39, 0.82, 0.5], ["CommonTree_2", 39, 23, 0.9, 3.6],
    ["CommonTree_3", 45, -8, 0.76, 1.8], ["CommonTree_4", 31, -32, 0.86, 4.8],
    ["CommonTree_1", 4, -46, 0.78, 2.1], ["CommonTree_2", -27, -37, 0.83, 5.7],
  ];
  middleTreePlacements.forEach(([library, x, z, scale, rotation], index) => {
    add(libraries[library], `dreamy-middle-tree-${index}`, { x: startPosition.x + x, z: startPosition.z + z, scale, rotation }, "trees");
  });

  const flowerPlacements = [
    ["Flower_3_Group", -2.6, -1.8, 1.0, 0.4], ["Flower_4_Group", 2.8, -2.2, 0.92, 2.1],
    ["Flower_3_Group", -5.2, 2.7, 0.88, 5.0], ["Flower_4_Single", 4.2, 2.2, 1.15, 1.4],
    ["Flower_4_Group", 6.4, 5.2, 0.8, 0.7], ["Flower_3_Group", -7.2, -4.5, 0.76, 3.7],
    ["Flower_4_Single", -1.0, 6.0, 1.04, 5.4], ["Flower_4_Group", 8.0, -4.6, 0.72, 2.7],
    ["Flower_3_Group", 1.3, -7.2, 0.86, 4.1], ["Flower_4_Group", -8.4, 1.2, 0.78, 1.8],
    ["Flower_4_Single", 6.6, 7.4, 1.05, 3.1], ["Flower_3_Group", -3.6, 9.1, 0.72, 5.8],
  ];
  flowerPlacements.forEach(([library, x, z, scale, rotation], index) => {
    add(libraries[library], `dreamy-flower-${index}`, { x: startPosition.x + x, z: startPosition.z + z, scale, rotation }, "flowers");
  });

  const plantPlacements = [
    ["Plant_1", -9, -7, 1.0, 1.6], ["Fern_1", 9, -7, 1.15, 4.2], ["Clover_1", -5, 7, 1.18, 0.6],
    ["Plant_1", 11, 3, 0.94, 2.9], ["Fern_1", -12, 4, 0.9, 5.1], ["Clover_1", 5, 9, 1.15, 3.5],
  ];
  plantPlacements.forEach(([library, x, z, scale, rotation], index) => {
    add(libraries[library], `dreamy-plant-${index}`, { x: startPosition.x + x, z: startPosition.z + z, scale, rotation }, "plants");
  });

  const bushPlacements = [
    ["Bush_Common", -15, -11, 1.15, 0.8], ["Bush_Common_Flowers", 15, 11, 1.1, 2.5],
    ["Bush_Common", -20, 2, 1.28, 4.2], ["Bush_Common_Flowers", 18, -9, 1.0, 5.4],
    ["Bush_Common", 4, 20, 1.18, 1.7], ["Bush_Common_Flowers", -9, 19, 1.0, 3.0],
  ];
  bushPlacements.forEach(([library, x, z, scale, rotation], index) => {
    add(libraries[library], `dreamy-bush-${index}`, { x: startPosition.x + x, z: startPosition.z + z, scale, rotation }, "bushes");
  });

  const rockPlacements = [
    ["Rock_Medium_1", -7.8, -3.0, 0.88, 1.1], ["Rock_Medium_2", 7.3, 6.1, 0.76, 3.6],
    ["Rock_Medium_3", -12.6, 9.3, 0.92, 5.0], ["Rock_Medium_1", 13.8, -6.1, 0.7, 0.4],
    ["Rock_Medium_2", 2.5, 15.3, 0.72, 2.2], ["Rock_Medium_3", -18.2, -5.1, 0.78, 4.4],
  ];
  rockPlacements.forEach(([library, x, z, scale, rotation], index) => {
    add(libraries[library], `dreamy-rock-${index}`, { x: startPosition.x + x, z: startPosition.z + z, scale, rotation, yOffset: -0.14 }, "rocks");
  });
  return { counts, swayAnchors, entries };
}

function createInstanceGroup(scene, world, library, name, placement, startPosition) {
  const anchor = new BABYLON.TransformNode(`${name}-anchor`, scene);
  anchor.parent = world;
  anchor.position.set(placement.x, getMeadowHeight(placement.x, placement.z, startPosition) + (placement.yOffset ?? 0), placement.z);
  anchor.rotation.y = placement.rotation;
  anchor.scaling.setAll(placement.scale);
  library.meshes.forEach((mesh, index) => {
    const instance = mesh.createInstance(`${name}-part-${index}`);
    instance.parent = anchor;
    instance.isPickable = false;
    instance.receiveShadows = false;
  });
  return anchor;
}

function createAtmosphere(scene, world, startPosition, swayAnchors, sky) {
  const pollenTemplate = BABYLON.MeshBuilder.CreateSphere("dreamy-pollen-template", { diameter: 0.045, segments: 4 }, scene);
  pollenTemplate.parent = world;
  pollenTemplate.isVisible = false;
  pollenTemplate.isPickable = false;
  const material = new BABYLON.StandardMaterial("dreamy-pollen-material", scene);
  material.emissiveColor = BABYLON.Color3.FromHexString("#fff3c9");
  material.alpha = 0.56;
  pollenTemplate.material = material;
  const random = createRandom(991);
  const pollen = Array.from({ length: POLLEN_COUNT }, (_, index) => {
    const point = randomPoint(random, 1, 15);
    const instance = pollenTemplate.createInstance(`dreamy-pollen-${index}`);
    instance.parent = world;
    instance.isPickable = false;
    return { instance, x: startPosition.x + point.x, z: startPosition.z + point.z, y: 0.75 + random() * 2.5, phase: random() * Math.PI * 2 };
  });
  let elapsed = 0;
  let previousFrameTime = performance.now();
  const observer = scene.onBeforeRenderObservable.add(() => {
    const now = performance.now();
    elapsed += Math.min((now - previousFrameTime) / 1000, 0.04);
    previousFrameTime = now;
    pollen.forEach((state) => {
      state.instance.position.set(state.x + Math.sin(elapsed * 0.15 + state.phase) * 0.48, state.y + Math.sin(elapsed * 0.31 + state.phase) * 0.16, state.z + Math.cos(elapsed * 0.12 + state.phase) * 0.4);
    });
    swayAnchors.forEach((state) => {
      const rate = state.kind === "grass" || state.kind === "wispyGrass" ? 0.56 : 0.24;
      const amplitude = state.kind === "bushes" ? 0.008 : state.kind === "grass" || state.kind === "wispyGrass" ? 0.022 : 0.014;
      state.anchor.rotation.z = Math.sin(elapsed * rate + state.phase) * amplitude;
      state.anchor.rotation.x = Math.sin(elapsed * rate * 0.73 + state.phase * 1.7) * amplitude * 0.55;
    });
    sky.update(elapsed);
  });
  return { dispose: () => scene.onBeforeRenderObservable.remove(observer) };
}

function randomPoint(random, inner, outer) {
  const radius = Math.sqrt(random() * (outer * outer - inner * inner) + inner * inner);
  const angle = random() * Math.PI * 2;
  return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
}

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
