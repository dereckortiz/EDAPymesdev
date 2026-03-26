const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");

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
   CONFIGURACIÓN DE NODEMAILER
================================ */
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'derecksevi@gmail.com',
        pass: 'kwuv yclp fytd qtqk'
    }
});

/* ===============================
   SQLITE CON MIGRACIONES
================================ */
const dbPath = path.join(dbDir, "edapymes.db");
const db = new sqlite3.Database(dbPath);

// Función para ejecutar migraciones
function runMigrations() {
    db.all("PRAGMA table_info(categorias)", (err, columns) => {
        if (err) {
            console.error("Error obteniendo columnas de categorias:", err);
            return;
        }
        const columnNames = columns.map(c => c.name);
        if (!columnNames.includes('icono')) {
            console.log("Agregando columna icono a categorias...");
            db.run("ALTER TABLE categorias ADD COLUMN icono TEXT DEFAULT 'category'", (err) => {
                if (err) console.error("Error agregando columna icono:", err);
                else console.log("Columna icono agregada a categorias");
            });
        }
    });

    db.all("PRAGMA table_info(productos)", (err, columns) => {
        if (err) {
            console.error("Error obteniendo columnas de productos:", err);
            return;
        }
        const columnNames = columns.map(c => c.name);

        if (!columnNames.includes('descripcion')) {
            console.log("Agregando columna descripcion a productos...");
            db.run("ALTER TABLE productos ADD COLUMN descripcion TEXT");
        }
        if (!columnNames.includes('especificaciones')) {
            console.log("Agregando columna especificaciones a productos...");
            db.run("ALTER TABLE productos ADD COLUMN especificaciones TEXT");
        }
        if (!columnNames.includes('imagenes')) {
            console.log("Agregando columna imagenes a productos...");
            db.run("ALTER TABLE productos ADD COLUMN imagenes TEXT");
        }
        if (!columnNames.includes('created_at')) {
            console.log("Agregando columna created_at a productos...");
            db.run("ALTER TABLE productos ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP");
        }
    });
}

function insertarCategoriasEjemplo() {
    db.get("SELECT COUNT(*) as count FROM categorias", (err, row) => {
        if (err) {
            console.error("Error verificando categorías existentes:", err);
            return;
        }

        if (row.count === 0) {
            console.log("Insertando categorías de ejemplo...");
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
                db.run("INSERT INTO categorias (nombre, icono) VALUES (?, ?)", [cat.nombre, cat.icono], (err) => {
                    if (err) console.error("Error insertando categoría:", err);
                });
            });
            console.log("Categorías de ejemplo insertadas");
        } else {
            console.log(`Ya existen ${row.count} categorías, no se insertan ejemplos`);
        }
    });
}

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS categorias(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE NOT NULL
    )`, (err) => {
        if (err) console.error("Error creando tabla categorias:", err);
        else console.log("Tabla categorías lista");
    });

    db.run(`CREATE TABLE IF NOT EXISTS productos(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        precio REAL NOT NULL,
        categoria TEXT,
        disponible INTEGER DEFAULT 1
    )`, (err) => {
        if (err) console.error("Error creando tabla productos:", err);
        else console.log("Tabla productos lista");
    });

    setTimeout(() => {
        runMigrations();
        setTimeout(() => {
            insertarCategoriasEjemplo();
        }, 200);
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

        console.log("POST /api/productos");
        console.log("Files recibidos:", req.files ? req.files.length : 0);
        console.log("Body:", req.body);

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
                console.log(`Producto insertado ID: ${this.lastID} con ${req.files ? req.files.length : 0} imágenes`);
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

/* ===============================
   API DE ENVÍO DE CORREOS CON LOGO CORREGIDO
================================ */
app.post("/api/enviar-correo", async (req, res) => {
    const { nombre, email, servicio, mensaje } = req.body;

    if (!nombre || !email || !mensaje) {
        return res.status(400).json({ error: "Todos los campos son requeridos" });
    }

    const fecha = new Date().toLocaleString('es-ES', {
        timeZone: 'America/Managua',
        dateStyle: 'full',
        timeStyle: 'short'
    });

    // CORREGIDO: la ruta correcta es src/image/TU-LOGO.png (sin "s" al final)
    const logoUrl = `http://localhost:3000/src/image/TU-LOGO.png`;

    // Función para crear el encabezado con logo
    const crearHeaderConLogo = () => `
        <div style="background: linear-gradient(135deg, #034AB0 0%, #022B66 100%); padding: 20px; border-radius: 12px 12px 0 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td style="width: 80px; vertical-align: middle;">
                        <img src="${logoUrl}" alt="EDAPymes" style="display: block; width: 60px; height: 60px; border-radius: 12px; object-fit: cover;">
                    </td>
                    <td style="vertical-align: middle; padding-left: 15px;">
                        <h1 style="margin: 0; color: white; font-size: 24px; font-weight: bold;">EDAPymes</h1>
                        <p style="margin: 5px 0 0; color: rgba(255,255,255,0.9); font-size: 12px;">Tecnología con Calidad y Calidez</p>
                    </td>
                </tr>
            </table>
        </div>
    `;

    // Correo que se envía al administrador
    const adminMailOptions = {
        from: `"${nombre}" <${email}>`,
        to: 'derecksevi@gmail.com',
        replyTo: email,
        subject: `Nuevo mensaje de contacto - ${servicio || 'Consulta general'}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 20px; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f4f4;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    ${crearHeaderConLogo()}
                    <div style="padding: 30px;">
                        <h2 style="color: #034AB0; margin-top: 0; font-size: 22px;">Nuevo mensaje de contacto</h2>
                        
                        <div style="margin: 20px 0;">
                            <p style="margin: 8px 0;"><strong style="color: #034AB0;">Fecha:</strong> ${fecha}</p>
                            <p style="margin: 8px 0;"><strong style="color: #034AB0;">Nombre:</strong> ${nombre}</p>
                            <p style="margin: 8px 0;"><strong style="color: #034AB0;">Correo:</strong> ${email}</p>
                            <p style="margin: 8px 0;"><strong style="color: #034AB0;">Servicio:</strong> ${servicio || 'No especificado'}</p>
                        </div>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #034AB0;">
                            <p style="margin: 0 0 10px;"><strong style="color: #034AB0;">Mensaje:</strong></p>
                            <p style="margin: 0; line-height: 1.6; color: #333;">${mensaje.replace(/\n/g, '<br>')}</p>
                        </div>
                        
                        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 25px 0;">
                        <p style="color: #666; font-size: 11px; text-align: center; margin: 0;">
                            Este mensaje fue enviado desde el formulario de contacto de EDAPymes.
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    // Correo de respuesta automática para el usuario
    const userMailOptions = {
        from: `"EDAPymes" <derecksevi@gmail.com>`,
        to: email,
        subject: `Gracias por contactarnos ${nombre} - EDAPymes`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 20px; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f4f4;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    ${crearHeaderConLogo()}
                    <div style="padding: 30px;">
                        <h2 style="color: #034AB0; margin-top: 0;">Hola ${nombre}!</h2>
                        <p style="font-size: 16px; line-height: 1.6;">Gracias por contactarnos. Hemos recibido tu mensaje y uno de nuestros asesores te responderá a la brevedad.</p>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
                            <p style="margin: 0 0 10px;"><strong style="color: #034AB0;">Detalle de tu consulta:</strong></p>
                            <p style="margin: 8px 0;"><strong>Servicio de interés:</strong> ${servicio || 'Consulta general'}</p>
                            <p style="margin: 8px 0;"><strong>Mensaje:</strong></p>
                            <p style="margin: 8px 0 0; color: #555; line-height: 1.6;">${mensaje.replace(/\n/g, '<br>')}</p>
                        </div>
                        
                        <p style="font-size: 16px; line-height: 1.6;">Nos pondremos en contacto contigo en las próximas 24 horas hábiles para brindarte la atención que mereces.</p>
                        
                        <div style="background: linear-gradient(135deg, #e8f0fe 0%, #d4e4fc 100%); padding: 20px; border-radius: 8px; margin: 25px 0;">
                            <p style="margin: 0; color: #034AB0; font-weight: bold; font-size: 14px;">Necesitas ayuda inmediata?</p>
                            <p style="margin: 10px 0 0; font-size: 14px;">Puedes contactarnos al <strong style="color: #034AB0;">+505 8888 8888</strong><br>
                            o escribirnos a <strong style="color: #034AB0;">contacto@edapymes.com</strong></p>
                        </div>
                        
                        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 25px 0;">
                        <p style="color: #666; font-size: 11px; text-align: center; margin: 0;">
                            Este es un mensaje automático, por favor no responder a este correo.<br>
                            <strong>EDAPymes</strong> - Tecnología con Calidad y Calidez<br>
                            Nicaragua
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(adminMailOptions);
        await transporter.sendMail(userMailOptions);
        res.json({ message: "Correo enviado exitosamente" });
    } catch (error) {
        console.error("Error enviando correo:", error);
        res.status(500).json({ error: "Error al enviar el correo" });
    }
});

/* ===============================
   ENDPOINT DE PRUEBA
================================ */
app.get("/api/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString(), uploadsDir, dbPath });
});

/* ===============================
   MANEJO DE ERRORES GLOBAL
================================ */
app.use((err, req, res, next) => {
    console.error("Error global:", err.stack);
    res.status(500).json({ error: "Algo salió mal", message: err.message });
});

/* ===============================
   INICIAR SERVIDOR
================================ */
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`\nServidor iniciado en http://localhost:${PORT}`);
    console.log(`Uploads: ${uploadsDir}`);
    console.log(`Base de datos: ${dbPath}`);
    console.log(`Catálogo: http://localhost:${PORT}/templates/Catalogo.html`);
    console.log(`Admin: http://localhost:${PORT}/templates/admin/products.html`);
    console.log(`Logo disponible en: http://localhost:${PORT}/src/image/TU-LOGO.png`);
    console.log(`\nAsegurate que el archivo "TU-LOGO.png" exista en la carpeta "src/image/"\n`);
}); 