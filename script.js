const countries = [
    { id: 'pa', name: 'Panamá', flag: '🇵🇦', currency: '$', prefix: '+507', isUSD: true },
    { id: 'cr', name: 'Costa Rica', flag: '🇨🇷', currency: '₡', prefix: '+506' },
    { id: 'ni', name: 'Nicaragua', flag: '🇳🇮', currency: 'C$', prefix: '+505' },
    { id: 'us', name: 'Estados Unidos', flag: '🇺🇸', currency: '$', prefix: '+1', isUSD: true },
    { id: 'ar', name: 'Argentina', flag: '🇦🇷', currency: '$', prefix: '+54', isUSD: true },
    { id: 'ec', name: 'Ecuador', flag: '🇪🇨', currency: '$', prefix: '+593', isUSD: true },
    { id: 'mx', name: 'México', flag: '🇲🇽', currency: '$', prefix: '+52' },
    { id: 'pe', name: 'Perú', flag: '🇵🇪', currency: 'S/', prefix: '+51' },
    { id: 'do', name: 'Rep. Dominicana', flag: '🇩🇴', currency: 'RD$', prefix: '+1' },
    { id: 'uy', name: 'Uruguay', flag: '🇺🇾', currency: '$U', prefix: '+598' },
    { id: 'py', name: 'Paraguay', flag: '🇵🇾', currency: '₲', prefix: '+595' },
    { id: 'es', name: 'España', flag: '🇪🇸', currency: '€', prefix: '+34' },
    { id: 've', name: 'Venezuela', flag: '🇻🇪', currency: 'Bs.', prefix: '+58' },
    { id: 'co', name: 'Colombia', flag: '🇨🇴', currency: '$', prefix: '+57' }
];

document.addEventListener('DOMContentLoaded', () => {
    initRatesCalculator();
    initPercentageCalculator();
    initDirectory();
});

// === RATES CALCULATOR ===
function initRatesCalculator() {
    const container = document.getElementById('rates-container');
    const saveBtn = document.getElementById('save-rates-btn');
    const editBtn = document.getElementById('edit-rates-btn');
    
    let savedRates = JSON.parse(localStorage.getItem('gamerLabRates')) || {};
    let hasSavedRates = Object.keys(savedRates).length > 0;

    // Generar HTML (excluyendo países que ya usan USD)
    const calcCountries = countries.filter(c => !c.isUSD);
    
    calcCountries.forEach(country => {
        const row = document.createElement('div');
        row.className = 'calc-row';
        row.innerHTML = `
            <div class="country-info">
                <span class="country-flag">${country.flag}</span>
                <span>${country.name}</span>
            </div>
            
            <div class="input-group">
                <label>Tasa</label>
                <input type="number" id="rate-${country.id}" class="rate-input" placeholder="0.00" step="any" ${hasSavedRates ? 'readonly' : ''}>
            </div>
            
            <button class="toggle-btn rate-op-btn" id="op-${country.id}" data-op="multiply">×</button>
            
            <div class="input-group">
                <label>Monto ($)</label>
                <div class="input-with-symbol">
                    <span class="symbol" style="left: 1rem; right: auto;">$</span>
                    <input type="number" id="amount-${country.id}" style="padding-left: 2rem;" placeholder="0.00" step="any">
                </div>
            </div>
            
            <button class="action-btn calc-rate-btn" data-id="${country.id}">Calcular</button>
            
            <div class="result-box">
                <span id="result-${country.id}">0.00 ${country.currency}</span>
            </div>
        `;
        container.appendChild(row);

        // Si hay tasa guardada, ponerla
        if (savedRates[country.id]) {
            document.getElementById(`rate-${country.id}`).value = savedRates[country.id];
        }

        // Event listener toggle operacion
        const toggleBtn = row.querySelector('.rate-op-btn');
        toggleBtn.addEventListener('click', () => {
            if (toggleBtn.dataset.op === 'multiply') {
                toggleBtn.dataset.op = 'divide';
                toggleBtn.textContent = '÷';
            } else {
                toggleBtn.dataset.op = 'multiply';
                toggleBtn.textContent = '×';
            }
        });

        // Event listener calcular fila
        const calcBtn = row.querySelector('.calc-rate-btn');
        calcBtn.addEventListener('click', () => calculateRate(country));
    });

    // Estado botones
    if (hasSavedRates) {
        saveBtn.classList.add('hidden');
        editBtn.classList.remove('hidden');
    }

    // Botón Guardar
    saveBtn.addEventListener('click', () => {
        const inputs = document.querySelectorAll('.rate-input');
        const newRates = {};
        inputs.forEach(input => {
            const id = input.id.replace('rate-', '');
            if (input.value) {
                newRates[id] = input.value;
            }
            input.readOnly = true;
        });
        localStorage.setItem('gamerLabRates', JSON.stringify(newRates));
        saveBtn.classList.add('hidden');
        editBtn.classList.remove('hidden');
    });

    // Botón Editar
    editBtn.addEventListener('click', () => {
        const inputs = document.querySelectorAll('.rate-input');
        inputs.forEach(input => {
            input.readOnly = false;
        });
        saveBtn.classList.remove('hidden');
        editBtn.classList.add('hidden');
    });
}

function calculateRate(country) {
    const rateInput = document.getElementById(`rate-${country.id}`);
    const amountInput = document.getElementById(`amount-${country.id}`);
    const opBtn = document.getElementById(`op-${country.id}`);
    const resultSpan = document.getElementById(`result-${country.id}`);

    const rate = parseFloat(rateInput.value) || 0;
    const amount = parseFloat(amountInput.value) || 0;
    const op = opBtn.dataset.op;

    let result = 0;
    if (op === 'multiply') {
        result = amount * rate;
    } else {
        result = rate !== 0 ? amount / rate : 0;
    }

    // Formatear a 2 decimales
    resultSpan.textContent = `${result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${country.currency}`;
}


// === PERCENTAGE CALCULATOR ===
function initPercentageCalculator() {
    const toggleBtn = document.getElementById('perc-toggle');
    const calcBtn = document.getElementById('perc-calc-btn');

    toggleBtn.addEventListener('click', () => {
        if (toggleBtn.dataset.op === 'add') {
            toggleBtn.dataset.op = 'subtract';
            toggleBtn.textContent = '-';
        } else {
            toggleBtn.dataset.op = 'add';
            toggleBtn.textContent = '+';
        }
    });

    calcBtn.addEventListener('click', () => {
        const amount = parseFloat(document.getElementById('perc-amount').value) || 0;
        const percValue = parseFloat(document.getElementById('perc-value').value) || 0;
        const op = toggleBtn.dataset.op;
        const resultSpan = document.getElementById('perc-result');

        const percAmount = amount * (percValue / 100);
        let result = 0;

        if (op === 'add') {
            result = amount + percAmount;
        } else {
            result = amount - percAmount;
        }

        resultSpan.textContent = result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    });
}


// === DIRECTORY ===
function initDirectory() {
    const container = document.getElementById('directory-container');
    
    // Ordenar alfabéticamente
    const sortedCountries = [...countries].sort((a, b) => a.name.localeCompare(b.name));

    sortedCountries.forEach(country => {
        const item = document.createElement('div');
        item.className = 'directory-item';
        item.innerHTML = `
            <div class="country">
                <span>${country.flag}</span>
                <span>${country.name}</span>
            </div>
            <div class="prefix">${country.prefix}</div>
        `;
        container.appendChild(item);
    });
}
