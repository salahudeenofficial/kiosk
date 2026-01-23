// Size Chart Data
const SIZE_CHART = {
    'XS': { neck: [37, 38], chest: [81, 91] },
    'S': { neck: [38, 39], chest: [89, 94] },
    'M': { neck: [39, 40], chest: [96, 101] },
    'L': { neck: [41, 42], chest: [104, 109] },
    'XL': { neck: [43, 44], chest: [112, 117] },
    'XXL': { neck: [45, 46], chest: [119, 124] },
    '3XL': { neck: [47, 48], chest: [127, 132] },
    '4XL': { neck: [49, 50], chest: [137, 142] }
};

// Measurements Configuration
const measurementsConfig = [
    { key: 'neck', label: "Neck", defaultBody: 38, unit: "cm", regionId: "neck" },
    { key: 'chest', label: "Chest", defaultBody: 98, unit: "cm", regionId: "chest" },
    { key: 'waist', label: "Waist", defaultBody: 85, defaultRef: 95, unit: "cm", regionId: "waist" },
    { key: 'hips', label: "Hips", defaultBody: 102, defaultRef: 100, unit: "cm", regionId: "hips" },
    { key: 'thigh', label: "Thigh", defaultBody: 58, defaultRef: 60, unit: "cm", regionId: ["l-thigh", "r-thigh"] },
    { key: 'bicep', label: "Bicep", defaultBody: 34, defaultRef: 34, unit: "cm", regionId: ["l-arm-upper", "r-arm-upper"] },
    { key: 'calf', label: "Calf", defaultBody: 38, defaultRef: 42, unit: "cm", regionId: ["l-calf", "r-calf"] }
];

let globalSelectedSize = 'M';

// Determine status based on extended spectrum
function calculateStatus(bodyVal, refValOrRange) {
    if (!bodyVal) return 'unknown';

    // Case 1: Reference is a Range [min, max] (e.g. from chart)
    if (Array.isArray(refValOrRange)) {
        const [min, max] = refValOrRange;

        // Inside Range -> Perfect
        if (bodyVal >= min && bodyVal <= max) return 'good';

        // TIGHTER side (Body > Max)
        if (bodyVal > max) {
            const diff = bodyVal - max;
            if (diff <= 2) return 'snug';         // 1-2cm over
            if (diff <= 5) return 'tight';        // 3-5cm over
            return 'very-tight';                  // >5cm over
        }

        // LOOSER side (Body < Min)
        if (bodyVal < min) {
            const diff = min - bodyVal;
            if (diff <= 3) return 'relaxed';      // 1-3cm under
            if (diff <= 8) return 'loose';        // 4-8cm under
            return 'very-loose';                  // >8cm under
        }
    }

    // Case 2: Reference is a Single Value (Manual)
    if (refValOrRange) {
        // Garment Size - Body Size
        // Positive = Loose, Negative = Tight
        const diff = refValOrRange - bodyVal;

        if (diff < -5) return 'very-tight';
        if (diff < -2) return 'tight';
        if (diff < 0) return 'snug';

        if (diff >= 0 && diff <= 4) return 'good';

        if (diff > 4 && diff <= 8) return 'relaxed';
        if (diff > 8 && diff <= 12) return 'loose';
        return 'very-loose';
    }

    return 'unknown';
}

function getStatusColor(status) {
    const root = document.documentElement;
    const style = getComputedStyle(root);

    // Fallbacks provided in case CSS var read fails
    switch (status) {
        case 'very-tight': return style.getPropertyValue('--status-very-tight').trim() || '#cc0000';
        case 'tight': return style.getPropertyValue('--status-tight').trim() || '#ff4d4d';
        case 'snug': return style.getPropertyValue('--status-snug').trim() || '#ffad33';
        case 'good': return style.getPropertyValue('--status-good').trim() || '#4dff4d';
        case 'relaxed': return style.getPropertyValue('--status-relaxed').trim() || '#33e6ff';
        case 'loose': return style.getPropertyValue('--status-loose').trim() || '#4da6ff';
        case 'very-loose': return style.getPropertyValue('--status-very-loose').trim() || '#0040ff';
        default: return '#333';
    }
}

function getStatusLabel(status) {
    switch (status) {
        case 'very-tight': return 'V. TIGHT';
        case 'tight': return 'TIGHT';
        case 'snug': return 'SNUG';
        case 'good': return 'PERFECT';
        case 'relaxed': return 'RELAXED';
        case 'loose': return 'LOOSE';
        case 'very-loose': return 'V. LOOSE';
        default: return '--';
    }
}

function init() {
    initSizeSelector();
    renderMeasurementsTable();
    updateRecommendation();
    initPanelToggle();
}

function initPanelToggle() {
    const toggleBtn = document.getElementById('panel-toggle');
    const panel = document.getElementById('measurements-panel');
    if (!toggleBtn || !panel) return;
    const icon = toggleBtn.querySelector('.toggle-icon');

    // Initial state
    if (panel.classList.contains('collapsed')) {
        if (icon) icon.style.transform = 'rotate(0deg)';
    } else {
        if (icon) icon.style.transform = 'rotate(180deg)';
    }

    toggleBtn.addEventListener('click', () => {
        const isCollapsed = panel.classList.toggle('collapsed');
        if (icon) icon.style.transform = isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)';
    });
}


function initSizeSelector() {
    const container = document.getElementById('size-options');
    container.innerHTML = ''; // Clear

    Object.keys(SIZE_CHART).forEach(size => {
        const btn = document.createElement('button');
        btn.className = `size-btn ${size === globalSelectedSize ? 'active' : ''}`;
        btn.textContent = size;
        btn.dataset.size = size;

        btn.addEventListener('click', () => {
            globalSelectedSize = size;
            document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateReferenceValues();
        });

        container.appendChild(btn);
    });
}

function renderMeasurementsTable() {
    const listContainer = document.getElementById('measurements-list');
    listContainer.innerHTML = '';

    // Header
    const headerRow = document.createElement('div');
    headerRow.className = 'list-header';
    headerRow.innerHTML = `
        <div>Body Part</div>
        <div>Actual (cm)</div>
        <div>Reference (cm)</div>
        <div>Status</div>
    `;
    listContainer.appendChild(headerRow);

    // Rows
    measurementsConfig.forEach(config => {
        const row = document.createElement('div');
        row.className = 'measurement-row';
        row.dataset.key = config.key;

        // Label
        const labelDiv = document.createElement('div');
        labelDiv.className = 'm-label';
        labelDiv.textContent = config.label;

        // Input: Actual Body
        const bodyInputDiv = document.createElement('div');
        bodyInputDiv.className = 'm-input-group';
        const bodyInput = document.createElement('input');
        bodyInput.type = 'number';
        bodyInput.className = 'm-input body-input';
        bodyInput.value = config.defaultBody;
        bodyInput.id = `body-${config.key}`;
        bodyInputDiv.appendChild(bodyInput);

        // Reference Display
        const refDiv = document.createElement('div');
        refDiv.className = 'm-input-group ref-container';
        refDiv.id = `ref-container-${config.key}`;

        // Status Badge
        const statusDiv = document.createElement('div');
        const statusBadge = document.createElement('span');
        statusBadge.className = 'status-badge';
        statusBadge.id = `status-${config.key}`;
        statusDiv.appendChild(statusBadge);

        row.appendChild(labelDiv);
        row.appendChild(bodyInputDiv);
        row.appendChild(refDiv);
        row.appendChild(statusDiv);

        row.addEventListener('mouseenter', () => highlightBodyPart(config.regionId));
        row.addEventListener('mouseleave', () => resetBodyPart(config.regionId));

        bodyInput.addEventListener('input', () => {
            recalculateRow(config.key);
            updateRecommendation();
        });

        listContainer.appendChild(row);
    });

    updateReferenceValues();
}

function updateReferenceValues() {
    const chartData = SIZE_CHART[globalSelectedSize];

    measurementsConfig.forEach(config => {
        const refContainer = document.getElementById(`ref-container-${config.key}`);
        if (!refContainer) return;

        refContainer.innerHTML = '';

        if (chartData && chartData[config.key]) {
            const range = chartData[config.key];
            const textSpan = document.createElement('span');
            textSpan.className = 'm-reference-display';
            textSpan.textContent = `${range[0]} - ${range[1]}`;
            textSpan.dataset.min = range[0];
            textSpan.dataset.max = range[1];
            refContainer.appendChild(textSpan);
        } else {
            const existingInput = refContainer.querySelector('input');
            const val = existingInput ? existingInput.value : (config.defaultRef || '');

            const refInput = document.createElement('input');
            refInput.type = 'number';
            refInput.className = 'm-input ref-input';
            refInput.value = val;
            refInput.addEventListener('input', () => recalculateRow(config.key));
            refContainer.appendChild(refInput);
        }

        recalculateRow(config.key);
    });
}

function recalculateRow(key) {
    const config = measurementsConfig.find(c => c.key === key);
    const bodyInput = document.getElementById(`body-${key}`);
    const badge = document.getElementById(`status-${key}`);
    const refContainer = document.getElementById(`ref-container-${key}`);

    if (!bodyInput || !badge || !refContainer) return;

    const bodyVal = parseFloat(bodyInput.value);
    let refValOrRange = null;

    const rangeSpan = refContainer.querySelector('.m-reference-display');
    if (rangeSpan) {
        refValOrRange = [parseFloat(rangeSpan.dataset.min), parseFloat(rangeSpan.dataset.max)];
    } else {
        const refInput = refContainer.querySelector('input');
        if (refInput) {
            refValOrRange = parseFloat(refInput.value);
        }
    }

    const status = calculateStatus(bodyVal, refValOrRange);

    // Update Badge
    badge.className = `status-badge status-${status}`;
    badge.textContent = getStatusLabel(status);

    // Update Heatmap
    applyHeatmapColor(config.regionId, status);
}

function updateRecommendation() {
    const chestInput = document.getElementById('body-chest');
    const chestVal = chestInput ? parseFloat(chestInput.value) : 0;

    if (!chestVal) {
        document.getElementById('recommendation-msg').textContent = '';
        return;
    }

    let recommendedSize = null;

    // Find exact match first
    for (const [size, data] of Object.entries(SIZE_CHART)) {
        const [min, max] = data.chest;
        if (chestVal >= min && chestVal <= max) {
            recommendedSize = size;
            break;
        }
    }

    // Else find closest upper
    if (!recommendedSize) {
        for (const [size, data] of Object.entries(SIZE_CHART)) {
            const [min, max] = data.chest;
            if (chestVal <= max) {
                recommendedSize = size;
                break;
            }
        }
    }
    if (!recommendedSize && chestVal > 0) recommendedSize = '4XL+';

    const msgEl = document.getElementById('recommendation-msg');
    if (recommendedSize) {
        msgEl.textContent = `Based on your measurements, Size ${recommendedSize} suits you best.`;
    } else {
        msgEl.textContent = '';
    }
}


function applyHeatmapColor(regionIds, status) {
    const color = getStatusColor(status);
    const ids = Array.isArray(regionIds) ? regionIds : [regionIds];

    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.fill = color;
        }
    });
}

function highlightBodyPart(regionIds) {
    const ids = Array.isArray(regionIds) ? regionIds : [regionIds];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.filter = "brightness(1.5)";
        }
    });
}

function resetBodyPart(regionIds) {
    const ids = Array.isArray(regionIds) ? regionIds : [regionIds];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.filter = "none";
        }
    });
}

window.addEventListener('DOMContentLoaded', init);
