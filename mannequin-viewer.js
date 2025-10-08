// === UI Tab and Morph/Color Button Logic ===
window.addEventListener('DOMContentLoaded', () => {
  // Tab switching
  const bodyTabBtn = document.getElementById('bodyTabBtn');
  const otherPrefBtn = document.getElementById('otherPrefBtn');
  const bodyTab = document.getElementById('bodyTab');
  const otherPrefTab = document.getElementById('otherPrefTab');
  if (bodyTabBtn && otherPrefBtn && bodyTab && otherPrefTab) {
    bodyTabBtn.addEventListener('click', function() {
      bodyTabBtn.classList.add('active');
      otherPrefBtn.classList.remove('active');
      bodyTab.style.display = 'block';
      otherPrefTab.style.display = 'none';
    });
    otherPrefBtn.addEventListener('click', function() {
      otherPrefBtn.classList.add('active');
      bodyTabBtn.classList.remove('active');
      bodyTab.style.display = 'none';
      otherPrefTab.style.display = 'block';
    });
  }

  // Button logic is now wired after mannequin is loaded
  window._wireMorphButtons = function() {
    // Helper: set morph target for a category (face/body/pose)
    function setMorphTargetExclusive(morphName, categoryShapes) {
      if (!window.mannequin) return;
      let mesh = null;
      window.mannequin.traverse(child => {
        if (child.isMesh && child.morphTargetDictionary && child.morphTargetDictionary[morphName] !== undefined) {
          mesh = child;
        }
      });
      if (mesh) {
        // Only zero out morphs in the same category
        categoryShapes.forEach(key => {
          const idx = mesh.morphTargetDictionary[key];
          if (idx !== undefined) mesh.morphTargetInfluences[idx] = (key === morphName) ? 1 : 0;
        });
      }
    }
    // Helper: set pose morph (mutually exclusive)
    function setPoseMorph(morphName, poseShapes) {
      if (!window.mannequin) return;
      let mesh = null;
      window.mannequin.traverse(child => {
        if (child.isMesh && child.morphTargetDictionary && child.morphTargetDictionary[morphName] !== undefined) {
          mesh = child;
        }
      });
      if (mesh) {
        poseShapes.forEach(key => {
          const idx = mesh.morphTargetDictionary[key];
          if (idx !== undefined) mesh.morphTargetInfluences[idx] = (key === morphName) ? 1 : 0;
        });
      }
    }
    // Helper: set skin tone
    function setSkinTone(color) {
      if (!window.mannequin) return;
      window.mannequin.traverse(child => {
        if (child.isMesh && child.material && child.material.color) {
          child.material.color.set(color);
        }
      });
    }

    // Skin tone buttons
    const skinTones = [
      { name: 'Light', color: '#FFDFC4' },
      { name: 'Medium', color: '#e0b899' },
      { name: 'Tan', color: '#c68642' },
      { name: 'Dark', color: '#a97c50' }
    ];
    skinTones.forEach(tone => {
      const btn = document.querySelector(`.skin-btn[data-skin="${tone.color}"]`);
      if (btn) {
        btn.onclick = () => setSkinTone(tone.color);
      }
    });

    // Face shape buttons (all listed)
    const faceShapes = [
      'Oval Face Shape', 'Square Face Shape', 'Diamond Face Shape', 'Rectangular Face Shape',
      'Heart Face Shape'
    ];
    faceShapes.forEach(shape => {
      const btn = document.querySelector(`.face-btn[data-morph="${shape}"]`);
      if (btn) {
        btn.onclick = () => setMorphTargetExclusive(shape, faceShapes);
      }
    });

    // Body shape buttons (all listed)
    const bodyShapes = [
      'Triangle Body', 'Straight Body', 'Curvy Body', 'Body (to Fat)', 'Thin', 'Sitting'
    ];
    bodyShapes.forEach(shape => {
      const btn = document.querySelector(`.bodyshape-btn[data-morph="${shape}"]`);
      if (btn) {
        btn.onclick = () => setMorphTargetExclusive(shape, bodyShapes);
      }
    });

    // Pose buttons (mutually exclusive)
    const poseShapes = ["'T' Pose", "'A' Pose", "'Hi' Pose", "'Peace' Pose"];
    poseShapes.forEach(shape => {
      const btn = document.querySelector(`.pose-btn[data-morph="${shape}"]`);
      if (btn) {
        btn.onclick = () => setPoseMorph(shape, poseShapes);
      }
    });
  };
});
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// === Container ===
const container = document.getElementById("mannequinViewer");
container.style.width = "100%";
container.style.height = "500px";

// === Renderer ===
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.outputEncoding = THREE.sRGBEncoding; // ✅ proper color brightness
container.appendChild(renderer.domElement);

// === Scene & Camera ===
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf2f2f2);

const camera = new THREE.PerspectiveCamera(
  45,
  container.clientWidth / container.clientHeight,
  0.1,
  1000
);
camera.position.set(0, 1.6, 4);

// === Lights ===
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(3, 10, 10);
dirLight.castShadow = true;
scene.add(dirLight);

// === Controls (free rotation + zoom) ===
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

controls.enableZoom = true;
controls.minDistance = 2;
controls.maxDistance = 3;

controls.enablePan = false; // keep panning disabled for consistency
// ❌ removed polar lock, so you can rotate freely (up/down/around)

controls.rotateSpeed = 0.8;
controls.zoomSpeed = 1.0;

// === Load Mannequin ===
const loader = new GLTFLoader().setPath('./'); // same folder
let mannequin;
loader.load(
  'mannequin.glb',
  (gltf) => {
    mannequin = gltf.scene;
    window.mannequin = mannequin; // Make mannequin globally available for button logic
    scene.add(mannequin);

    // Center the model
    const box = new THREE.Box3().setFromObject(mannequin);
    const center = box.getCenter(new THREE.Vector3());
    mannequin.position.sub(center);

    // ✅ Apply clean skin tone
    mannequin.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: '#FFDFC4',   // light skin tone
          roughness: 0.6,     // softer look
          metalness: 0.0,     // not metallic
        });
      }
    });

    // === Dynamic morph target (shape key) control ===
    const morphTargets = [
      'Shoulders', 'Arms', 'Chest', 'Waist', 'Torso'
    ];

    // Find all meshes with morph targets
    let morphMeshes = [];
    mannequin.traverse((child) => {
      if (child.isMesh && child.morphTargetDictionary) {
        morphMeshes.push(child);
      }
    });

    // Helper: convert morph name to slider id (lowercase, spaces/specials to dashes)
    function morphNameToId(name) {
      return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }

    // Accurate min/max for each metric (real world)
    const metricRanges = {
      'shoulder-width': { cm: [40, 55], inch: [15.748, 21.6535] },
      'chest':         { cm: [80, 110], inch: [31.4961, 43.3071] },
      'waist':         { cm: [70, 100], inch: [27.5591, 39.3701] },
      'height':        { cm: [150, 200], inch: [59.0551, 78.7402] },
      'torso-length':  { cm: [50, 80], inch: [19.685, 31.4961] }
    };

    // For each morph target, set up slider/value-display/metric sync
    morphTargets.forEach((morphName) => {
      const sliderId = morphNameToId(morphName);
      const slider = document.getElementById(sliderId);
      const valueDisplay = slider && slider.parentElement.querySelector('.value-display');
      const metricSelect = slider && slider.parentElement.querySelector('.metric-select');
      if (!slider || !valueDisplay || !metricSelect) return;

      // Find mesh with this morph target
      let mesh = morphMeshes.find(m => m.morphTargetDictionary[morphName] !== undefined);
      if (!mesh) return;

      // Helper: clamp and format
      function clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
      }
      function format(val) {
        return parseFloat(val).toFixed(2);
      }

      // Get metric and min/max
      function getMetric() {
        return metricSelect.value;
      }
      function getMinMax() {
        const metric = getMetric();
        const range = metricRanges[sliderId] || { cm: [slider.min, slider.max], inch: [slider.min, slider.max] };
        return range[metric];
      }

      // Set morph target influence
      function setMorph(val) {
        const [min, max] = getMinMax();
        const influence = (val - min) / (max - min);
        const idx = mesh.morphTargetDictionary[morphName];
        mesh.morphTargetInfluences[idx] = clamp(influence, 0, 1);
      }

      // Sync valueDisplay with slider (live update)
      slider.addEventListener('input', () => {
        let val = format(slider.value);
        valueDisplay.value = val;
        setMorph(parseFloat(val));
      });

      // Only allow numbers in valueDisplay, but don't update slider until blur
      valueDisplay.addEventListener('input', () => {
        let val = valueDisplay.value.replace(/[^0-9.]/g, '');
        valueDisplay.value = val;
      });

      // On blur or Enter, validate and update
      function validateAndUpdate() {
        let val = valueDisplay.value;
        let num = parseFloat(val);
        const [min, max] = getMinMax();
        if (isNaN(num) || num < min || num > max) {
          alert('Please enter a valid number between ' + min + ' and ' + max + '.');
          valueDisplay.value = format(slider.min);
          slider.value = format(slider.min);
          setMorph(parseFloat(slider.min));
        } else {
          num = clamp(num, min, max);
          valueDisplay.value = format(num);
          slider.value = format(num);
          setMorph(num);
        }
      }
      valueDisplay.addEventListener('blur', validateAndUpdate);
      valueDisplay.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          valueDisplay.blur();
        }
      });

      // Metric change: update min/max/value
      metricSelect.addEventListener('change', () => {
        const metric = getMetric();
        const [min, max] = getMinMax();
        slider.min = min;
        slider.max = max;
        slider.step = metric === 'cm' ? 0.5 : 0.01;
        // Convert value
        let val = parseFloat(slider.value);
        if (metric === 'cm') {
          // Convert inch to cm
          val = Math.round(val * 2.54 * 100) / 100;
        } else {
          // Convert cm to inch
          val = Math.round(val / 2.54 * 100) / 100;
        }
        // Clamp and update
        val = clamp(val, min, max);
        slider.value = format(val);
        valueDisplay.value = format(val);
        setMorph(val);
      });

      // Initialize valueDisplay and morph
      valueDisplay.value = format(slider.value);
      setMorph(parseFloat(slider.value));
    });

    // Wire up morph/skin buttons now mannequin is loaded
    if (window._wireMorphButtons) window._wireMorphButtons();

    console.log('✅ Mannequin loaded');
  },
  undefined,
  (err) => console.error('❌ Error loading mannequin:', err)
);

// === Animate ===
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// === Handle Resize ===
window.addEventListener("resize", () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});
