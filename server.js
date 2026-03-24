const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ===============================
   ASEGURAR CARPETAS
================================ */
const uploadsDir = path.join(__dirname, "uploads");
const dbDir = path.join(__dirname, "db");
const srcDir = path.join(__dirname, "src");
const staticDir = path.join(__dirname, "static");
const templatesDir = path.join(__dirname, "templates");

// Crear carpetas si no existen
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });
if (!fs.existsSync(staticDir)) fs.mkdirSync(staticDir, { recursive: true });
if (!fs.existsSync(templatesDir)) fs.mkdirSync(templatesDir, { recursive: true });

/* ===============================
   ARCHIVOS ESTÁTICOS
================================ */
app.use("/uploads", express.static(uploadsDir));
app.use("/static", express.static(staticDir));
app.use("/src", express.static(srcDir));
app.use("/templates", express.static(templatesDir));

// Servir archivos HTML directamente
app.get("/", (req, res) => {
    res.sendFile(path.join(templatesDir, "index.html"));
});

app.get("/Catalogo.html", (req, res) => {
    res.sendFile(path.join(templatesDir, "Catalogo.html"));
});

app.get("/admin.html", (req, res) => {
    res.sendFile(path.join(templatesDir, "admin", "products.html"));
});

/* ===============================
   SQLITE
================================ */
const dbPath = path.join(dbDir, "edapymes.db");
const db = new sqlite3.Database(dbPath);

// Inicializar base de datos
db.serialize(() => {
    // Crear tabla de categorías
    db.run(`
        CREATE TABLE IF NOT EXISTS categorias(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT UNIQUE NOT NULL
        )
    `, (err) => {
        if (err) console.error("Error creando tabla categorias:", err);
        else console.log("✅ Tabla categorías lista");
    });

    // Crear tabla de productos
    db.run(`
        CREATE TABLE IF NOT EXISTS productos(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            precio REAL NOT NULL,
            categoria TEXT,
            imagen TEXT,
            disponible INTEGER DEFAULT 1
        )
    `, (err) => {
        if (err) console.error("Error creando tabla productos:", err);
        else console.log("✅ Tabla productos lista");
    });

    // Insertar categorías de ejemplo si no existen
    const categoriasEjemplo = ["Laptops", "Computadoras", "Accesorios", "Celulares", "Seguridad", "Redes"];
    categoriasEjemplo.forEach(cat => {
        db.run("INSERT OR IGNORE INTO categorias (nombre) VALUES (?)", [cat]);
    });
});

/* ===============================
   CONFIGURACIÓN DE MULTER
================================ */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
        cb(null, unique);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error("Solo se permiten imágenes"), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

/* ===============================
   API DE PRODUCTOS
================================ */
// Obtener todos los productos
app.get("/api/productos", (req, res) => {
    db.all("SELECT * FROM productos ORDER BY id DESC", (err, rows) => {
        if (err) {
            console.error("Error obteniendo productos:", err);
            return res.status(500).json({ error: err.message });
        }

        const productos = rows.map(p => ({
            ...p,
            imagen: p.imagen ? `http://localhost:3000/uploads/${p.imagen}` : null,
            disponible: p.disponible === 1
        }));

        res.json(productos);
    });
});

// Crear nuevo producto
app.post("/api/productos", upload.single("imagen"), (req, res) => {
    console.log("Recibida petición POST /api/productos");
    console.log("Body:", req.body);
    console.log("File:", req.file);

    const { nombre, precio, categoria } = req.body;

    if (!nombre || !precio) {
        return res.status(400).json({ error: "Nombre y precio son requeridos" });
    }

    const imagen = req.file ? req.file.filename : null;

    db.run(
        `INSERT INTO productos(nombre, precio, categoria, imagen, disponible) 
         VALUES(?, ?, ?, ?, ?)`,
        [nombre, parseFloat(precio), categoria || null, imagen, 1],
        function (err) {
            if (err) {
                console.error("Error insertando producto:", err);
                return res.status(500).json({ error: err.message });
            }
            console.log(`Producto insertado con ID: ${this.lastID}`);
            res.json({
                id: this.lastID,
                message: "Producto creado exitosamente"
            });
        }
    );
});

// Eliminar producto
app.delete("/api/productos/:id", (req, res) => {
    const { id } = req.params;

    // Primero obtener la imagen para eliminarla
    db.get("SELECT imagen FROM productos WHERE id = ?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Eliminar la imagen si existe
        if (row && row.imagen) {
            const imagePath = path.join(uploadsDir, row.imagen);
            fs.unlink(imagePath, (err) => {
                if (err) console.error("Error eliminando imagen:", err);
                else console.log(`Imagen eliminada: ${row.imagen}`);
            });
        }

        // Eliminar el producto
        db.run("DELETE FROM productos WHERE id = ?", [id], function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({
                message: "Producto eliminado exitosamente",
                changes: this.changes
            });
        });
    });
});

/* ===============================
   API DE CATEGORÍAS
================================ */
// Obtener todas las categorías
app.get("/api/categorias", (req, res) => {
    db.all("SELECT * FROM categorias ORDER BY nombre", (err, rows) => {
        if (err) {
            console.error("Error obteniendo categorías:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Crear nueva categoría
app.post("/api/categorias", (req, res) => {
    const { nombre } = req.body;

    if (!nombre || nombre.trim() === "") {
        return res.status(400).json({ error: "Nombre de categoría requerido" });
    }

    db.run(
        "INSERT INTO categorias(nombre) VALUES(?)",
        [nombre.trim()],
        function (err) {
            if (err) {
                console.error("Error insertando categoría:", err);
                if (err.message.includes("UNIQUE")) {
                    return res.status(400).json({ error: "La categoría ya existe" });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({
                id: this.lastID,
                nombre: nombre.trim(),
                message: "Categoría creada exitosamente"
            });
        }
    );
});

// Eliminar categoría
app.delete("/api/categorias/:id", (req, res) => {
    const { id } = req.params;

    db.run("DELETE FROM categorias WHERE id = ?", [id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({
            message: "Categoría eliminada exitosamente",
            changes: this.changes
        });
    });
});

/* ===============================
   ENDPOINT DE PRUEBA
================================ */
app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        uploadsDir: uploadsDir,
        dbPath: dbPath
    });
});

/* ===============================
   MANEJO DE ERRORES GLOBAL
================================ */
app.use((err, req, res, next) => {
    console.error("Error global:", err.stack);
    res.status(500).json({
        error: "Algo salió mal",
        message: err.message
    });
});

/* ===============================
   INICIAR SERVIDOR
================================ */
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📁 Uploads: ${uploadsDir}`);
    console.log(`💾 Base de datos: ${dbPath}`);
    console.log(`📄 Páginas disponibles:`);
    console.log(`   - Catálogo: http://localhost:${PORT}/templates/Catalogo.html`);
    console.log(`   - Admin: http://localhost:${PORT}/templates/admin/admin.html`);
    console.log(`\n✅ Listo para recibir peticiones\n`);
});