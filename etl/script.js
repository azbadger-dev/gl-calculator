document.addEventListener('DOMContentLoaded', () => {
    const rawDataInput = document.getElementById('raw-data');
    const processBtn = document.getElementById('process-btn');
    const formatRadios = document.getElementsByName('format');
    const tableHead = document.getElementById('table-head');
    const tableBody = document.getElementById('table-body');

    // Mapeo de columnas esperadas según el formato
    const headersF1 = [
        'Login Email', 
        'Mail Password', 
        'Date of Birth', 
        'Empty', 
        'PS Email', 
        'PS Password', 
        'Backup Codes', 
        '2FA Google'
    ];
    
    const headersF2 = [
        'Email', 
        'Mail Password', 
        'Date of Birth', 
        'ID', 
        'PS Email', 
        'PS Password', 
        'Backup Codes', 
        '2FA Google'
    ];

    const copyBtn = document.getElementById('copy-btn');
    let currentParsedData = [];
    let currentFormat = '1';

    processBtn.addEventListener('click', () => {
        const rawText = rawDataInput.value;
        if (!rawText.trim()) {
            alert('Por favor, ingresa los datos en crudo para procesar.');
            return;
        }

        let selectedFormat = '1';
        for (const radio of formatRadios) {
            if (radio.checked) {
                selectedFormat = radio.value;
                break;
            }
        }

        try {
            const parsedData = parseData(rawText, selectedFormat);
            
            if (parsedData.length === 0) {
                alert('No se detectaron cuentas. Revisa que el formato coincida con tu selección.');
                return;
            }

            // Guardar datos en el estado para el botón de copiar
            currentParsedData = parsedData;
            currentFormat = selectedFormat;

            // Renderizar la tabla de previsualización
            renderTable(parsedData, selectedFormat);
            
            // Mostrar botón de copiar
            copyBtn.style.display = 'block';
            
        } catch (error) {
            console.error(error);
            alert('Error al procesar los datos. Revisa el formato.');
        }
    });

    copyBtn.addEventListener('click', async () => {
        if (currentParsedData.length === 0) return;
        
        try {
            // Generar el string TSV para Excel
            const tsvString = generateTSV(currentParsedData, currentFormat);
            
            // Copiar al portapapeles
            await navigator.clipboard.writeText(tsvString);
            
            // Mostrar toast
            showToast();
        } catch (error) {
            console.error('Error al copiar:', error);
            alert('No se pudo copiar al portapapeles.');
        }
    });

    let toastTimeout;
    function showToast() {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.classList.add('show');
            clearTimeout(toastTimeout);
            toastTimeout = setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }
    }

    function parseData(text, format) {
        if (format === '1') {
            return parseFormat1(text);
        } else {
            return parseFormat2(text);
        }
    }

    function parseFormat1(text) {
        // Formato 1: Cada cuenta tiene la estructura "Playstation login email: ..."
        // Separamos el bloque completo en chunks usando esa misma cadena como delimitador (lookahead para no perderla)
        const parts = text.split(/(?=Playstation login email:)/i).filter(chunk => chunk.trim() !== '');
        
        return parts.map(part => {
            const lines = part.split('\n').map(l => l.trim());
            const textToSearch = lines.join('\n');
            
            // Extracción con Expresiones Regulares
            const emailMatch = textToSearch.match(/Playstation login email:\s*(.+)/i);
            const psPassMatch = textToSearch.match(/Playstation login password:\s*(.+)/i);
            const mailPassMatch = textToSearch.match(/Mail password:\s*(.+)/i);
            const dobMatch = textToSearch.match(/Date of Birth:\s*(.+)/i);
            const fa2Match = textToSearch.match(/2FA \(Google\):\s*(.+)/i);
            const backupMatch = textToSearch.match(/2FA backup codes:\s*(.+)/i);

            // Manejo de variables faltantes (fallback a '[N/A]')
            const emailValue = emailMatch ? emailMatch[1].trim() : '[N/A]';
            
            return {
                email: emailValue,
                mailPass: mailPassMatch ? mailPassMatch[1].trim() : '[N/A]',
                dob: dobMatch ? dobMatch[1].trim() : '[N/A]',
                empty: '', // Celda vacía requerida
                psEmail: emailValue, // Se repite el email
                psPass: psPassMatch ? psPassMatch[1].trim() : '[N/A]',
                backupCodes: backupMatch ? backupMatch[1].trim() : '[N/A]',
                fa2: fa2Match ? fa2Match[1].trim() : '[N/A]'
            };
        });
    }

    function parseFormat2(text) {
        // Formato 2: Las cuentas suelen venir en bloques separados por múltiples saltos de línea
        let chunks = text.split(/\n\s*\n/).filter(chunk => chunk.trim() !== '');
        
        // Si no hay saltos de línea dobles, intentamos inferir cortes asumiendo que "2fa Google Authenticator" + [código] es el fin
        if (chunks.length === 1 && text.split('\n').length > 18) {
            const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
            const newChunks = [];
            let currentChunk = [];
            for (let i = 0; i < lines.length; i++) {
                currentChunk.push(lines[i]);
                // Si la línea ANTERIOR fue el título del 2FA, esta línea es el código y corta la cuenta
                if (lines[i-1] && lines[i-1].toLowerCase().includes('2fa google authenticator')) {
                    newChunks.push(currentChunk.join('\n'));
                    currentChunk = [];
                }
            }
            if (currentChunk.length > 0) newChunks.push(currentChunk.join('\n'));
            chunks = newChunks;
        }
        
        return chunks.map(chunk => {
            const lines = chunk.split('\n').map(l => l.trim()).filter(l => l !== '');
            
            let id = '[N/A]';
            let email = '[N/A]';
            let psPass = '[N/A]';
            let mailPass = '[N/A]';
            let dob = '[N/A]';
            let backupCodes = [];
            let fa2 = '[N/A]';
            
            // Encontrar índice de PS password para usar como ancla de posiciones relativas
            const psPassIndex = lines.findIndex(l => l.toUpperCase().startsWith('PS:'));
            
            if (psPassIndex !== -1) {
                psPass = lines[psPassIndex].replace(/^PS:\s*/i, '').trim();
                
                if (psPassIndex > 0 && lines[psPassIndex - 1].includes('@')) {
                    email = lines[psPassIndex - 1];
                }
                if (psPassIndex > 1) {
                    id = lines[psPassIndex - 2];
                }
                if (psPassIndex + 1 < lines.length) {
                    mailPass = lines[psPassIndex + 1];
                }
                if (psPassIndex + 2 < lines.length) {
                    dob = lines[psPassIndex + 2];
                    dob = dob.replace(/\./g, '/'); // Transformar XX.XX.XXXX a XX/XX/XXXX
                }
            } else {
                // Fallbacks usando regex si no se encontró el ancla
                const emailLine = lines.find(l => l.includes('@'));
                if (emailLine) email = emailLine;
                
                const dobLine = lines.find(l => /^\d{2}[./]\d{2}[./]\d{4}$/.test(l));
                if (dobLine) dob = dobLine.replace(/\./g, '/');
                
                // Asumir que la primera línea que no es email es ID
                if (lines[0] && !lines[0].includes('@')) id = lines[0];
            }
            
            // Extraer Backup Codes y 2FA
            const backupHeaderIndex = lines.findIndex(l => l.toLowerCase().includes('backup code'));
            const fa2HeaderIndex = lines.findIndex(l => l.toLowerCase().includes('2fa google authenticator'));
            
            if (backupHeaderIndex !== -1) {
                let endIndex = fa2HeaderIndex !== -1 ? fa2HeaderIndex : lines.length;
                for (let i = backupHeaderIndex + 1; i < endIndex; i++) {
                    if (lines[i] && lines[i].trim() !== '') {
                        backupCodes.push(lines[i].trim());
                    }
                }
            }
            
            if (fa2HeaderIndex !== -1 && fa2HeaderIndex + 1 < lines.length) {
                fa2 = lines[fa2HeaderIndex + 1].trim();
            }
            
            return {
                email: email,
                mailPass: mailPass,
                dob: dob,
                id: id,
                psEmail: email, // Repite email
                psPass: psPass,
                backupCodes: backupCodes.length > 0 ? backupCodes.join(',') : '[N/A]',
                fa2: fa2
            };
        });
    }

    function renderTable(data, format) {
        tableHead.innerHTML = '';
        tableBody.innerHTML = '';

        const headers = format === '1' ? headersF1 : headersF2;
        
        headers.forEach(h => {
            const th = document.createElement('th');
            th.innerText = h;
            tableHead.appendChild(th);
        });

        data.forEach(row => {
            const tr = document.createElement('tr');
            
            const values = format === '1' 
                ? [row.email, row.mailPass, row.dob, row.empty, row.psEmail, row.psPass, row.backupCodes, row.fa2]
                : [row.email, row.mailPass, row.dob, row.id, row.psEmail, row.psPass, row.backupCodes, row.fa2];
                
            values.forEach(val => {
                const td = document.createElement('td');
                // Asignar el valor. Si está vacío (celda vacía), mostrará nada, lo cual es correcto
                td.innerText = val === '' ? '' : val;
                tr.appendChild(td);
            });
            
            tableBody.appendChild(tr);
        });
    }

    function generateTSV(data, format) {
        // Generar un string donde cada columna está separada por \t y cada fila por \n
        return data.map(row => {
            let rowValues;
            if (format === '1') {
                rowValues = [row.email, row.mailPass, row.dob, row.empty, row.psEmail, row.psPass, row.backupCodes, row.fa2];
            } else {
                rowValues = [row.email, row.mailPass, row.dob, row.id, row.psEmail, row.psPass, row.backupCodes, row.fa2];
            }
            return rowValues.join('\t');
        }).join('\n');
    }
});
