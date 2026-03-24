const API = "http://localhost:3000/api";

let currentTab = 'productos';

// Mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'success') {
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };

    const notification = document.createElement('div');
    notification.className = `notification ${colors[tipo]} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2`;
    notification.innerHTML = `
        <span class="material-symbols-outlined">${tipo === 'success' ? 'check_circle' : 'error'}</span>
        <span>${mensaje}</span>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
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

// ==================== PRODUCTOS ====================

// Manejar envío de formulario de productos
document.getElementById("formProducto").addEventListener("submit", async e => {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="loading-spinner w-5 h-5 border-2 border-white border-t-transparent inline-block"></div> Guardando...';
    submitBtn.disabled = true;

    try {
        const form = new FormData(e.target);

        const response = await fetch(`${API}/productos`, {
            method: "POST",
            body: form
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al guardar');
        }

        mostrarNotificacion('✅ Producto agregado exitosamente', 'success');
        e.target.reset();
        await cargarProductos();

        // Resetear el campo de archivo
        const fileInput = e.target.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = '';

    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('❌ Error: ' + error.message, 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
});

// Cargar productos
async function cargarProductos() {
    const tabla = document.getElementById("tabla");
    const totalSpan = document.getElementById("totalProductos");

    try {
        tabla.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center"><div class="loading-spinner mx-auto"></div><p class="mt-2 text-gray-500">Cargando productos...</p></td></tr>`;

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

        productos.forEach((p, index) => {
            const imagenUrl = p.imagen && p.imagen !== 'null' ? p.imagen : 'https://via.placeholder.com/50x50?text=No+Image';

            const row = document.createElement('tr');
            row.className = 'table-row hover:bg-gray-50 transition-colors';
            row.style.animationDelay = `${index * 0.05}s`;
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${p.id}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <img src="${imagenUrl}" class="w-12 h-12 object-cover rounded-lg" 
                         onerror="this.src='https://via.placeholder.com/50x50?text=Error'">
                </td>
                <td class="px-6 py-4 text-sm text-gray-900 font-medium">${escapeHtml(p.nombre)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">C$${parseFloat(p.precio).toFixed(2)}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">${escapeHtml(p.categoria || 'Sin categoría')}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <button onclick="eliminarProducto(${p.id})" 
                            class="text-red-600 hover:text-red-800 transition-colors flex items-center gap-1">
                        <span class="material-symbols-outlined text-sm">delete</span>
                        Eliminar
                    </button>
                </td>
            `;
            tabla.appendChild(row);
        });

    } catch (error) {
        console.error('Error cargando productos:', error);
        tabla.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-red-500">Error al cargar productos: ${error.message}</td></tr>`;
    }
}

// Eliminar producto
async function eliminarProducto(id) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;

    try {
        const response = await fetch(`${API}/productos/${id}`, { method: "DELETE" });

        if (!response.ok) throw new Error('Error al eliminar');

        mostrarNotificacion('✅ Producto eliminado exitosamente', 'success');
        await cargarProductos();

    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('❌ Error al eliminar producto', 'error');
    }
}

// ==================== CATEGORÍAS ====================

// Manejar envío de formulario de categorías
document.getElementById("formCategoria")?.addEventListener("submit", async e => {
    e.preventDefault();

    const nombreInput = document.getElementById("nombreCategoria");
    const nombre = nombreInput.value.trim();

    if (!nombre) {
        mostrarNotificacion('❌ Por favor ingresa un nombre de categoría', 'error');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="loading-spinner w-5 h-5 border-2 border-white border-t-transparent inline-block"></div> Guardando...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API}/categorias`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al guardar');
        }

        mostrarNotificacion('✅ Categoría agregada exitosamente', 'success');
        nombreInput.value = '';
        await cargarCategoriasSelect();
        await cargarCategoriasLista();

    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('❌ Error: ' + error.message, 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
});

// Cargar categorías para el select
async function cargarCategoriasSelect() {
    try {
        const res = await fetch(`${API}/categorias`);
        if (!res.ok) throw new Error('Error al cargar categorías');

        const categorias = await res.json();
        const select = document.getElementById("selectCategoria");

        if (!select) return;

        select.innerHTML = '<option value="">Seleccionar categoría</option>';

        categorias.forEach(c => {
            select.innerHTML += `<option value="${escapeHtml(c.nombre)}">${escapeHtml(c.nombre)}</option>`;
        });

    } catch (error) {
        console.error('Error cargando categorías:', error);
    }
}

// Cargar lista de categorías para el panel
async function cargarCategoriasLista() {
    const container = document.getElementById("listaCategorias");
    const totalSpan = document.getElementById("totalCategorias");

    if (!container) return;

    try {
        container.innerHTML = '<div class="p-8 text-center"><div class="loading-spinner mx-auto"></div><p class="mt-2 text-gray-500">Cargando categorías...</p></div>';

        const res = await fetch(`${API}/categorias`);
        if (!res.ok) throw new Error('Error al cargar categorías');

        const categorias = await res.json();

        if (categorias.length === 0) {
            container.innerHTML = '<div class="p-8 text-center text-gray-500">No hay categorías registradas</div>';
            totalSpan.textContent = '0';
            return;
        }

        totalSpan.textContent = categorias.length;
        container.innerHTML = '';

        categorias.forEach(cat => {
            const catDiv = document.createElement('div');
            catDiv.className = 'p-4 hover:bg-gray-50 transition-all flex justify-between items-center';
            catDiv.innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-purple-600">category</span>
                    <span class="font-medium text-gray-800">${escapeHtml(cat.nombre)}</span>
                </div>
                <button onclick="eliminarCategoria(${cat.id}, '${escapeHtml(cat.nombre)}')" 
                        class="text-red-600 hover:text-red-800 transition-colors px-3 py-1 rounded hover:bg-red-50">
                    <span class="material-symbols-outlined text-sm">delete</span>
                </button>
            `;
            container.appendChild(catDiv);
        });

    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = `<div class="p-8 text-center text-red-500">Error al cargar categorías: ${error.message}</div>`;
    }
}

// Eliminar categoría
async function eliminarCategoria(id, nombre) {
    if (!confirm(`¿Estás seguro de eliminar la categoría "${nombre}"?\nLos productos con esta categoría quedarán sin categoría.`)) return;

    try {
        const response = await fetch(`${API}/categorias/${id}`, { method: "DELETE" });

        if (!response.ok) throw new Error('Error al eliminar');

        mostrarNotificacion(`✅ Categoría "${nombre}" eliminada exitosamente`, 'success');
        await cargarCategoriasSelect();
        await cargarCategoriasLista();

    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('❌ Error al eliminar categoría', 'error');
    }
}

// Función para escapar HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Inicializar
async function init() {
    await cargarCategoriasSelect();
    await cargarProductos();
    await cargarCategoriasLista();
}

// Cargar todo cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
    init();
});

// Exportar funciones globales
window.switchTab = switchTab;
window.eliminarProducto = eliminarProducto;
window.eliminarCategoria = eliminarCategoria;