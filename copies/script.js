document.addEventListener('DOMContentLoaded', () => {
    initCopies();
});

function initCopies() {
    const container = document.getElementById('copies-container');
    const addBtn = document.getElementById('add-copy-btn');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // Modales y sus controles
    const copyModal = document.getElementById('copy-modal');
    const modalTitle = document.getElementById('modal-title');
    const titleInput = document.getElementById('copy-title-input');
    const textInput = document.getElementById('copy-text-input');
    const saveCopyBtn = document.getElementById('save-copy-modal-btn');
    const cancelCopyBtn = document.getElementById('cancel-copy-modal-btn');

    const deleteModal = document.getElementById('delete-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

    // Estado interno
    let copies = loadAndTranslateCopies();
    let editingCopyId = null;
    let copyToDelete = null;
    let toastTimeout = null;

    // Render inicial
    renderAllCopies();

    // Eventos principales
    addBtn.addEventListener('click', () => {
        openCreateModal();
    });

    cancelCopyBtn.addEventListener('click', closeCopyModal);
    saveCopyBtn.addEventListener('click', handleSaveCopy);

    // Cerrar modal al hacer clic en el fondo oscuro
    copyModal.addEventListener('click', (e) => {
        if (e.target === copyModal) {
            closeCopyModal();
        }
    });

    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) {
            closeDeleteModal();
        }
    });

    cancelDeleteBtn.addEventListener('click', closeDeleteModal);

    confirmDeleteBtn.addEventListener('click', () => {
        if (copyToDelete) {
            const { id, cardElement } = copyToDelete;
            closeDeleteModal();

            if (cardElement) {
                cardElement.style.transition = 'all 0.3s ease';
                cardElement.style.opacity = '0';
                cardElement.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    copies = copies.filter(c => c.id !== id);
                    saveCopiesToStorage();
                    renderAllCopies();
                    showToast('Copy eliminado 🗑️');
                }, 300);
            } else {
                copies = copies.filter(c => c.id !== id);
                saveCopiesToStorage();
                renderAllCopies();
                showToast('Copy eliminado 🗑️');
            }

            copyToDelete = null;
        }
    });

    // Atajos de teclado en el formulario
    titleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            textInput.focus();
        }
    });

    textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSaveCopy();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (copyModal.classList.contains('show')) closeCopyModal();
            if (deleteModal.classList.contains('show')) closeDeleteModal();
        }
    });

    /* ========================================================
       TRADUCTOR Y GESTOR DE LOCALSTORAGE
       ======================================================== */
    function loadAndTranslateCopies() {
        const STORAGE_KEY = 'gamerLabCopies';
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];

        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];

            let needsMigration = false;
            const translated = parsed.map((item, index) => {
                // Caso A: Era una simple cadena de texto
                if (typeof item === 'string') {
                    needsMigration = true;
                    return {
                        id: Date.now().toString() + '_' + index,
                        title: '',
                        text: item
                    };
                }

                // Caso B: Objeto
                if (item && typeof item === 'object') {
                    const id = item.id ? String(item.id) : (Date.now().toString() + '_' + index);
                    const text = typeof item.text === 'string' ? item.text : '';
                    const title = typeof item.title === 'string' ? item.title : '';

                    // Si no contenía la propiedad title explícita, marcamos para actualizar
                    if (!('title' in item)) {
                        needsMigration = true;
                    }

                    return { id, title, text };
                }

                return null;
            }).filter(Boolean);

            // Si se detectaron datos en el formato anterior, traducimos y guardamos de una vez
            if (needsMigration) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(translated));
            }

            return translated;
        } catch (error) {
            console.error('Error al traducir los copies de localStorage:', error);
            return [];
        }
    }

    function saveCopiesToStorage() {
        localStorage.setItem('gamerLabCopies', JSON.stringify(copies));
    }

    /* ========================================================
       RENDERIZADO DE LA INTERFAZ
       ======================================================== */
    function renderAllCopies() {
        container.innerHTML = '';

        if (copies.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-copies-state';
            emptyState.innerHTML = `
                <i class='bx bx-copy-alt empty-state-icon'></i>
                <h3>No tienes copys guardados</h3>
                <p>Crea tu primer copy para tenerlo listo y copiarlo con solo un clic.</p>
                <button type="button" class="empty-copies-btn" id="empty-add-btn">
                    <i class='bx bx-plus'></i>
                    <span>Añadir Copy</span>
                </button>
            `;
            container.appendChild(emptyState);

            emptyState.querySelector('#empty-add-btn').addEventListener('click', () => {
                openCreateModal();
            });
            return;
        }

        copies.forEach(copy => {
            const card = createCopyCard(copy);
            container.appendChild(card);
        });
    }

    function createCopyCard(copy) {
        const card = document.createElement('div');
        card.className = 'copy-card-btn';
        card.id = `copy-card-${copy.id}`;
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('title', `Clic para copiar:\n${copy.text}`);

        // Título o placeholder si no tiene
        const hasTitle = copy.title && copy.title.trim().length > 0;
        const displayTitle = hasTitle ? escapeHtml(copy.title.trim()) : '';
        const titleHtml = hasTitle
            ? `<div class="copy-card-title">${displayTitle}</div>`
            : `<div class="copy-card-title is-empty"><i class='bx bx-edit-alt'></i> Sin título (editar)</div>`;

        // Previsualización de texto
        const previewText = copy.text.trim().replace(/\s+/g, ' ');
        const truncatedPreview = previewText.length > 55
            ? previewText.substring(0, 55) + '...'
            : previewText;

        const previewHtml = `<div class="copy-card-preview"><i class='bx bx-text'></i> ${escapeHtml(truncatedPreview)}</div>`;

        card.innerHTML = `
            <div class="copy-card-info">
                ${titleHtml}
                ${previewHtml}
            </div>
            <div class="copy-card-actions">
                <button type="button" class="card-mini-btn edit-btn" title="Editar título o texto" aria-label="Editar">
                    <i class='bx bx-edit-alt'></i>
                </button>
                <button type="button" class="card-mini-btn delete-btn" title="Eliminar copy" aria-label="Eliminar">
                    <i class='bx bx-trash'></i>
                </button>
            </div>
        `;

        // Clic en todo el botón para copiar el texto
        card.addEventListener('click', () => {
            handleCopyAction(copy, card);
        });

        // Soporte de accesibilidad con teclado (Enter o Espacio para copiar)
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCopyAction(copy, card);
            }
        });

        // Botón de Editar (con stopPropagation para no activar el copiado)
        const editBtn = card.querySelector('.edit-btn');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditModal(copy.id);
        });

        // Botón de Eliminar (con stopPropagation para no activar el copiado)
        const deleteBtn = card.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openDeleteModal(copy.id, card);
        });

        return card;
    }

    /* ========================================================
       ACCIÓN DE COPIADO AL PORTAPAPELES
       ======================================================== */
    function handleCopyAction(copy, cardElement) {
        copyToClipboard(copy.text)
            .then(() => {
                // Efecto visual en la tarjeta
                cardElement.classList.add('copied-active');
                setTimeout(() => {
                    cardElement.classList.remove('copied-active');
                }, 500);

                showToast('¡Copiado al portapapeles! 📋');
            })
            .catch((err) => {
                console.error('Error al copiar al portapapeles:', err);
                showToast('Error al copiar el texto ❌');
            });
    }

    function copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        } else {
            return new Promise((resolve, reject) => {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                textArea.style.top = '0';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    const success = document.execCommand('copy');
                    textArea.remove();
                    if (success) resolve();
                    else reject(new Error('execCommand falló'));
                } catch (err) {
                    textArea.remove();
                    reject(err);
                }
            });
        }
    }

    /* ========================================================
       MODAL DE CREAR / EDITAR
       ======================================================== */
    function openCreateModal() {
        editingCopyId = null;
        modalTitle.textContent = 'Añadir Copy';
        titleInput.value = '';
        textInput.value = '';
        copyModal.classList.add('show');
        setTimeout(() => titleInput.focus(), 150);
    }

    function openEditModal(id) {
        const copy = copies.find(c => c.id === id);
        if (!copy) return;

        editingCopyId = id;
        modalTitle.textContent = 'Editar Copy';
        titleInput.value = copy.title || '';
        textInput.value = copy.text || '';
        copyModal.classList.add('show');
        setTimeout(() => titleInput.focus(), 150);
    }

    function closeCopyModal() {
        copyModal.classList.remove('show');
        editingCopyId = null;
        titleInput.value = '';
        textInput.value = '';
    }

    function handleSaveCopy() {
        const title = titleInput.value.trim();
        const text = textInput.value.trim();

        if (!text) {
            textInput.style.borderColor = 'var(--danger)';
            textInput.focus();
            showToast('El texto del copy no puede estar vacío ⚠️');
            setTimeout(() => {
                textInput.style.borderColor = '';
            }, 2000);
            return;
        }

        if (editingCopyId === null) {
            // Crear nuevo copy al principio de la lista
            const newCopy = {
                id: Date.now().toString(),
                title: title,
                text: text
            };
            copies.unshift(newCopy);
            saveCopiesToStorage();
            renderAllCopies();
            showToast('¡Copy añadido con éxito! ✨');
        } else {
            // Editar copy existente
            const copyIndex = copies.findIndex(c => c.id === editingCopyId);
            if (copyIndex !== -1) {
                copies[copyIndex].title = title;
                copies[copyIndex].text = text;
                saveCopiesToStorage();
                renderAllCopies();
                showToast('¡Copy actualizado! ✏️');
            }
        }

        closeCopyModal();
    }

    /* ========================================================
       MODAL DE ELIMINACIÓN
       ======================================================== */
    function openDeleteModal(id, cardElement) {
        copyToDelete = { id, cardElement };
        deleteModal.classList.add('show');
    }

    function closeDeleteModal() {
        deleteModal.classList.remove('show');
        copyToDelete = null;
    }

    /* ========================================================
       TOAST DE NOTIFICACIÓN
       ======================================================== */
    function showToast(message = '¡Copiado al portapapeles! 📋') {
        if (!toast) return;
        toastMessage.textContent = message;
        toast.classList.add('show');
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 2800);
    }

    /* ========================================================
       UTILIDAD: ESCAPAR HTML
       ======================================================== */
    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}
