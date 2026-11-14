// Settings panel: sliders, title text and toggles.
// Writes straight into the shared settings object, then calls onChange(key).

const SLIDERS = [
  { key: 'speed', label: 'Speed', min: 150, max: 900, step: 10, format: (v) => `${Math.round(v)} px/s` },
  { key: 'size', label: 'Fighter size', min: 18, max: 60, step: 1, format: (v) => `${Math.round(v)} px` },
  { key: 'density', label: 'Line density', min: 0.4, max: 3, step: 0.1, format: (v) => `${v.toFixed(1)} per degree` },
  { key: 'grip', label: 'Wall grip time', min: 0.3, max: 2.5, step: 0.1, format: (v) => `×${v.toFixed(1)}` },
  { key: 'suddenDeath', label: 'Sudden death after', min: 15, max: 180, step: 5, format: (v) => `${Math.round(v)} s` },
];

export function createSettingsPanel({ settings, onChange }) {
  const sliders = document.getElementById('sliders');

  for (const slider of SLIDERS) {
    const id = `setting-${slider.key}`;
    const field = document.createElement('div');
    field.className = 'field';

    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = slider.label;

    const output = document.createElement('output');
    output.htmlFor = id;

    const input = document.createElement('input');
    input.type = 'range';
    input.id = id;
    input.min = slider.min;
    input.max = slider.max;
    input.step = slider.step;
    input.value = settings[slider.key];

    const show = () => { output.textContent = slider.format(Number(settings[slider.key])); };
    input.addEventListener('input', () => {
      settings[slider.key] = Number(input.value);
      show();
      onChange(slider.key);
    });

    show();
    field.append(label, output, input);
    sliders.append(field);
  }

  bindText('title', 'title');
  bindText('subtitle', 'subtitle');
  bindCheckbox('show-counts', 'showCounts');
  bindCheckbox('sound', 'sound');

  function bindText(id, key) {
    const input = document.getElementById(id);
    input.value = settings[key];
    input.addEventListener('input', () => {
      settings[key] = input.value;
      onChange(key);
    });
  }

  function bindCheckbox(id, key) {
    const input = document.getElementById(id);
    input.checked = Boolean(settings[key]);
    input.addEventListener('change', () => {
      settings[key] = input.checked;
      onChange(key);
    });
  }
}
