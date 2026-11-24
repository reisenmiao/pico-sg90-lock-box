(() => {
  const scene = PRODUCT_DATA.scene;
  const lockbox = !!scene.lidGroup;
  const hierarchyKey = 'phone-lock.' + PRODUCT_DATA.config.version + '.hierarchy.v2';
  const storageKey = scene.layoutRevision ? hierarchyKey + '.' + scene.layoutRevision : hierarchyKey;
  function read(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  }
  const revisionDraft = read(storageKey);
  let previous, previousDraft;
  if (!revisionDraft) {
    for (const layout of scene.previousLayouts || []) {
      const draft = read(hierarchyKey + '.' + layout.revision);
      if (Array.isArray(draft)) {
        previous = layout;
        previousDraft = draft;
        break;
      }
    }
  }
  const saved = revisionDraft ?? previousDraft ?? (scene.layoutRevision ? read(hierarchyKey) : null),
    legacy = lockbox ? {} : read('phone-lock.empty.object-positions.v1') || {};
  const nodes = new Map();
  const isPosition = (value) =>
    Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
  const round = (value) => Math.round(value * 100) / 100;
  // Signed local axes along world X, Y and Z. Quarter turns stay exact.
  const identity = [1, 2, 3];
  function orient(vector, axes) {
    return axes.map(axis => Math.sign(axis) * vector[Math.abs(axis) - 1]);
  }
  function validOrientation(axes) {
    if (!isPosition(axes) || !axes.every(a => Number.isInteger(a) && Math.abs(a) >= 1 && Math.abs(a) <= 3))
      return false;
    const [a, b, c] = axes.map(Math.abs);
    return new Set([a, b, c]).size === 3 &&
      Math.sign((b - a) * (c - a) * (c - b) * axes[0] * axes[1] * axes[2]) === 1;
  }
  function worldPoint(node, point) {
    const local = point.map((v, i) => v - node.base[i]);
    return orient(local, node.orientation).map((v, i) => v + node.position[i]);
  }
  function addNode(id, name, base, partIds = []) {
    const node = { id, name, base, position: [...base], orientation: identity, parent: null, partIds };
    nodes.set(id, node);
    return node;
  }
  for (const item of scene.objects) {
    const node = addNode(item.id, item.name, item.position, item.partIds);
    node.shortLabel = item.shortLabel;
    if (isPosition(legacy[item.id])) node.position = [...legacy[item.id]];
    else if (['breadboard', 'pico'].includes(item.id) && isPosition(legacy['breadboard-pico'])) {
      const board = scene.objects.find((item) => item.id === 'breadboard').position;
      node.position = node.base.map((n, i) => round(n + legacy['breadboard-pico'][i] - board[i]));
    }
  }
  function branch(node) {
    const members = [node];
    for (const member of members)
      for (const child of nodes.values()) if (child.parent === member.id) members.push(child);
    return members;
  }
  if (Array.isArray(saved)) {
    for (const row of saved) {
      if (!row || typeof row.id !== 'string' || typeof row.name !== 'string' || !row.name.trim())
        continue;
      let node = nodes.get(row.id);
      if (!node && row.id.startsWith('group-')) node = addNode(row.id, row.name, [0, 0, 0]);
      if (!node) continue;
      if (node.id !== 'empty-object' || row.name !== 'Empty Object') node.name = row.name;
      if ((revisionDraft || previousDraft) && isPosition(row.position)) {
        node.position = [...row.position];
        if (previousDraft && Object.hasOwn(scene.previousMountY || {}, node.id)) {
          const dy = node.base[1] - scene.previousMountY[node.id];
          const shift = orient([0, dy, 0], validOrientation(row.orientation) ? row.orientation : identity);
          node.position = node.position.map((v, i) => round(v + shift[i]));
        }
        if (previousDraft && Object.hasOwn(previous.mountZ, node.id)) {
          node.position[2] += node.base[2] - previous.mountZ[node.id];
        }
      }
      if ((revisionDraft || previousDraft) && validOrientation(row.orientation)) node.orientation = row.orientation;
      // Restore sibling order as well as the names and positions.
      nodes.delete(node.id);
      nodes.set(node.id, node);
    }
    for (const row of saved) {
      const node = nodes.get(row?.id);
      let parent = nodes.get(row?.parent);
      if (node && !parent && row.parent && scene.previousLayouts) {
        // Keep children of a discontinued part in its former assembly.
        parent = nodes.get(saved.find(item => item?.id === row.parent)?.parent);
      }
      if (node && parent && !branch(node).includes(parent)) node.parent = parent.id;
    }
  }
  // Apply defaults only to new objects, including components added to an older scene.
  const restored = new Set(Array.isArray(saved) ? saved.map((row) => row?.id) : []);
  for (const item of scene.objects) {
    if (!item.parent || restored.has(item.id)) continue;
    const node = nodes.get(item.id);
    if (branch(node).includes(nodes.get(item.parent))) continue;
    node.parent = item.parent;
    const anchor = nodes.get(item.mountReference || item.parent);
    if (!isPosition(legacy[item.id]) && !['pico', 'breadboard'].includes(item.id)) {
      node.position = worldPoint(anchor, node.base).map(round);
      node.orientation = anchor.orientation;
    }
  }
  const layoutRoot = nodes.get('empty-object');
  let lidParts = new Set(), lidLift = 0, servoAngle = 0;
  let armCos = 1, armSin = 0, seeThrough = false;
  function save() {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify(
          [...nodes.values()].map(({ id, name, position, orientation, parent }) => ({
            id,
            name,
            position,
            orientation,
            parent,
          })),
        ),
      );
    } catch {
      status.textContent = 'Browser storage is unavailable. Changes last for this session.';
    }
  }
  const transforms = new Map();
  function updateTransform(node) {
    const axes = node.orientation;
    const origin = orient(node.base, axes);
    const transform = {
      indices: axes.map(a => Math.abs(a) - 1),
      signs: axes.map(Math.sign),
      offset: node.position.map((v, i) => v - origin[i]),
    };
    for (const id of node.partIds) transforms.set(id, transform);
  }
  for (const node of nodes.values()) updateTransform(node);
  const make = (tag, text) => {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (tag === 'button') el.type = 'button';
    return el;
  };
  const panel = $('workspace-model'),
    card = $('viewer').closest('.viewerPanel'),
    shortcut = $('isolate');
  shortcut.textContent = scene.name;
  shortcut.setAttribute('aria-controls', 'parts workspace-model');
  panel.setAttribute('aria-labelledby', shortcut.id);
  card.querySelector('h2').textContent = 'Assembly';
  card.setAttribute('aria-label', 'Assembly');
  card.querySelector('.toolbar').replaceChildren($('reset'));
  $('viewer').setAttribute('aria-label', 'Assembly · drag to rotate and scroll to zoom');
  const detailTools = make('div');
  detailTools.className = 'toolbar';
  $('detailTitle').after(detailTools);
  detailTools.append($('partReset'));
  $('partViewer').setAttribute('aria-label', 'Selected object · drag to rotate and scroll to zoom');
  let current = layoutRoot,
    selection = [],
    editing = false;
  class SceneView extends KitModelView {
    constructor(id, kind, tag) {
      super(id, kind, tag);
      this.marker = make('span');
      this.marker.className = 'empty-origin';
      this.marker.hidden = true;
      this.canvas.parentElement.append(this.marker);
    }
    visible() {
      return this.kind === 'full' ? PARTS : selection;
    }
    partOpacity(part) {
      if (this.kind === 'full' && seeThrough && ['LiftOffLid', 'ReceiverBase'].includes(part.id)) return .15;
      return part.opacity ?? 1;
    }
    fit(resetZoom = true) {
      if (this.visible().length) return super.fit(resetZoom);
      this.center = this.project(current.position);
      this.baseScale = 1;
      if (resetZoom) this.zoom = 1;
      this.draw();
    }
    point(vertex, part) {
      const {indices, signs, offset} = transforms.get(part.id);
      if (lockbox && servoAngle && part.id === 'sg90-arm') {
        const [x, y] = scene.hornPivot;
        const dx = vertex[0] - x, dy = vertex[1] - y;
        vertex = [x + dx * armCos - dy * armSin, y + dx * armSin + dy * armCos, vertex[2]];
      }
      const point = [
        signs[0] * vertex[indices[0]] + offset[0],
        signs[1] * vertex[indices[1]] + offset[1],
        signs[2] * vertex[indices[2]] + offset[2],
      ];
      if (this.kind === 'full' && lidParts.has(part.id)) point[2] += lidLift;
      return point;
    }
    draw() {
      super.draw();
      if (!this.marker || this.marker.hidden) return;
      const scale = this.zoom * this.baseScale,
        [x, y] = this.project(current.position);
      this.marker.textContent = current.name + ' (' + current.position.join(', ') + ')';
      this.marker.style.left = this.canvas.clientWidth / 2 + (x - this.center[0]) * scale + 'px';
      this.marker.style.top = this.canvas.clientHeight / 2 - (y - this.center[1]) * scale + 'px';
    }
  }
  const view = new SceneView('viewer', 'full', 'viewtag'),
    detail = new SceneView('partViewer', 'detail', 'partViewtag');
  view.closedFraming = true;
  if (lockbox) {
    const reveal = make('button', 'Transparent shell');
    reveal.setAttribute('aria-pressed', 'false');
    reveal.onclick = () => {
      seeThrough = !seeThrough;
      reveal.setAttribute('aria-pressed', String(seeThrough));
      reveal.classList.toggle('active', seeThrough);
      view.draw();
    };
    card.querySelector('.toolbar').append(reveal);
    const simulator = make('section');
    simulator.className = 'controls box-simulator';
    simulator.setAttribute('aria-label', 'Lock box simulator');
    const state = make('output');
    const lock = make('button', 'Lock'), unlock = make('button', 'Unlock');
    const servoControl = labelControl(simulator, 'Servo angle (°)', make('input'));
    servoControl.type = 'range';
    servoControl.min = 0;
    servoControl.max = scene.servoAngles.maximum;
    const lid = labelControl(simulator, 'Lid lift (mm)', make('input'));
    lid.type = 'range';
    lid.min = 0;
    lid.max = scene.liftTravel;
    lid.step = 1;
    const close = make('button', 'Seat lid'), open = make('button', 'Lift lid');
    simulator.prepend(make('strong', 'Simulator'), lock, unlock);
    simulator.append(close, open, state);
    panel.append(simulator);
    function pose(opening, servo) {
      lidLift = opening;
      servoAngle = servo;
      const radians = Math.PI / 180;
      // The inverted SG90 turns clockwise when viewed from above the box.
      armCos = Math.cos(servo * radians);
      armSin = -Math.sin(servo * radians);
      servoControl.value = servo;
      servoControl.disabled = opening > 0;
      lid.value = opening;
      const locked = servo >= scene.servoAngles.lock;
      lid.disabled = open.disabled = servo !== 0;
      close.disabled = opening === 0;
      lock.disabled = opening > 0 || locked;
      unlock.disabled = servo === 0;
      const latchState = locked ? 'Locked' : servo === 0 ? 'Unlocked' : 'Partial travel';
      state.textContent = latchState + ' · SG90 ' + servo + '° · ' +
        (opening ? 'Lid raised ' + opening + ' mm' : 'Lid seated');
      view.fit(false);
      if (!editing) detail.fit(false);
    }
    lock.onclick = () => pose(0, scene.servoAngles.lock);
    unlock.onclick = () => pose(0, 0);
    open.onclick = () => pose(scene.liftTravel, 0);
    close.onclick = () => pose(0, 0);
    lid.oninput = () => pose(lid.valueAsNumber, 0);
    servoControl.oninput = () => pose(0, servoControl.valueAsNumber);
    pose(0, 0);
  }
  $('reset').onclick = () => view.reset();
  $('partReset').onclick = () => detail.reset();

  const tree = $('parts'),
    dialog = make('dialog'),
    form = make('div');
  dialog.className = 'scene-object-dialog';
  dialog.setAttribute('aria-label', 'Object properties');
  form.className = 'scene-hierarchy-form';
  dialog.append(form);
  document.body.append(dialog);
  function labelControl(box, title, el) {
    const label = make('label', title + ' ');
    el.setAttribute('aria-label', title);
    label.append(el);
    box.append(label);
    return el;
  }
  const nameInput = labelControl(form, 'Name', make('input'));
  const parentPicker = labelControl(form, 'Parent', make('select'));
  const actions = make('div');
  form.append(actions);
  const add = make('button', 'New group'),
    remove = make('button', 'Remove group');
  const up = make('button', 'Move up'),
    down = make('button', 'Move down');
  const doneWithObject = make('button', 'Done');
  doneWithObject.onclick = () => dialog.close();
  actions.append(add, remove, up, down, doneWithObject);
  const collapsed = new Set();
  function openProperties(node) {
    select(node);
    dialog.showModal();
    nameInput.focus();
    nameInput.select();
  }
  dialog.onclose = () => {
    const active = tree.querySelector('[aria-pressed="true"]');
    (active || $('search')).focus();
  };
  const children = (id) => [...nodes.values()].filter((node) => node.parent === id);
  function refreshForm() {
    nameInput.value = current.name;
    parentPicker.replaceChildren(new Option('Scene root', ''));
    const excluded = new Set(branch(current));
    for (const node of nodes.values())
      if (!excluded.has(node)) parentPicker.add(new Option(node.name, node.id));
    parentPicker.value = current.parent || '';
    remove.disabled = !current.id.startsWith('group-');
    const siblings = children(current.parent);
    up.disabled = siblings[0] === current;
    down.disabled = siblings.at(-1) === current;
  }
  function renderTree() {
    tree.replaceChildren();
    const query = $('search').value.trim().toLowerCase();
    function append(parent, container) {
      for (const node of children(parent)) {
        if (query && !branch(node).some((n) => n.name.toLowerCase().includes(query))) continue;
        const row = make('div');
        row.className = 'tree-row scene-tree-row';
        row.classList.toggle('active', node === current);
        const nested = children(node.id);
        if (nested.length) {
          const expander = make('button', collapsed.has(node.id) && !query ? '▸' : '▾');
          expander.className = 'tree-toggle';
          expander.setAttribute('aria-label', 'Toggle ' + node.name);
          expander.setAttribute('aria-expanded', String(!!query || !collapsed.has(node.id)));
          expander.onclick = () => {
            if (collapsed.has(node.id)) collapsed.delete(node.id);
            else collapsed.add(node.id);
            renderTree();
          };
          row.append(expander);
        } else {
          const spacer = make('span');
          spacer.className = 'tree-spacer';
          row.append(spacer);
        }
        const button = make('button', node.name);
        button.dataset.objectId = node.id;
        button.className = 'tree-label';
        button.setAttribute('aria-pressed', String(node === current));
        button.onclick = () => {
          select(node);
          tree.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true });
        };
        button.draggable = true;
        button.title = 'Drag to move · Right-click or press F2 for object properties';
        button.oncontextmenu = (e) => {
          e.preventDefault();
          openProperties(node);
        };
        button.onkeydown = (e) => {
          if (e.key === 'F2' || e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
            e.preventDefault();
            openProperties(node);
          }
        };
        row.append(button);
        container.append(row);
        if (nested.length && (query || !collapsed.has(node.id))) {
          const body = make('div');
          body.className = 'tree-children';
          container.append(body);
          append(node.id, body);
        }
      }
    }
    append(null, tree);
    tree.append(rootDrop);
    refreshForm();
    $('count').textContent = nodes.size + (lockbox ? ' objects' : ' 个对象');
  }
  function moveInTree(node, parent, anchor = null, after = false) {
    if (anchor === node || branch(node).some((n) => n.id === parent)) return;
    const ordered = [...nodes.values()].filter((n) => n !== node);
    const index = anchor ? ordered.indexOf(anchor) + Number(after) : ordered.length;
    ordered.splice(index, 0, node);
    nodes.clear();
    for (const entry of ordered) nodes.set(entry.id, entry);
    node.parent = parent;
    collapsed.delete(parent);
    select(node);
    save();
  }
  parentPicker.onchange = () => moveInTree(current, parentPicker.value || null);
  const rootDrop = make('div', 'Drop at scene root');
  rootDrop.className = 'scene-root-drop';
  rootDrop.hidden = true;
  let draggedNode = null,
    indicator = null;
  function clearIndicator() {
    if (indicator) delete indicator.dataset.drop;
    indicator = null;
  }
  function endTreeDrag() {
    clearIndicator();
    draggedNode = null;
    rootDrop.hidden = true;
  }
  tree.ondragstart = (e) => {
    draggedNode = nodes.get(e.target.closest('[data-object-id]')?.dataset.objectId);
    if (!draggedNode) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedNode.name);
    rootDrop.hidden = false;
  };
  function dropTarget(e) {
    if (!draggedNode) return null;
    const row = e.target.closest('.scene-tree-row');
    if (!row) return { el: rootDrop, zone: 'root', parent: null };
    const target = nodes.get(row.querySelector('[data-object-id]').dataset.objectId);
    const rect = row.getBoundingClientRect(),
      fraction = (e.clientY - rect.top) / rect.height;
    const zone = fraction < 0.25 ? 'before' : fraction > 0.75 ? 'after' : 'inside';
    const parent = zone === 'inside' ? target.id : target.parent;
    if (target === draggedNode || branch(draggedNode).some((n) => n.id === parent)) return null;
    return { el: row, zone, parent, anchor: zone === 'inside' ? null : target };
  }
  tree.ondragover = (e) => {
    const target = dropTarget(e);
    clearIndicator();
    if (!target) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    indicator = target.el;
    indicator.dataset.drop = target.zone;
  };
  tree.ondragleave = (e) => {
    if (!tree.contains(e.relatedTarget)) clearIndicator();
  };
  tree.ondragend = endTreeDrag;
  tree.ondrop = (e) => {
    const target = dropTarget(e),
      source = draggedNode;
    endTreeDrag();
    if (!target) return;
    e.preventDefault();
    moveInTree(source, target.parent, target.anchor, target.zone === 'after');
  };
  nameInput.onchange = () => {
    current.name = nameInput.value.trim() || current.name;
    select(current);
    save();
  };
  nameInput.onkeydown = (e) => {
    if (e.key === 'Enter') nameInput.blur();
  };
  add.onclick = () => {
    const group = addNode('group-' + crypto.randomUUID(), 'New group', [0, 0, 0]);
    group.parent = current.partIds.length ? current.parent : current.id;
    collapsed.delete(group.parent);
    $('search').value = '';
    select(group);
    save();
    nameInput.focus();
    nameInput.select();
  };
  remove.onclick = () => {
    if (!current.id.startsWith('group-')) return;
    const parent = current.parent;
    for (const child of children(current.id)) child.parent = parent;
    nodes.delete(current.id);
    select(nodes.get(parent) || nodes.get('breadboard'));
    save();
  };
  function reorder(step) {
    const siblings = children(current.parent),
      other = siblings[siblings.indexOf(current) + step];
    if (!other) return;
    moveInTree(current, current.parent, other, step > 0);
  }
  up.onclick = () => reorder(-1);
  down.onclick = () => reorder(1);
  $('search').oninput = renderTree;
  shortcut.onclick = () => {
    const toggle = $('directoryToggle');
    if (toggle.offsetWidth && toggle.getAttribute('aria-expanded') === 'false') toggle.click();
    (tree.querySelector('[aria-pressed="true"]') || $('search')).focus();
  };

  const modes = make('div');
  modes.className = 'toolbar scene-modes';
  modes.setAttribute('role', 'group');
  modes.setAttribute('aria-label', 'Viewer mode');
  const modelMode = make('button', 'Model Viewer'),
    editMode = make('button', 'Assembly Layout');
  const printMode = make('button', '3D Print List');
  const printList = make('section');
  modes.append(modelMode, editMode);
  panel.prepend(modes);
  const viewport = $('partViewer').parentElement,
    editor = make('section');
  editor.id = 'placementEditor';
  editor.hidden = true;
  editor.setAttribute('aria-label', 'Assembly Layout · top view');
  viewport.append(editor);
  const controls = make('div');
  controls.className = 'placement-controls';
  const picker = make('select');
  picker.setAttribute('aria-label', 'Object to move');
  controls.append(picker);
  const fields = ['X', 'Y', 'Z'].map((axis, i) => {
    const input = labelControl(controls, 'Δ' + axis + ' (mm)', make('input'));
    input.type = 'number';
    input.step = '0.01';
    input.onchange = () => {
      if (layoutItem && Number.isFinite(input.valueAsNumber)) {
        const target = [...layoutItem.position];
        target[i] = layoutItem.base[i] + input.valueAsNumber;
        move(target);
        framePlan();
        syncPlan();
        save();
      } else syncPlan();
    };
    input.onkeydown = (e) => {
      if (e.key === 'Enter') input.blur();
    };
    return input;
  });
  const reset = make('button', 'Reset position');
  controls.append(reset);
  const header = make('div');
  header.className = 'scene-layout-tools';
  const rotation = make('fieldset');
  rotation.className = 'scene-rotation';
  const rotationLegend = make('legend');
  rotation.append(rotationLegend);
  const cube = make('div');
  cube.className = 'scene-rotation-cube';
  const axisNames = ['X', 'Y', 'Z'];
  let rotationAxis = 2;
  const faces = axisNames.map((axis, i) => {
    const face = make('button');
    face.className = 'axis-' + axis.toLowerCase();
    face.onclick = () => {
      rotationAxis = i;
      syncPlan();
    };
    cube.append(face);
    return face;
  });
  const turns = make('div');
  turns.className = 'scene-rotation-actions';
  const rotateButtons = [-1, 1].map(sign => {
    const button = make('button', sign < 0 ? '−90°' : '+90°');
    button.onclick = () => {
      const axes = [...identity];
      const a = (rotationAxis + 1) % 3, b = (rotationAxis + 2) % 3;
      axes[a] = -sign * identity[b];
      axes[b] = sign * identity[a];
      rotate(axes);
    };
    turns.append(button);
    return button;
  });
  const resetRotation = make('button', 'Reset rotation');
  resetRotation.onclick = () => {
    if (!layoutItem) return;
    const inverse = [];
    layoutItem.orientation.forEach((axis, i) => {
      inverse[Math.abs(axis) - 1] = Math.sign(axis) * (i + 1);
    });
    rotate(inverse);
  };
  turns.append(resetRotation);
  rotation.append(cube, turns);
  header.append(controls, rotation);
  const stage = make('div');
  stage.className = 'placement-stage';
  const plane = make('div');
  plane.className = 'placement-plane scene-plane';
  stage.append(plane);
  const foot = make('div');
  foot.className = 'scene-plan-footer';
  const status = make('small', 'Drag a part or enter its offset in millimetres.');
  const done = make('button', 'Done editing');
  done.className = 'primary';
  foot.append(status, done);
  editor.append(header, stage, foot);
  let bounds,
    drag = null,
    frame = 0,
    layoutItem = null;
  const meshes = new Map(PARTS.map((p) => [p.id, p]));
  let refreshButtonWindow = () => {};
  let showPrintPreviews;
  if (lockbox) {
    const lidNode = nodes.get('LiftOffLid'), lid = meshes.get('LiftOffLid');
    const frameMesh = {vertices: lid.vertices, faces: lid.faces};
    const color = lid.colors[0];
    const download = make('button', 'Download lift-off lid STL');
    modelMode.after(printMode);
    printList.id = 'lockbox-print-list';
    printList.className = 'print-list';
    printList.hidden = true;
    printMode.setAttribute('aria-controls', printList.id);
    modes.after(printList);
    const grid = make('div');
    grid.className = 'print-grid';
    const bundle = make('a', 'Download all STLs (ZIP) · reference layout');
    bundle.download = 'Pico-Lock-Box-Print-Files.zip';
    bundle.href = '../output/cad/pico-lockbox/' + bundle.download;
    const heading = make('div');
    heading.className = 'print-list-heading';
    heading.append(make('h2', 'Pico lock box · ' + lockboxPrintList.length + ' printed parts'), bundle);
    printList.append(heading, grid);
    const printLid = make('button', 'Download STL');
    printLid.onclick = () => downloadLiftOffLid(lid);
    const previews = [];
    for (const item of lockboxPrintList) {
      const card = make('article'), canvas = make('canvas'), body = make('div'), actions = make('div');
      card.className = 'purchase-tile';
      body.className = 'purchase-body';
      actions.className = 'purchase-actions';
      canvas.id = 'print-preview-' + item.id;
      canvas.tabIndex = 0;
      canvas.setAttribute('aria-label', item.label + ' 3D preview. Drag or use arrow keys to rotate.');
      previews.push({canvas, part: meshes.get(item.id)});
      const action = item.id === 'LiftOffLid' ? printLid : make('a', 'Download STL');
      if (action !== printLid) {
        action.href = '../output/cad/pico-lockbox/print/' + item.file;
        action.download = item.file;
      }
      action.setAttribute('aria-label', 'Download STL for ' + item.label);
      actions.append(make('span', 'Qty 1'), action);
      body.append(make('h3', item.label), actions);
      card.append(canvas, body);
      grid.append(card);
    }
    showPrintPreviews = () => {
      for (const preview of previews) {
        if (!preview.view) {
          const view = new KitModelView(preview.canvas.id, 'print', null);
          view.studyParts = [preview.part];
          if (preview.part.id === 'LiftOffLid') view.tilt = -.85;
          preview.canvas.onkeydown = event => {
            const delta = {ArrowLeft: [-1,0], ArrowRight: [1,0], ArrowUp: [0,-1], ArrowDown: [0,1]}[event.key];
            if (!delta) return;
            event.preventDefault();
            orbitCadView(view, ...delta, .16);
            view.fit(false);
          };
          preview.view = view;
        }
        preview.view.fit(false);
      }
    };
    const warning = make('output');
    warning.setAttribute('aria-live', 'polite');
    modes.append(warning);
    controls.append(download);
    const hats = make('a', 'Download four button posts (STL)');
    hats.href = '../output/cad/pico-lockbox/Pico-Button-Hats.zip';
    hats.download = 'Pico-Button-Hats.zip';
    controls.append(hats);
    download.onclick = () => downloadLiftOffLid(lid);
    function rebuildLid(centers) {
      Object.assign(lid, lidWithButtonHoles(frameMesh, lockboxWindow, centers));
      lid.colors = Array(lid.faces.length).fill(color);
      highlightCache.delete(lid);
    }
    const referenceCenters = [1,2,3,4].map(i => nodes.get('button-' + i).base.slice(0,2));
    rebuildLid(referenceCenters);
    let lastPattern;
    refreshButtonWindow = () => {
      const centers = [];
      let facingError = '';
      for (let i = 1; i <= 4; i++) {
        const button = nodes.get('button-' + i), cap = nodes.get('Cap' + i);
        // Express the switch centre in the one-piece lid's coordinate system.
        const local = [...lidNode.base];
        for (let axis = 0; axis < 3; axis++) {
          const signed = lidNode.orientation[axis];
          local[Math.abs(signed)-1] += Math.sign(signed)*(button.position[axis]-lidNode.position[axis]);
        }
        centers.push(local.slice(0,2).map(round));
        const vertical = lidNode.orientation.findIndex(a => Math.abs(a) === 3);
        if (button.orientation[vertical] !== lidNode.orientation[vertical]) {
          facingError = 'B' + i + ' must face the roof.';
        }
        updateTransform({...cap, position:worldPoint(button, cap.base), orientation:button.orientation});
      }
      const pattern = JSON.stringify([centers,facingError]);
      if (pattern === lastPattern) return;
      lastPattern = pattern;
      try {
        if (facingError) throw Error(facingError);
        rebuildLid(centers);
        warning.textContent = '';
        printLid.disabled = download.disabled = false;
      } catch (error) {
        warning.textContent = 'Lid preview shows the last valid layout. ' + error.message;
        printLid.disabled = download.disabled = true;
      }
    };
    refreshButtonWindow();
  }
  function footprint(node) {
    const mesh = meshes.get(node.partIds[0]),
      [x, y] = node.position;
    if (!mesh) return { x: x - 3, y: y + 3, w: 6, h: 6 };
    // A quarter turn permutes the bounds axes, so opposite corners suffice.
    const low = worldPoint(node, mesh.bounds.slice(0, 3));
    const high = worldPoint(node, mesh.bounds.slice(3));
    return { x: Math.min(low[0], high[0]), y: Math.max(low[1], high[1]),
      w: Math.abs(high[0] - low[0]), h: Math.abs(high[1] - low[1]) };
  }
  function framePlan() {
    const shapes = [...footprints.keys()].map(footprint);
    if (!shapes.length) return;
    const left = Math.min(...shapes.map((p) => p.x)) - 12,
      top = Math.max(...shapes.map((p) => p.y)) + 12;
    bounds = {
      left,
      top,
      w: Math.max(...shapes.map((p) => p.x + p.w)) - left + 12,
      h: top - Math.min(...shapes.map((p) => p.y - p.h)) + 12,
    };
    plane.style.setProperty('--ratio', bounds.w / bounds.h);
  }
  const footprints = new Map();
  function syncPlan() {
    fields.forEach((field, i) => {
      field.disabled = !layoutItem;
      field.value = layoutItem ? round(layoutItem.position[i] - layoutItem.base[i]) : '';
    });
    picker.disabled = reset.disabled = !layoutItem;
    picker.value = layoutItem?.id ?? '';
    rotation.disabled = !layoutItem;
    rotationLegend.textContent = 'Rotate object · ' + axisNames[rotationAxis] + ' axis';
    const orientation = layoutItem?.orientation ?? identity;
    faces.forEach((face, i) => {
      const local = orientation[i];
      face.textContent = (local < 0 ? '−' : '+') + axisNames[Math.abs(local) - 1];
      face.setAttribute('aria-pressed', String(i === rotationAxis));
      face.title = 'Select assembly ' + axisNames[i] + ' axis (object ' + face.textContent + ')';
      face.setAttribute('aria-label', face.title);
    });
    rotateButtons.forEach((button, i) => {
      button.title = 'Rotate ' + (layoutItem?.name ?? 'object') + ' by ' +
        (i ? '+90' : '−90') + '° around assembly ' + axisNames[rotationAxis];
    });
    resetRotation.disabled = orientation.every((axis, i) => axis === identity[i]);
    for (const [node, el] of footprints) {
      const { x, y, w, h } = footprint(node);
      // Mark the local +Y edge so a half turn is visible even on a square part.
      const [axisX, axisY] = node.orientation;
      el.dataset.forward = ({2: 'right', '-2': 'left'})[axisX] ||
        ({2: 'top', '-2': 'bottom'})[axisY] || '';
      Object.assign(el.style, {
        left: ((x - bounds.left) / bounds.w) * 100 + '%',
        top: ((bounds.top - y) / bounds.h) * 100 + '%',
        width: (w / bounds.w) * 100 + '%',
        height: (h / bounds.h) * 100 + '%',
      });
      el.setAttribute('aria-pressed', String(node === layoutItem));
    }
  }
  function move(position) {
    if (!editing || !footprints.has(layoutItem)) return;
    const delta = position.map((v, i) => v - layoutItem.position[i]);
    for (const node of branch(layoutItem)) {
      node.position = node.position.map((v, i) => round(v + delta[i]));
      updateTransform(node);
    }
    refreshButtonWindow();
    syncPlan();
    if (!frame)
      frame = requestAnimationFrame(() => {
        frame = 0;
        view.draw();
        if (!editing) detail.fit(false);
      });
  }
  function rotate(axes) {
    if (!editing || !footprints.has(layoutItem)) return;
    const pivot = [...layoutItem.position];
    for (const node of branch(layoutItem)) {
      if (node !== layoutItem) {
        const relative = node.position.map((v, i) => v - pivot[i]);
        node.position = orient(relative, axes).map((v, i) => round(v + pivot[i]));
      }
      node.orientation = orient(node.orientation, axes);
      updateTransform(node);
    }
    refreshButtonWindow();
    framePlan();
    syncPlan();
    view.draw();
    save();
  }
  function rebuildPlan() {
    plane.replaceChildren();
    picker.replaceChildren();
    footprints.clear();
    const descendants = branch(layoutRoot).slice(1);
    if (!descendants.includes(layoutItem)) layoutItem = descendants[0] ?? null;
    stage.hidden = !descendants.length;
    status.textContent = layoutItem
      ? 'Drag a part or enter its offset in millimetres.'
      : 'Drag an object under ' + layoutRoot.name + ' in the hierarchy to edit its position.';
    for (const node of descendants) {
      picker.add(new Option(node.name, node.id));
      const el = make('button');
      el.className = 'placement-item scene-footprint';
      el.dataset.objectId = node.id;
      el.title = node.name;
      el.setAttribute('aria-label', node.name);
      if (!node.partIds.length) el.classList.add('scene-anchor');
      el.append(make('span', node.shortLabel || (node.partIds.length ? node.name : '＋')));
      // Stacked parts stay individually reachable from the picker and from the drawing.
      el.style.zIndex = node.id === 'breadboard' ? 0 : node.partIds.length ? 2 : 3;
      plane.append(el);
      footprints.set(node, el);
      el.onclick = () => selectLayoutItem(node);
      el.onpointerdown = (e) => {
        if (e.button !== 0 || drag) return;
        selectLayoutItem(node);
        drag = {
          id: e.pointerId,
          x: e.clientX,
          y: e.clientY,
          start: [...node.position],
          rect: plane.getBoundingClientRect(),
        };
        el.setPointerCapture(e.pointerId);
      };
      el.onpointermove = (e) => {
        if (!drag || e.pointerId !== drag.id || layoutItem !== node) return;
        const dx = ((e.clientX - drag.x) * bounds.w) / drag.rect.width,
          dy = ((drag.y - e.clientY) * bounds.h) / drag.rect.height;
        move([drag.start[0] + dx, drag.start[1] + dy, drag.start[2]]);
      };
      el.onpointerup = (e) => {
        if (drag?.id !== e.pointerId) return;
        drag = null;
        framePlan();
        syncPlan();
        save();
      };
      el.onlostpointercapture = () => {
        if (drag && layoutItem === node) {
          const start = drag.start;
          drag = null;
          move(start);
        }
      };
    }
    framePlan();
    syncPlan();
  }
  function selectLayoutItem(node) {
    if (!footprints.has(node)) return;
    layoutItem = node;
    syncPlan();
  }
  picker.onchange = () => selectLayoutItem(nodes.get(picker.value));
  reset.onclick = () => {
    if (layoutItem) {
      move(layoutItem.base);
      framePlan();
      syncPlan();
      save();
    }
  };
  function select(node, mode = editing && node === layoutRoot ? 'layout' : 'model') {
    current = node;
    if (lockbox) lidParts = new Set(branch(nodes.get(scene.lidGroup)).flatMap(n => n.partIds));
    editMode.hidden = node !== layoutRoot;
    editing = mode === 'layout' && !editMode.hidden;
    const printing = lockbox && mode === 'print';
    if (lockbox) {
      printList.hidden = !printing;
      card.closest('.viewports').hidden = printing;
      panel.querySelector('.box-simulator').hidden = printing;
    }
    editor.hidden = !editing;
    detailTools.hidden = editing;
    for (const button of modes.querySelectorAll('button')) {
      const active = button === (printing ? printMode : editing ? editMode : modelMode);
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    }
    for (const sibling of viewport.children) if (sibling !== editor) sibling.inert = editing;
    const ids = new Set(branch(node).flatMap((n) => n.partIds));
    selection = PARTS.filter((p) => ids.has(p.id));
    // Keep the roof display readable while the right viewer shows the whole kit.
    selected = { title: node.name, parts: lockbox && node === layoutRoot && !editing ? [] : selection };
    view.marker.hidden = detail.marker.hidden = selection.length > 0;
    $('detailTitle').textContent = editing ? layoutRoot.name + ' · top view' : node.name;
    renderTree();
    if (printing) {
      showPrintPreviews();
      return;
    }
    if (editing) rebuildPlan();
    view.draw();
    if (!editing) detail.fit();
  }
  editMode.onclick = () => select(current, 'layout');
  printMode.onclick = () => select(current, 'print');
  modelMode.onclick = done.onclick = () => select(current, 'model');
  view.reset();
  if (lockbox) setCadView(detail, CAD_VIEWS.top.direction);
  select(current, lockbox && new URLSearchParams(location.search).get('view') === 'print-list' ? 'print' : 'model');
})();
