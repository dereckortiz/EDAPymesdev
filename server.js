const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const session = require("express-session");

const app = express();

// Configuración de sesiones
app.use(session({
    secret: 'edapymes_super_secret_key_2024_secure_crypto',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax'
    }
}));

// Configuración CORS mejorada
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500', 'http://127.0.0.1:5501', 'http://localhost:5501'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

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
const adminDir = path.join(templatesDir, "admin");

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });
if (!fs.existsSync(staticDir)) fs.mkdirSync(staticDir, { recursive: true });
if (!fs.existsSync(templatesDir)) fs.mkdirSync(templatesDir, { recursive: true });
if (!fs.existsSync(adminDir)) fs.mkdirSync(adminDir, { recursive: true });

/* ===============================
   ARCHIVOS ESTÁTICOS
================================ */
app.use("/uploads", express.static(uploadsDir));
app.use("/static", express.static(staticDir));
app.use("/src", express.static(srcDir));
app.use("/templates", express.static(templatesDir));

// Middleware de autenticación para rutas protegidas
function requireAuth(req, res, next) {
    if (req.session && req.session.isAuthenticated) {
        next();
    } else {
        res.redirect('/admin-login.html');
    }
}

// Páginas públicas
app.get("/", (req, res) => {
    res.sendFile(path.join(templatesDir, "index.html"));
});

app.get("/index.html", (req, res) => {
    res.sendFile(path.join(templatesDir, "index.html"));
});

app.get("/Catalogo.html", (req, res) => {
    res.sendFile(path.join(templatesDir, "Catalogo.html"));
});

app.get("/Inicio.html", (req, res) => {
    res.sendFile(path.join(templatesDir, "Inicio.html"));
});

app.get("/Nosotros.html", (req, res) => {
    res.sendFile(path.join(templatesDir, "Nosotros.html"));
});

app.get("/servicios.html", (req, res) => {
    res.sendFile(path.join(templatesDir, "servicios.html"));
});

app.get("/ventanaC.html", (req, res) => {
    res.sendFile(path.join(templatesDir, "ventanaC.html"));
});

// Página de login (pública)
app.get("/admin-login.html", (req, res) => {
    res.sendFile(path.join(adminDir, "login.html"));
});

// Página de admin (protegida)
app.get("/admin.html", requireAuth, (req, res) => {
    res.sendFile(path.join(adminDir, "admin.html"));
});

app.get("/templates/admin/admin.html", requireAuth, (req, res) => {
    res.sendFile(path.join(adminDir, "admin.html"));
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
   SQLITE CON MIGRACIONES Y TABLA DE USUARIOS
================================ */
const dbPath = path.join(dbDir, "edapymes.db");
const db = new sqlite3.Database(dbPath);

function setupUsersTable() {
    db.run(`CREATE TABLE IF NOT EXISTS usuarios(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error("Error creando tabla usuarios:", err);
        } else {
            console.log("Tabla usuarios lista");

            db.get("SELECT * FROM usuarios WHERE username = ?", ["edapymes_devCatalog"], (err, user) => {
                if (err) {
                    console.error("Error verificando usuario:", err);
                    return;
                }

                if (!user) {
                    console.log("Creando usuario administrador...");
                    const password = "EdaPymes$5%12@!7857";

                    bcrypt.hash(password, 12, (err, hash) => {
                        if (err) {
                            console.error("Error encriptando contraseña:", err);
                            return;
                        }

                        db.run("INSERT INTO usuarios (username, password) VALUES (?, ?)",
                            ["edapymes_devCatalog", hash],
                            (err) => {
                                if (err) {
                                    console.error("Error insertando usuario:", err);
                                } else {
                                    console.log("Usuario administrador creado exitosamente");
                                }
                            }
                        );
                    });
                } else {
                    console.log("Usuario administrador ya existe");
                }
            });
        }
    });
}

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
    setupUsersTable();

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
   API DE AUTENTICACIÓN
================================ */
app.post("/api/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Usuario y contraseña requeridos" });
    }

    db.get("SELECT * FROM usuarios WHERE username = ?", [username], (err, user) => {
        if (err) {
            console.error("Error en login:", err);
            return res.status(500).json({ error: "Error en el servidor" });
        }

        if (!user) {
            return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
        }

        bcrypt.compare(password, user.password, (err, result) => {
            if (err) {
                console.error("Error verificando contraseña:", err);
                return res.status(500).json({ error: "Error en el servidor" });
            }

            if (result) {
                req.session.isAuthenticated = true;
                req.session.username = user.username;
                req.session.userId = user.id;

                res.json({
                    success: true,
                    message: "Login exitoso",
                    redirect: "/admin.html"
                });
            } else {
                res.status(401).json({ error: "Usuario o contraseña incorrectos" });
            }
        });
    });
});

app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error en logout:", err);
            return res.status(500).json({ error: "Error al cerrar sesión" });
        }
        res.json({ success: true, message: "Sesión cerrada exitosamente" });
    });
});

app.get("/api/verify", (req, res) => {
    if (req.session && req.session.isAuthenticated) {
        res.json({
            authenticated: true,
            username: req.session.username,
            userId: req.session.userId
        });
    } else {
        res.json({ authenticated: false });
    }
});

app.get("/api/check-session", (req, res) => {
    if (req.session && req.session.isAuthenticated) {
        res.json({
            authenticated: true,
            username: req.session.username
        });
    } else {
        res.json({ authenticated: false });
    }
});

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

app.post("/api/productos", requireAuth, (req, res) => {
    uploadMultiple(req, res, (err) => {
        if (err) {
            console.error("Error en upload:", err);
            return res.status(400).json({ error: err.message });
        }

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
                res.json({
                    id: this.lastID,
                    message: "Producto creado exitosamente",
                    imagenesCount: req.files ? req.files.length : 0
                });
            }
        );
    });
});

app.delete("/api/productos/:id", requireAuth, (req, res) => {
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

app.post("/api/categorias", requireAuth, (req, res) => {
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

app.delete("/api/categorias/:id", requireAuth, (req, res) => {
    db.run("DELETE FROM categorias WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Categoría eliminada", changes: this.changes });
    });
});

/* ===============================
   API DE ENVÍO DE CORREOS CON IMAGEN ADJUNTA
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

    // Buscar el logo en diferentes posibles ubicaciones
    const posiblesLogos = [
        path.join(__dirname, "src", "image", "TU-LOGO.png"),
        path.join(__dirname, "src", "image", "redimension.png"),
        path.join(__dirname, "src", "image", "logo.png"),
        path.join(__dirname, "static", "image", "logo.png"),
        path.join(__dirname, "public", "image", "logo.png")
    ];

    let logoPath = null;
    for (const ruta of posiblesLogos) {
        if (fs.existsSync(ruta)) {
            logoPath = ruta;
            console.log("Logo encontrado en:", ruta);
            break;
        }
    }

    if (!logoPath) {
        console.log("⚠️ No se encontró ningún logo en las rutas verificadas");
    }

    const logoCid = 'edapymes-logo';

    // Función para crear el encabezado con logo adjunto (usando CID)
    const crearHeaderConLogo = () => `
        <div style="background: linear-gradient(135deg, #034AB0 0%, #022B66 100%); padding: 25px 20px; border-radius: 12px 12px 0 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td style="width: 90px; vertical-align: middle;">
                        <img src="cid:${logoCid}" alt="EDAPymes" style="display: block; width: 70px; height: 70px; border-radius: 12px; object-fit: cover; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                    </td>
                    <td style="vertical-align: middle; padding-left: 18px;">
                        <h1 style="margin: 0; color: white; font-size: 26px; font-weight: bold;">EDAPymes</h1>
                        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.95); font-size: 13px; font-weight: 500;">Tecnología con Calidad y Calidez</p>
                    </td>
                </tr>
            </table>
        </div>
    `;

    // Preparar los attachments (solo si existe el logo)
    const attachments = [];
    if (logoPath) {
        attachments.push({
            filename: 'edapymes-logo.png',
            path: logoPath,
            cid: logoCid
        });
    }

    // Correo para el administrador
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
                <style>
                    body { margin: 0; padding: 20px; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f4f4; }
                    .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .content { padding: 30px; }
                    .info-box { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #034AB0; }
                    .footer { text-align: center; padding: 20px; background-color: #f8f9fa; font-size: 11px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    ${crearHeaderConLogo()}
                    <div class="content">
                        <h2 style="color: #034AB0; margin-top: 0;">📬 Nuevo mensaje de contacto</h2>
                        
                        <div style="margin: 20px 0;">
                            <p><strong>📅 Fecha:</strong> ${fecha}</p>
                            <p><strong>👤 Nombre:</strong> ${nombre}</p>
                            <p><strong>📧 Correo:</strong> ${email}</p>
                            <p><strong>🔧 Servicio:</strong> ${servicio || 'No especificado'}</p>
                        </div>
                        
                        <div class="info-box">
                            <p style="margin: 0 0 10px;"><strong>📝 Mensaje:</strong></p>
                            <p style="margin: 0; line-height: 1.6;">${mensaje.replace(/\n/g, '<br>')}</p>
                        </div>
                    </div>
                    <div class="footer">
                        Este mensaje fue enviado desde el formulario de contacto de EDAPymes.
                    </div>
                </div>
            </body>
            </html>
        `,
        attachments: attachments
    };

    // Correo de respuesta para el usuario
    const userMailOptions = {
        from: `"EDAPymes" <derecksevi@gmail.com>`,
        to: email,
        subject: `¡Gracias por contactarnos ${nombre}! - EDAPymes`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { margin: 0; padding: 20px; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f4f4; }
                    .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .content { padding: 30px; }
                    .info-box { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; }
                    .contact-box { background: linear-gradient(135deg, #e8f0fe 0%, #d4e4fc 100%); padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center; }
                    .footer { text-align: center; padding: 20px; background-color: #f8f9fa; font-size: 11px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    ${crearHeaderConLogo()}
                    <div class="content">
                        <h2 style="color: #034AB0;">✨ ¡Hola ${nombre}!</h2>
                        <p style="font-size: 16px; line-height: 1.6;">Gracias por contactarte con <strong>EDAPymes</strong>. Hemos recibido tu mensaje y uno de nuestros asesores te responderá a la brevedad.</p>
                        
                        <div class="info-box">
                            <p style="margin: 0 0 10px;"><strong>📋 Detalle de tu consulta:</strong></p>
                            <p><strong>🔧 Servicio de interés:</strong> ${servicio || 'Consulta general'}</p>
                            <p><strong>📝 Mensaje:</strong></p>
                            <p style="margin: 8px 0 0; color: #555;">${mensaje.replace(/\n/g, '<br>')}</p>
                        </div>
                        
                        <p style="font-size: 16px; line-height: 1.6;">Nos pondremos en contacto contigo en las próximas <strong>24 horas hábiles</strong> para brindarte la atención que mereces.</p>
                        
                        <div class="contact-box">
                            <p style="margin: 0; color: #034AB0; font-weight: bold;">📞 ¿Necesitas ayuda inmediata?</p>
                            <p style="margin: 10px 0 0;">Contáctanos al <strong>+505 8888 8888</strong><br>
                            o escríbenos a <strong>contacto@edapymes.com</strong></p>
                        </div>
                    </div>
                    <div class="footer">
                        Este es un mensaje automático, por favor no responder a este correo.<br>
                        <strong>EDAPymes</strong> - Tecnología con Calidad y Calidez<br>
                        Nicaragua
                    </div>
                </div>
            </body>
            </html>
        `,
        attachments: attachments
    };

    try {
        await transporter.sendMail(adminMailOptions);
        await transporter.sendMail(userMailOptions);
        console.log("✅ Correo enviado exitosamente a:", email);
        res.json({ message: "Correo enviado exitosamente" });
    } catch (error) {
        console.error("Error enviando correo:", error);
        res.status(500).json({ error: "Error al enviar el correo: " + error.message });
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
    console.log(`\n========================================`);
    console.log(`🚀 Servidor iniciado en http://localhost:${PORT}`);
    console.log(`========================================`);
    console.log(`📁 Uploads: ${uploadsDir}`);
    console.log(`🗄️ Base de datos: ${dbPath}`);
    console.log(`\n📄 Páginas disponibles:`);
    console.log(`   - Inicio: http://localhost:${PORT}/`);
    console.log(`   - Catálogo: http://localhost:${PORT}/Catalogo.html`);
    console.log(`   - Admin Login: http://localhost:${PORT}/admin-login.html`);
    console.log(`   - Admin Panel: http://localhost:${PORT}/admin.html (protegido)`);
    console.log(`\n🔐 Credenciales de acceso:`);
    console.log(`   - Usuario: edapymes_devCatalog`);
    console.log(`   - Contraseña: EdaPymes$5%12@!7857`);
    console.log(`\n📧 Correo:`);
    console.log(`   - La imagen se envía como adjunta usando CID`);
    console.log(`   - Busca el logo en: src/image/TU-LOGO.png o src/image/redimension.png`);
    console.log(`\n✨ Sistema de autenticación activo con bcrypt\n`);
});