// Install the editable starter-kit devices in closed-box coordinates (mm).
window.PRODUCT_DATA = (() => {
  const kit = window.PRODUCT_DATA;
  const root = 'lockbox';
  const objects = [];
  const parts = [];
  function group(id, name, parent) {
    objects.push({id, name, parent, position: [0, 0, 0], partIds: []});
  }
  group(root, 'Pico lock box', null);
  group('base-group', 'Lower shell and phone', root);
  group('lid-group', 'Upper shell and controls', root);
  group('empty-object', 'Electronics Assembly', 'lid-group');

  function addMesh(mesh) {
    const bounds = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (const vertex of mesh.vertices) {
      for (let axis = 0; axis < 3; axis++) {
        bounds[axis] = Math.min(bounds[axis], vertex[axis]);
        bounds[axis + 3] = Math.max(bounds[axis + 3], vertex[axis]);
      }
    }
    mesh.bounds = bounds;
    parts.push(mesh);
    return bounds;
  }
  for (const {id, title, parent, color, vertices, faces} of lockboxMechanics) {
    const rgb = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16) / 255);
    const colors = faces.map(() => rgb);
    if (/^Cap[1-4]$/.test(id)) {
      const top = Math.max(...vertices.map(vertex => vertex[2]));
      faces.forEach((face, i) => {
        if (face.every(index => vertices[index][2] === top)) colors[i] = [.12, .22, .19];
      });
    }
    const bounds = addMesh({id, name: id, title, group: parent, vertices, faces, colors});
    const center = id === 'BoardCarrier' ? lockboxCarrierOrigin :
      [0, 1, 2].map(i => (bounds[i] + bounds[i + 3]) / 2);
    // Keep the original rotation pivots for saved layouts after widening the left side.
    if (id === 'ReceiverBase' || id === 'LiftOffLid') center[0] = 26.15;
    objects.push({id, name: title, parent, position: center, partIds: [id]});
  }

  for (const item of kit.scene.objects.filter(item => Object.hasOwn(lockboxMounts, item.id))) {
    const [position, axes] = lockboxMounts[item.id];
    const object = {...item, position, parent: 'empty-object', mountReference: undefined};
    objects.push(object);
    for (const id of item.partIds) {
      const mesh = {...kit.parts.find(p => p.id === id)};
      const localVertices = mesh.vertices.map(vertex => vertex.map((v, i) => v - item.position[i]));
      mesh.vertices = localVertices.map(local =>
        axes.map((axis, i) => position[i] + Math.sign(axis) * local[Math.abs(axis) - 1]));
      addMesh(mesh);
    }
  }
  return {config: {version: 'pico-lockbox', title: 'Pico · SG90 Lock Box', viewerOnly: true,
    nativePath: '../output/cad/pico-lockbox/Pico-Lockbox-Mechanics.FCStd',
    description: 'Lift-off lid · USB-powered Pico · SG90 arm latch'},
    scene: {name: 'Object hierarchy', objects, liftTravel: 65,
      hornPivot: lockboxHornPivot, servoAngles: lockboxServoAngles,
      lidGroup: 'lid-group', layoutRevision: 'balanced-carrier',
      previousMountY: {BoardCarrier: -6, breadboard: -6, pico: -66.96},
      previousLayouts: [{
        revision: 'arm-latch', mountZ: {}
      }, {
        revision: 'cable-clearance', mountZ: {LiftOffLid: 16.6375}
      }, {
        revision: 'lift-off',
        mountZ: {LiftOffLid: 20.75, BoardCarrier: 18.8, breadboard: 21, pico: 27.02,
          'button-1': 27.02, 'button-2': 27.02, 'button-3': 27.02, 'button-4': 27.02,
          Cap1: 34.585, Cap2: 34.585, Cap3: 34.585, Cap4: 34.585}
      }, {
        revision: 'equal-halves', mountZ: {PhoneGauge: 4.46, breadboard: 21, pico: 27.02,
          'button-1': 27.02, 'button-2': 27.02, 'button-3': 27.02, 'button-4': 27.02,
          Cap1: 34.585, Cap2: 34.585, Cap3: 34.585, Cap4: 34.585}
      }, {
        revision: 'portrait-slim',
        mountZ: {PhoneGauge: 4.46, breadboard: 17, pico: 23.02,
          lcd1602: 14, sg90: 28.5, 'button-1': 23.02, 'button-2': 23.02,
          'button-3': 23.02, 'button-4': 23.02,
          Cap1: 30.585, Cap2: 30.585, Cap3: 30.585, Cap4: 30.585}
      }, {
        revision: 'portrait',
        mountZ: {PhoneGauge: 4.46, breadboard: 29, pico: 35.02,
          lcd1602: 26, sg90: 40.5, 'button-1': 35.02, 'button-2': 35.02,
          'button-3': 35.02, 'button-4': 35.02,
          Cap1: 42.585, Cap2: 42.585, Cap3: 42.585, Cap4: 42.585}
      }]}, parts, missing: []};
})();
