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
   SQLITE CON MIGRACIONES
================================ */
const dbPath = path.join(dbDir, "edapymes.db");
const db = new sqlite3.Database(dbPath);

function runMigrations() {
    // Verificar columnas de categorías
    db.all("PRAGMA table_info(categorias)", (err, columns) => {
        if (err) {
            console.error("Error obteniendo columnas de categorias:", err);
            return;
        }
        const columnNames = columns.map(c => c.name);
        if (!columnNames.includes('icono')) {
            console.log("📌 Agregando columna icono a categorias...");
            db.run("ALTER TABLE categorias ADD COLUMN icono TEXT DEFAULT 'category'", (err) => {
                if (err) console.error("Error agregando columna icono:", err);
                else console.log("✅ Columna icono agregada a categorias");
            });
        }
    });

    // Verificar columnas de productos
    db.all("PRAGMA table_info(productos)", (err, columns) => {
        if (err) {
            console.error("Error obteniendo columnas de productos:", err);
            return;
        }
        const columnNames = columns.map(c => c.name);

        if (!columnNames.includes('descripcion')) {
            console.log("📌 Agregando columna descripcion a productos...");
            db.run("ALTER TABLE productos ADD COLUMN descripcion TEXT");
        }
        if (!columnNames.includes('especificaciones')) {
            console.log("📌 Agregando columna especificaciones a productos...");
            db.run("ALTER TABLE productos ADD COLUMN especificaciones TEXT");
        }
        if (!columnNames.includes('imagenes')) {
            console.log("📌 Agregando columna imagenes a productos...");
            db.run("ALTER TABLE productos ADD COLUMN imagenes TEXT");
        }
        if (!columnNames.includes('created_at')) {
            console.log("📌 Agregando columna created_at a productos...");
            db.run("ALTER TABLE productos ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP");
        }
    });
}

// Inicializar base de datos
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS categorias(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE NOT NULL
    )`, (err) => {
        if (err) console.error("Error creando tabla categorias:", err);
        else console.log("✅ Tabla categorías lista");
    });

    db.run(`CREATE TABLE IF NOT EXISTS productos(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        precio REAL NOT NULL,
        categoria TEXT,
        disponible INTEGER DEFAULT 1
    )`, (err) => {
        if (err) console.error("Error creando tabla productos:", err);
        else console.log("✅ Tabla productos lista");
    });

    setTimeout(() => {
        runMigrations();
        setTimeout(() => {
            const categoriasEjemplo = [
                { nombre: "Laptops", icono: "laptop" },
                { nombre: "Computadoras", icono: "desktop_windows" },
                { nombre: "Accesorios", icono: "mouse" },
                { nombre: "Celulares", icono: "smartphone" },
                { nombre: "Seguridad", icono: "security" },
                { nombre: "Redes", icono: "router" },
                { nombre: "Cámaras", icono: "camera" },
                { nombre: "Audio", icono: "headphones" }
            ];
            categoriasEjemplo.forEach(cat => {
                db.run("INSERT OR IGNORE INTO categorias (nombre, icono) VALUES (?, ?)", [cat.nombre, cat.icono]);
            });
        }, 500);
    }, 100);
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
        cb(null, true);
    } else {
        cb(new Error("Solo se permiten imágenes"), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

// IMPORTANTE: El nombre del campo debe coincidir con el frontend -> 'imagenes'
const uploadMultiple = upload.array('imagenes', 6);

/* ===============================
   API DE PRODUCTOS
================================ */
app.get("/api/productos", (req, res) => {
    db.all("SELECT * FROM productos ORDER BY id DESC", (err, rows) => {
        if (err) {
            console.error("Error obteniendo productos:", err);
            return res.status(500).json({ error: err.message });
        }

        const productos = rows.map(p => {
            let imagenesArray = [];
            if (p.imagenes) {
                try {
                    imagenesArray = JSON.parse(p.imagenes);
                } catch (e) {
                    imagenesArray = [];
                }
            }
            let especificacionesArray = [];
            if (p.especificaciones) {
                try {
                    especificacionesArray = JSON.parse(p.especificaciones);
                } catch (e) {
                    especificacionesArray = [];
                }
            }
            return {
                id: p.id,
                nombre: p.nombre,
                precio: p.precio,
                categoria: p.categoria,
                descripcion: p.descripcion,
                especificaciones: especificacionesArray,
                imagenes: imagenesArray.map(img => `http://localhost:3000/uploads/${img.filename}`),
                imagenes_raw: imagenesArray,
                disponible: p.disponible === 1,
                created_at: p.created_at
            };
        });
        res.json(productos);
    });
});

app.post("/api/productos", (req, res) => {
    uploadMultiple(req, res, (err) => {
        if (err) {
            console.error("Error en upload:", err);
            return res.status(400).json({ error: err.message });
        }

        console.log("📦 POST /api/productos");
        console.log("   Files recibidos:", req.files ? req.files.length : 0);
        console.log("   Body:", req.body);

        const { nombre, precio, categoria, descripcion, especificaciones } = req.body;

        if (!nombre || !precio) {
            return res.status(400).json({ error: "Nombre y precio son requeridos" });
        }

        let imagenesData = [];
        if (req.files && req.files.length > 0) {
            imagenesData = req.files.map((file, index) => ({
                filename: file.filename,
                originalName: file.originalname,
                isMain: index === 0,
                order: index
            }));
        }

        const imagenesJSON = JSON.stringify(imagenesData);

        let especificacionesJSON = null;
        if (especificaciones && especificaciones !== '[]' && especificaciones !== 'null') {
            try {
                const parsed = JSON.parse(especificaciones);
                especificacionesJSON = JSON.stringify(parsed.filter(s => s.label && s.value));
            } catch (e) {
                especificacionesJSON = especificaciones;
            }
        }

        db.run(
            `INSERT INTO productos(nombre, precio, categoria, descripcion, especificaciones, imagenes, disponible, created_at) 
             VALUES(?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            [nombre, parseFloat(precio), categoria || null, descripcion || null, especificacionesJSON, imagenesJSON, 1],
            function (err) {
                if (err) {
                    console.error("Error insertando producto:", err);
                    return res.status(500).json({ error: err.message });
                }
                console.log(`✅ Producto insertado ID: ${this.lastID} con ${req.files ? req.files.length : 0} imágenes`);
                res.json({
                    id: this.lastID,
                    message: "Producto creado exitosamente",
                    imagenesCount: req.files ? req.files.length : 0
                });
            }
        );
    });
});

app.delete("/api/productos/:id", (req, res) => {
    const { id } = req.params;
    db.get("SELECT imagenes FROM productos WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row && row.imagenes) {
            try {
                const imagenes = JSON.parse(row.imagenes);
                imagenes.forEach(img => {
                    const imagePath = path.join(uploadsDir, img.filename);
                    fs.unlink(imagePath, (err) => {
                        if (err) console.error("Error eliminando imagen:", img.filename);
                    });
                });
            } catch (e) { }
        }
        db.run("DELETE FROM productos WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Producto eliminado", changes: this.changes });
        });
    });
});

/* ===============================
   API DE CATEGORÍAS
================================ */
app.get("/api/categorias", (req, res) => {
    db.all("SELECT * FROM categorias ORDER BY nombre", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post("/api/categorias", (req, res) => {
    const { nombre, icono } = req.body;
    if (!nombre || nombre.trim() === "") {
        return res.status(400).json({ error: "Nombre de categoría requerido" });
    }
    const iconoFinal = icono || "category";
    db.run("INSERT INTO categorias(nombre, icono) VALUES(?, ?)", [nombre.trim(), iconoFinal], function (err) {
        if (err) {
            if (err.message.includes("UNIQUE")) {
                return res.status(400).json({ error: "La categoría ya existe" });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, nombre: nombre.trim(), icono: iconoFinal, message: "Categoría creada" });
    });
});

app.delete("/api/categorias/:id", (req, res) => {
    db.run("DELETE FROM categorias WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Categoría eliminada", changes: this.changes });
    });
});

app.get("/api/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString(), uploadsDir, dbPath });
});

app.use((err, req, res, next) => {
    console.error("Error global:", err.stack);
    res.status(500).json({ error: "Algo salió mal", message: err.message });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Servidor en http://localhost:${PORT}`);
    console.log(`📁 Uploads: ${uploadsDir}`);
    console.log(`💾 DB: ${dbPath}`);
    console.log(`📄 Catálogo: http://localhost:${PORT}/templates/Catalogo.html`);
    console.log(`📄 Admin: http://localhost:${PORT}/templates/admin/products.html\n`);
});