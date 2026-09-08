document.addEventListener('DOMContentLoaded', () => {
    initCopies();
});

function initCopies() {
    const container = document.getElementById('copies-container');
    const addBtn = document.getElementById('add-copy-btn');
    
    // Cargar copys de localStorage
    let savedCopies = JSON.parse(localStorage.getItem('gamerLabCopies')) || [];

    // Renderizar los copys existentes (se añaden al final para mantener el orden)
    savedCopies.forEach(copy => {
        renderCopyRow(copy.id, copy.text, true, false);
    });

    // Evento para añadir un nuevo input vacío (se añade al principio)
    addBtn.addEventListener('click', () => {
        const id = Date.now().toString();
        renderCopyRow(id, '', false, true);
    });

    let draggedRow = null;

    // Función para renderizar la fila de un copy
    function renderCopyRow(id, text, isSaved, prepend = false) {
        const row = document.createElement('div');
        row.className = 'copy-row';
        row.id = `copy-row-${id}`;
        
        // Hacer la fila arrastrable
        row.draggable = true;
        
        // Iconos Boxicons
        const saveIcon = `<i class='bx bx-check'></i>`;
        const copyIcon = `<i class='bx bx-copy'></i>`;
        const deleteIcon = `<i class='bx bx-trash'></i>`;
        const dragIcon = `<i class='bx bx-grid-vertical'></i>`;

        row.innerHTML = `
            <div class="drag-handle" title="Arrastrar para ordenar">
                ${dragIcon}
            </div>
            <textarea id="textarea-${id}" class="copy-textarea" placeholder="Escribe tu copy aquí..." ${isSaved ? 'readonly' : ''}>${text}</textarea>
            <div class="copy-actions">
                ${!isSaved ? `
                    <button class="icon-btn save-btn" title="Guardar">
                        ${saveIcon}
                    </button>
                ` : `
                    <button class="icon-btn copy-btn" title="Copiar">
                        ${copyIcon}
                    </button>
                `}
                <button class="icon-btn delete-btn" title="Eliminar">
                    ${deleteIcon}
                </button>
            </div>
        `;
        
        // Lógica de Drag and Drop
        row.addEventListener('dragstart', (e) => {
            draggedRow = row;
            setTimeout(() => row.classList.add('dragging'), 0);
            e.dataTransfer.effectAllowed = 'move';
            // Necesario para Firefox
            e.dataTransfer.setData('text/plain', id);
        });

        row.addEventListener('dragend', () => {
            row.classList.remove('dragging');
            draggedRow = null;
            saveOrder(); // Guardar el nuevo orden al soltar
        });

        row.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (row === draggedRow) return;

            const bounding = row.getBoundingClientRect();
            const offset = bounding.y + (bounding.height / 2);
            if (e.clientY - offset > 0) {
                row.classList.add('drag-over-bottom');
                row.classList.remove('drag-over-top');
            } else {
                row.classList.add('drag-over-top');
                row.classList.remove('drag-over-bottom');
            }
        });

        row.addEventListener('dragleave', () => {
            row.classList.remove('drag-over-top');
            row.classList.remove('drag-over-bottom');
        });

        row.addEventListener('drop', (e) => {
            e.preventDefault();
            row.classList.remove('drag-over-top');
            row.classList.remove('drag-over-bottom');
            
            if (row === draggedRow || !draggedRow) return;

            const bounding = row.getBoundingClientRect();
            const offset = bounding.y + (bounding.height / 2);
            if (e.clientY - offset > 0) {
                row.after(draggedRow);
            } else {
                row.before(draggedRow);
            }
        });

        // Agregar al contenedor según el parámetro
        if (prepend) {
            container.prepend(row);
        } else {
            container.appendChild(row);
        }

        const textarea = row.querySelector('.copy-textarea');

        if (!isSaved) {
            // Lógica para botón de Guardar
            const saveBtn = row.querySelector('.save-btn');
            
            // Foco automático en el nuevo textarea
            setTimeout(() => textarea.focus(), 10);

            saveBtn.addEventListener('click', () => {
                const val = textarea.value.trim();
                if (val) {
                    // Actualizamos la fila en su lugar sin tener que crear otra vez los eventos manualmente,
                    // la forma más limpia es reconstruir su interior o re-crearla.
                    const nextSibling = row.nextSibling;
                    row.remove();
                    
                    // Al llamar renderCopyRow(..., false), se inserta al final.
                    renderCopyRow(id, val, true, false);
                    
                    // Ahora la movemos a donde estaba
                    const newRow = document.getElementById(`copy-row-${id}`);
                    if (nextSibling) {
                        container.insertBefore(newRow, nextSibling);
                    }
                    
                    saveOrder();
                }
            });
        } else {
            // Lógica para botón de Copiar
            const copyBtn = row.querySelector('.copy-btn');
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(textarea.value).then(() => {
                    // Mostrar toast en lugar de cambiar el icono
                    showToast();
                });
            });
        }

        // Lógica para botón de Eliminar
        const deleteBtn = row.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
            // Efecto de desaparecer suavemente
            row.style.opacity = '0';
            row.style.transform = 'translateX(20px)';
            setTimeout(() => {
                row.remove();
                saveOrder();
            }, 300);
        });
    }

    // Funciones de LocalStorage y Toast
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

    // Guarda el orden basado en el DOM actual
    function saveOrder() {
        const rows = document.querySelectorAll('.copy-row');
        let newCopies = [];
        rows.forEach(r => {
            const id = r.id.replace('copy-row-', '');
            const textarea = r.querySelector('.copy-textarea');
            // Sólo guardamos los que ya están guardados (tienen readonly)
            if (textarea.readOnly) {
                newCopies.push({ id, text: textarea.value });
            }
        });
        localStorage.setItem('gamerLabCopies', JSON.stringify(newCopies));
    }
}
