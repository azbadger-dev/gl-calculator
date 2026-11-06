document.addEventListener('DOMContentLoaded', () => {
    initParentChild();
});

function initParentChild() {
    const rawInput = document.getElementById('raw-data');
    const processBtn = document.getElementById('process-btn');
    const clearBtn = document.getElementById('clear-btn');
    const formatRadios = document.getElementsByName('format');
    const childDateInput = document.getElementById('child-date-input');
    const resetDateBtn = document.getElementById('reset-date-btn');
    const dateConfigBox = document.getElementById('date-config-box');
    const accountCounter = document.getElementById('account-counter');
    const outputArea = document.getElementById('output-text');
    const copyBtn = document.getElementById('copy-btn');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    let toastTimeout = null;

    // 1. Inicializar la fecha automática para Hijas
    function calculateDefaultChildDate(baseDate = new Date()) {
        const currentYear = baseDate.getFullYear();
        const currentMonth = baseDate.getMonth(); // 0-11
        const currentDate = baseDate.getDate();

        // Regla: 1 día más, 1 mes más, y 17 años atrás (en 2026 corresponde a 2008)
        const targetYear = (currentYear === 2026) ? 2008 : (currentYear - 17);
        const targetDateObj = new Date(targetYear, currentMonth + 1, currentDate + 1);

        const day = targetDateObj.getDate();
        const month = targetDateObj.getMonth() + 1;
        const year = targetDateObj.getFullYear();

        return `${day}/${month}/${year}`;
    }

    // Cargar fecha por defecto
    childDateInput.value = calculateDefaultChildDate();

    // Botón para resetear a la fecha calculada
    resetDateBtn.addEventListener('click', () => {
        childDateInput.value = calculateDefaultChildDate();
        showToast('Fecha recalculada automáticamente 📅');
    });

    // 2. Control de visibilidad/estilo de la caja de fecha según formato seleccionado
    function updateDateBoxState() {
        const selectedFormat = getSelectedFormat();
        if (selectedFormat === 'mothers') {
            dateConfigBox.style.opacity = '0.5';
            dateConfigBox.style.pointerEvents = 'none';
        } else {
            dateConfigBox.style.opacity = '1';
            dateConfigBox.style.pointerEvents = 'auto';
        }
    }

    formatRadios.forEach(radio => {
        radio.addEventListener('change', updateDateBoxState);
    });
    updateDateBoxState();

    function getSelectedFormat() {
        for (const radio of formatRadios) {
            if (radio.checked) return radio.value;
        }
        return 'mother-child';
    }

    // 3. Parser flexible de filas de entrada (Excel, tabuladores, |, :, ;, etc.)
    function parseInputRows(rawText) {
        if (!rawText || !rawText.trim()) return [];

        const lines = rawText.split(/\r?\n/);
        const parsed = [];

        for (let line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue; // Ignorar líneas en blanco

            let email = '';
            let password = '';

            if (trimmed.includes('\t')) {
                // Copiado directo desde celdas de Excel
                const p = trimmed.split('\t');
                email = p[0].trim();
                password = p[1] ? p[1].trim() : '';
            } else if (trimmed.includes('|')) {
                // Separado por barra vertical
                const p = trimmed.split('|');
                email = p[0].trim();
                password = p[1] ? p[1].trim() : '';
            } else if (trimmed.includes(':') && trimmed.includes('@')) {
                // Separado por dos puntos correo:password
                const idx = trimmed.indexOf(':');
                email = trimmed.slice(0, idx).trim();
                password = trimmed.slice(idx + 1).trim();
            } else if (trimmed.includes(';')) {
                // Separado por punto y coma
                const p = trimmed.split(';');
                email = p[0].trim();
                password = p[1] ? p[1].trim() : '';
            } else {
                // Separado por espacios
                const p = trimmed.split(/\s+/);
                email = p[0].trim();
                password = p.slice(1).join(' ').trim();
            }

            // Quitar posibles comillas envolventes de CSV/Excel
            email = email.replace(/^["']|["']$/g, '').trim();
            password = password.replace(/^["']|["']$/g, '').trim();

            if (email || password) {
                parsed.push({ email, password });
            }
        }

        return parsed;
    }

    // 4. Formateadores por cuenta
    function formatMother(email, password) {
        // Paquete de cuenta madre: correo, contraseña y 3 enters vacíos debajo
        return `${email}\n${password}\n\n\n`;
    }

    function formatChild(email, password, dateStr) {
        // Paquete de cuenta hija: fecha, enter, correo, contraseña y 3 enters vacíos debajo
        return `${dateStr}\n\n${email}\n${password}\n\n\n`;
    }

    // 5. Procesamiento principal
    function processAccounts() {
        const rawText = rawInput.value;
        if (!rawText.trim()) {
            showToast('Por favor pega los datos de las cuentas ⚠️');
            rawInput.focus();
            return;
        }

        const accounts = parseInputRows(rawText);
        if (accounts.length === 0) {
            showToast('No se detectaron filas válidas de cuentas ⚠️');
            return;
        }

        const formatType = getSelectedFormat();
        const childDate = childDateInput.value.trim() || calculateDefaultChildDate();

        const blocks = accounts.map((acc, index) => {
            if (formatType === 'mothers') {
                return formatMother(acc.email, acc.password);
            } else if (formatType === 'children') {
                return formatChild(acc.email, acc.password, childDate);
            } else if (formatType === 'mother-child') {
                // Alternado: Fila par -> Madre, Fila impar -> Hija
                if (index % 2 === 0) {
                    return formatMother(acc.email, acc.password);
                } else {
                    return formatChild(acc.email, acc.password, childDate);
                }
            }
        });

        // Se unen las cuentas separadas con un enter extra de separación entre cada una (cuarto enter de separación)
        const finalOutput = blocks.join('\n\n');

        outputArea.value = finalOutput;
        copyBtn.style.display = 'flex';

        // Actualizar contador
        updateCounter(accounts.length, formatType);

        showToast('¡Texto formateado con éxito! ✨');
    }

    function updateCounter(total, formatType) {
        if (formatType === 'mothers') {
            accountCounter.innerHTML = `<i class='bx bx-user-check'></i> ${total} ${total === 1 ? 'cuenta' : 'cuentas'} (Madres)`;
        } else if (formatType === 'children') {
            accountCounter.innerHTML = `<i class='bx bx-user-check'></i> ${total} ${total === 1 ? 'cuenta' : 'cuentas'} (Hijas)`;
        } else if (formatType === 'mother-child') {
            const mothersCount = Math.ceil(total / 2);
            const childrenCount = Math.floor(total / 2);
            accountCounter.innerHTML = `<i class='bx bx-user-check'></i> ${total} cuentas (${mothersCount} Madres, ${childrenCount} Hijas)`;
        }
    }

    processBtn.addEventListener('click', processAccounts);

    // Atajo Ctrl+Enter en el área de texto de entrada para procesar
    rawInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            processAccounts();
        }
    });

    // 6. Botón de Limpiar
    clearBtn.addEventListener('click', () => {
        rawInput.value = '';
        outputArea.value = '';
        copyBtn.style.display = 'none';
        accountCounter.innerHTML = `<i class='bx bx-user-check'></i> 0 cuentas`;
        rawInput.focus();
        showToast('Campos vaciados 🗑️');
    });

    // 7. Copiar al Portapapeles
    copyBtn.addEventListener('click', () => {
        if (!outputArea.value) return;

        copyToClipboard(outputArea.value)
            .then(() => {
                showToast('¡Texto copiado al portapapeles! 📋');
            })
            .catch(err => {
                console.error('Error al copiar:', err);
                showToast('Error al copiar al portapapeles ❌');
            });
    });

    function copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        } else {
            return new Promise((resolve, reject) => {
                const tempArea = document.createElement('textarea');
                tempArea.value = text;
                tempArea.style.position = 'fixed';
                tempArea.style.left = '-9999px';
                tempArea.style.top = '0';
                document.body.appendChild(tempArea);
                tempArea.focus();
                tempArea.select();
                try {
                    const success = document.execCommand('copy');
                    tempArea.remove();
                    if (success) resolve();
                    else reject(new Error('execCommand falló'));
                } catch (err) {
                    tempArea.remove();
                    reject(err);
                }
            });
        }
    }

    // 8. Toast notification
    function showToast(message = '¡Texto copiado al portapapeles! 📋') {
        if (!toast) return;
        toastMessage.textContent = message;
        toast.classList.add('show');
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}
