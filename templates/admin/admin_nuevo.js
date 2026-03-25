console.log("🔥 admin.js VERSIÓN ACTUALIZADA - con campo 'imagenes'");

const API = "http://localhost:3000/api";

let currentTab = 'productos';
let imagenesSeleccionadas = [];

// Mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'success') {
    const colors = { success: 'bg-green-500', error: 'bg-red-500', warning: 'bg-yellow-500', info: 'bg-blue-500' };
    const icons = { success: 'check_circle', error: 'error', warning: 'warning', info: 'info' };
    const notification = document.createElement('div');
    notification.className = `notification ${colors[tipo]} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2`;
    notification.innerHTML = `<span class="material-symbols-outlined">${icons[tipo]}</span><span>${mensaje}</span>`;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Cambiar entre tabs
function switchTab(tab) {
    currentTab = tab;
    const panelProductos = document.getElementById('panelProductos');
    const panelCategorias = document.getElementById('panelCategorias');
    const tabProductosBtn = document.getElementById('tabProductosBtn');
    const tabCategoriasBtn = document.getElementById('tabCategoriasBtn');

    if (tab === 'productos') {
        panelProductos.classList.remove('hidden');
        panelCategorias.classList.add('hidden');
        tabProductosBtn.classList.add('text-blue-600', 'border-blue-600');
        tabProductosBtn.classList.remove('text-gray-600');
        tabCategoriasBtn.classList.remove('text-blue-600', 'border-blue-600');
        tabCategoriasBtn.classList.add('text-gray-600');
        cargarProductos();
    } else {
        panelProductos.classList.add('hidden');
        panelCategorias.classList.remove('hidden');
        tabCategoriasBtn.classList.add('text-blue-600', 'border-blue-600');
        tabCategoriasBtn.classList.remove('text-gray-600');
        tabProductosBtn.classList.remove('text-blue-600', 'border-blue-600');
        tabProductosBtn.classList.add('text-gray-600');
        cargarCategoriasLista();
    }
}

// ==================== MANEJO DE MÚLTIPLES IMÁGENES ====================
function actualizarGridImagenes() {
    const grid = document.getElementById('imagenesGrid');
    if (!grid) return;
    grid.innerHTML = '';
    imagenesSeleccionadas.forEach((img, index) => {
        const div = document.createElement('div');
        div.className = `relative aspect-square rounded-lg overflow-hidden border-2 ${img.isMain ? 'border-primary' : 'border-slate-200'} group image-item`;
        div.innerHTML = `
            <img src="${img.preview}" class="w-full h-full object-cover" alt="Imagen ${index + 1}">
            <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                ${!img.isMain ? `<button onclick="hacerPrincipal(${index})" class="px-2 py-1 bg-white text-primary text-[10px] font-bold rounded hover:bg-primary hover:text-white transition-all">Hacer Principal</button>` : '<span class="text-white text-[10px] font-bold bg-primary px-2 py-1 rounded">Principal</span>'}
                <button onclick="eliminarImagen(${index})" class="p-1.5 bg-red-500 hover:bg-red-600 rounded-full text-white transition-all">
                    <span class="material-symbols-outlined text-sm">delete</span>
                </button>
            </div>
            ${img.isMain ? '<div class="absolute top-1 left-1 bg-primary text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">Principal</div>' : ''}
        `;
        grid.appendChild(div);
    });
    const slotsRestantes = 6 - imagenesSeleccionadas.length;
    for (let i = 0; i < slotsRestantes; i++) {
        const slot = document.createElement('div');
        slot.className = 'aspect-square rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center';
        slot.innerHTML = '<span class="material-symbols-outlined text-slate-300">add</span>';
        grid.appendChild(slot);
    }
}

function agregarImagenes(files) {
    const nuevasImagenes = [];
    const esPrimeraImagen = imagenesSeleccionadas.length === 0;
    for (const file of files) {
        if (imagenesSeleccionadas.length + nuevasImagenes.length >= 6) {
            mostrarNotificacion('⚠️ Máximo 6 imágenes por producto', 'warning');
            break;
        }
        if (!file.type.startsWith('image/')) continue;
        if (file.size > 5 * 1024 * 1024) {
            mostrarNotificacion(`⚠️ ${file.name} excede 5MB`, 'warning');
            continue;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            nuevasImagenes.push({
                file: file,
                preview: e.target.result,
                isMain: esPrimeraImagen && nuevasImagenes.length === 0 && imagenesSeleccionadas.length === 0
            });
            if (nuevasImagenes.length === files.length || nuevasImagenes.length === 6 - imagenesSeleccionadas.length) {
                imagenesSeleccionadas.push(...nuevasImagenes);
                actualizarGridImagenes();
            }
        };
        reader.readAsDataURL(file);
    }
}

function hacerPrincipal(index) {
    if (index === 0) return;
    const [imagen] = imagenesSeleccionadas.splice(index, 1);
    imagenesSeleccionadas.unshift(imagen);
    imagenesSeleccionadas.forEach((img, i) => img.isMain = i === 0);
    actualizarGridImagenes();
    mostrarNotificacion('✅ Imagen principal actualizada', 'success');
}

function eliminarImagen(index) {
    imagenesSeleccionadas.splice(index, 1);
    if (imagenesSeleccionadas.length > 0 && !imagenesSeleccionadas[0].isMain) {
        imagenesSeleccionadas[0].isMain = true;
    }
    actualizarGridImagenes();
}

function resetFormProducto() {
    document.getElementById('nombreProducto').value = '';
    document.getElementById('precioProducto').value = '';
    document.getElementById('descripcionProducto').value = '';
    document.getElementById('selectCategoria').value = '';
    document.getElementById('multiImagenes').value = '';
    imagenesSeleccionadas = [];
    actualizarGridImagenes();
    if (typeof window.resetEspecificaciones === 'function') {
        window.resetEspecificaciones();
    }
}

// ==================== PRODUCTOS ====================
document.getElementById("formProducto")?.addEventListener("submit", async e => {
    e.preventDefault();

    const nombre = document.getElementById('nombreProducto')?.value.trim();
    const precio = document.getElementById('precioProducto')?.value;
    const categoria = document.getElementById('selectCategoria')?.value;
    const descripcion = document.getElementById('descripcionProducto')?.value;

    if (!nombre) { mostrarNotificacion('❌ Nombre requerido', 'error'); return; }
    if (!precio) { mostrarNotificacion('❌ Precio requerido', 'error'); return; }
    if (imagenesSeleccionadas.length === 0) { mostrarNotificacion('❌ Al menos una imagen es requerida', 'error'); return; }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="loading-spinner w-5 h-5 border-2 border-white border-t-transparent inline-block"></div> Guardando...';
    submitBtn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('nombre', nombre);
        formData.append('precio', precio);
        formData.append('categoria', categoria || '');
        formData.append('descripcion', descripcion || '');

        if (typeof window.getEspecificacionesJSON === 'function') {
            formData.append('especificaciones', window.getEspecificacionesJSON());
        }

        // IMPORTANTE: Usar 'imagenes' como nombre del campo (coincide con el servidor)
        console.log("📸 Enviando", imagenesSeleccionadas.length, "imágenes con campo 'imagenes'");
        imagenesSeleccionadas.forEach((img, idx) => {
            console.log(`   - Imagen ${idx}: ${img.file.name}`);
            formData.append('imagenes', img.file);
        });

        const response = await fetch(`${API}/productos`, {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al guardar');
        }

        mostrarNotificacion(`✅ Producto agregado con ${imagenesSeleccionadas.length} imágenes`, 'success');
        resetFormProducto();
        await cargarProductos();
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('❌ Error: ' + error.message, 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
});

async function cargarProductos() {
    const tabla = document.getElementById("tabla");
    const totalSpan = document.getElementById("totalProductos");
    try {
        tabla.innerHTML = `较短<td colspan="6" class="px-6 py-8 text-center"><div class="loading-spinner mx-auto"></div><p class="mt-2 text-gray-500">Cargando productos...</p>`;
        const res = await fetch(`${API}/productos`);
        if (!res.ok) throw new Error('Error al cargar productos');
        const productos = await res.json();
        if (productos.length === 0) {
            tabla.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">No hay productos registrados</td></tr>`;
            totalSpan.textContent = '0';
            return;
        }
        totalSpan.textContent = productos.length;
        tabla.innerHTML = "";
        productos.forEach(p => {
            let imagenUrl = 'https://via.placeholder.com/50x50?text=No+Image';
            if (p.imagenes && p.imagenes.length > 0) imagenUrl = p.imagenes[0];
            else if (p.imagen) imagenUrl = p.imagen;
            const row = document.createElement('tr');
            row.className = 'table-row hover:bg-gray-50 transition-colors';
            row.innerHTML = `
                <td class="px-6 py-4 text-sm text-gray-900">${p.id}</td>
                <td class="px-6 py-4"><img src="${imagenUrl}" class="w-12 h-12 object-cover rounded-lg" onerror="this.src='https://via.placeholder.com/50x50?text=Error'"></td>
                <td class="px-6 py-4 text-sm font-medium">${escapeHtml(p.nombre)}</td>
                <td class="px-6 py-4 text-sm">C$${parseFloat(p.precio).toFixed(2)}</td>
                <td class="px-6 py-4"><span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">${escapeHtml(p.categoria || 'Sin categoría')}</span></td>
                <td class="px-6 py-4"><button onclick="eliminarProducto(${p.id})" class="text-red-600 hover:text-red-800 transition-colors flex items-center gap-1"><span class="material-symbols-outlined text-sm">delete</span> Eliminar</button></td>
            `;
            tabla.appendChild(row);
        });
    } catch (error) {
        tabla.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-red-500">Error: ${error.message}</td></tr>`;
    }
}

async function eliminarProducto(id) {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
        await fetch(`${API}/productos/${id}`, { method: "DELETE" });
        mostrarNotificacion('✅ Producto eliminado', 'success');
        await cargarProductos();
    } catch (error) {
        mostrarNotificacion('❌ Error al eliminar', 'error');
    }
}

// ==================== CATEGORÍAS ====================
document.getElementById("formCategoria")?.addEventListener("submit", async e => {
    e.preventDefault();
    const nombre = document.getElementById("nombreCategoria").value.trim();
    const icono = document.getElementById("categoriaIcono")?.value || 'category';
    if (!nombre) { mostrarNotificacion('❌ Nombre requerido', 'error'); return; }
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="loading-spinner w-5 h-5 border-2 border-white border-t-transparent inline-block"></div> Guardando...';
    submitBtn.disabled = true;
    try {
        const response = await fetch(`${API}/categorias`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, icono })
        });
        if (!response.ok) throw new Error('Error');
        mostrarNotificacion('✅ Categoría agregada', 'success');
        document.getElementById("nombreCategoria").value = '';
        await cargarCategoriasSelect();
        await cargarCategoriasLista();
    } catch (error) {
        mostrarNotificacion('❌ Error: ' + error.message, 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
});

async function cargarCategoriasSelect() {
    try {
        const res = await fetch(`${API}/categorias`);
        const categorias = await res.json();
        const select = document.getElementById("selectCategoria");
        if (!select) return;
        select.innerHTML = '<option value="">Seleccionar categoría</option>';
        categorias.forEach(c => select.innerHTML += `<option value="${escapeHtml(c.nombre)}">${escapeHtml(c.nombre)}</option>`);
    } catch (error) { console.error(error); }
}

async function cargarCategoriasLista() {
    const container = document.getElementById("listaCategorias");
    const totalSpan = document.getElementById("totalCategorias");
    if (!container) return;
    try {
        container.innerHTML = '<div class="p-8 text-center"><div class="loading-spinner mx-auto"></div><p class="mt-2 text-gray-500">Cargando categorías...</p></div>';
        const res = await fetch(`${API}/categorias`);
        const categorias = await res.json();
        if (categorias.length === 0) {
            container.innerHTML = '<div class="p-8 text-center text-gray-500">No hay categorías</div>';
            totalSpan.textContent = '0';
            return;
        }
        totalSpan.textContent = categorias.length;
        container.innerHTML = '';
        categorias.forEach(cat => {
            const icono = cat.icono || 'category';
            container.innerHTML += `
                <div class="p-4 hover:bg-gray-50 transition-all flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        <span class="material-symbols-outlined text-primary">${icono}</span>
                        <span class="font-medium text-gray-800">${escapeHtml(cat.nombre)}</span>
                    </div>
                    <button onclick="eliminarCategoria(${cat.id}, '${escapeHtml(cat.nombre)}')" class="text-red-600 hover:text-red-800 px-3 py-1 rounded hover:bg-red-50">
                        <span class="material-symbols-outlined text-sm">delete</span>
                    </button>
                </div>
            `;
        });
    } catch (error) {
        container.innerHTML = `<div class="p-8 text-center text-red-500">Error: ${error.message}</div>`;
    }
}

async function eliminarCategoria(id, nombre) {
    if (!confirm(`¿Eliminar categoría "${nombre}"?`)) return;
    try {
        await fetch(`${API}/categorias/${id}`, { method: "DELETE" });
        mostrarNotificacion(`✅ Categoría eliminada`, 'success');
        await cargarCategoriasSelect();
        await cargarCategoriasLista();
    } catch (error) {
        mostrarNotificacion('❌ Error al eliminar', 'error');
    }
}

function initIconosCategoria() {
    const iconos = document.querySelectorAll('.icono-categoria');
    iconos.forEach(btn => {
        btn.addEventListener('click', function () {
            iconos.forEach(b => b.classList.remove('bg-primary/20', 'border-primary'));
            this.classList.add('bg-primary/20', 'border', 'border-primary');
            const iconoInput = document.getElementById('categoriaIcono');
            if (iconoInput) iconoInput.value = this.getAttribute('data-icon');
        });
    });
}

function initDropzone() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('multiImagenes');
    if (!dropzone) return;
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('border-primary', 'bg-primary/5'); });
    dropzone.addEventListener('dragleave', () => { dropzone.classList.remove('border-primary', 'bg-primary/5'); });
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-primary', 'bg-primary/5');
        agregarImagenes(Array.from(e.dataTransfer.files));
    });
    if (fileInput) {
        fileInput.addEventListener('change', (e) => { agregarImagenes(Array.from(e.target.files)); fileInput.value = ''; });
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function init() {
    await cargarCategoriasSelect();
    await cargarProductos();
    await cargarCategoriasLista();
    initIconosCategoria();
    initDropzone();
    if (typeof window.initEspecificaciones === 'function') window.initEspecificaciones();
}

document.addEventListener("DOMContentLoaded", () => { init(); });

window.switchTab = switchTab;
window.eliminarProducto = eliminarProducto;
window.eliminarCategoria = eliminarCategoria;
window.resetFormProducto = resetFormProducto;
window.hacerPrincipal = hacerPrincipal;
window.eliminarImagen = eliminarImagen;