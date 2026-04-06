const express = require("express");
const { Pool } = require("pg");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const session = require("express-session");
const pgSession = require('connect-pg-simple')(session);

const app = express();

/* ===============================
   POSTGRESQL - CONEXION (PRIMERO)
================================ */
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.connect((err) => {
    if (err) {
        console.error('❌ Error conectando a PostgreSQL:', err.message);
    } else {
        console.log('✅ Conectado a PostgreSQL');
    }
});

/* ===============================
   CONFIGURACION DE SESIONES CON POSTGRESQL
================================ */
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'session',
        createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'edapymes_super_secret_key_2024_secure_crypto',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax'
    }
}));

/* ===============================
   CONFIGURACION CORS
================================ */
const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL || 'https://edapymesdev.onrender.com']
    : ['https://edapymesdev.onrender.com', 'http://127.0.0.1:5500', 'http://localhost:5500'];

app.use(cors({
    origin: allowedOrigins,
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
const srcDir = path.join(__dirname, "src");
const staticDir = path.join(__dirname, "static");
const templatesDir = path.join(__dirname, "templates");
const adminDir = path.join(templatesDir, "admin");

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });
if (!fs.existsSync(staticDir)) fs.mkdirSync(staticDir, { recursive: true });
if (!fs.existsSync(templatesDir)) fs.mkdirSync(templatesDir, { recursive: true });
if (!fs.existsSync(adminDir)) fs.mkdirSync(adminDir, { recursive: true });

/* ===============================
   ARCHIVOS ESTATICOS
================================ */
app.use("/uploads", express.static(uploadsDir));
app.use("/static", express.static(staticDir));
app.use("/src", express.static(srcDir));
app.use("/templates", express.static(templatesDir));

/* ===============================
   MIDDLEWARE DE AUTENTICACION
================================ */
function requireAuth(req, res, next) {
    if (req.session && req.session.isAuthenticated) {
        next();
    } else {
        res.redirect('/admin-login.html');
    }
}

/* ===============================
   PAGINAS PUBLICAS
================================ */
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

app.get("/admin-login.html", (req, res) => {
    res.sendFile(path.join(adminDir, "login.html"));
});

app.get("/admin.html", requireAuth, (req, res) => {
    res.sendFile(path.join(adminDir, "admin.html"));
});

app.get("/templates/admin/admin.html", requireAuth, (req, res) => {
    res.sendFile(path.join(adminDir, "admin.html"));
});

/* ===============================
   CONFIGURACION DE NODEMAILER
================================ */
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'derecksevi@gmail.com',
        pass: process.env.EMAIL_PASS || 'kwuv yclp fytd qtqk'
    }
});

/* ===============================
   CONFIGURACION DE MULTER
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
        cb(new Error("Solo se permiten imagenes"), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

const uploadMultiple = upload.array('imagenes', 6);

/* ===============================
   API DE AUTENTICACION
================================ */
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Usuario y contrasena requeridos" });
    }

    try {
        const result = await pool.query("SELECT * FROM usuarios WHERE username = $1", [username]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Usuario o contrasena incorrectos" });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: "Usuario o contrasena incorrectos" });
        }

        req.session.isAuthenticated = true;
        req.session.username = user.username;
        req.session.userId = user.id;

        res.json({
            success: true,
            message: "Login exitoso",
            redirect: "/admin.html"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: "Error al cerrar sesion" });
        }
        res.json({ success: true, message: "Sesion cerrada exitosamente" });
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
app.get("/api/productos", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM productos ORDER BY id DESC");
        const baseUrl = process.env.BASE_URL || `https://edapymesdev.onrender.com`;

        const productos = result.rows.map(p => {
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
                imagenes: imagenesArray.map(img => `${baseUrl}/uploads/${img.filename}`),
                imagenes_raw: imagenesArray,
                disponible: p.disponible === 1,
                created_at: p.created_at
            };
        });
        res.json(productos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/productos", requireAuth, (req, res) => {
    uploadMultiple(req, res, async (err) => {
        if (err) {
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

        try {
            const result = await pool.query(
                `INSERT INTO productos(nombre, precio, categoria, descripcion, especificaciones, imagenes, disponible, created_at) 
                 VALUES($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING id`,
                [nombre, parseFloat(precio), categoria || null, descripcion || null, especificacionesJSON, imagenesJSON, 1]
            );

            res.json({
                id: result.rows[0].id,
                message: "Producto creado exitosamente",
                imagenesCount: req.files ? req.files.length : 0
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
});

app.delete("/api/productos/:id", requireAuth, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query("SELECT imagenes FROM productos WHERE id = $1", [id]);

        if (result.rows.length > 0 && result.rows[0].imagenes) {
            try {
                const imagenes = JSON.parse(result.rows[0].imagenes);
                imagenes.forEach(img => {
                    const imagePath = path.join(uploadsDir, img.filename);
                    fs.unlink(imagePath, (err) => { });
                });
            } catch (e) { }
        }

        await pool.query("DELETE FROM productos WHERE id = $1", [id]);
        res.json({ message: "Producto eliminado", changes: 1 });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/* ===============================
   API DE CATEGORIAS
================================ */
app.get("/api/categorias", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM categorias ORDER BY nombre");
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/categorias", requireAuth, async (req, res) => {
    const { nombre, icono } = req.body;
    if (!nombre || nombre.trim() === "") {
        return res.status(400).json({ error: "Nombre de categoria requerido" });
    }
    const iconoFinal = icono || "category";

    try {
        const result = await pool.query(
            "INSERT INTO categorias(nombre, icono) VALUES($1, $2) ON CONFLICT (nombre) DO NOTHING RETURNING id",
            [nombre.trim(), iconoFinal]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: "La categoria ya existe" });
        }

        res.json({ id: result.rows[0].id, nombre: nombre.trim(), icono: iconoFinal, message: "Categoria creada" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete("/api/categorias/:id", requireAuth, async (req, res) => {
    try {
        const result = await pool.query("DELETE FROM categorias WHERE id = $1", [req.params.id]);
        res.json({ message: "Categoria eliminada", changes: result.rowCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/* ===============================
   API DE ENVIO DE CORREOS
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
            break;
        }
    }

    const logoCid = 'edapymes-logo';

    const crearHeaderConLogo = () => `
        <div style="background: linear-gradient(135deg, #034AB0 0%, #022B66 100%); padding: 25px 20px; border-radius: 12px 12px 0 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td style="width: 90px; vertical-align: middle;">
                        <img src="cid:${logoCid}" alt="EDAPymes" style="display: block; width: 70px; height: 70px; border-radius: 12px; object-fit: cover; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                    </td>
                    <td style="vertical-align: middle; padding-left: 18px;">
                        <h1 style="margin: 0; color: white; font-size: 26px; font-weight: bold;">EDAPymes</h1>
                        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.95); font-size: 13px; font-weight: 500;">Tecnologia con Calidad y Calidez</p>
                    </td>
                </tr>
            </tr>
        </div>
    `;

    const attachments = [];
    if (logoPath) {
        attachments.push({
            filename: 'edapymes-logo.png',
            path: logoPath,
            cid: logoCid
        });
    }

    const adminMailOptions = {
        from: `"${nombre}" <${email}>`,
        to: 'derecksevi@gmail.com',
        replyTo: email,
        subject: `Nuevo mensaje de contacto - ${servicio || 'Consulta general'}`,
        html: `<!DOCTYPE html>
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
                        <h2 style="color: #034AB0; margin-top: 0;">Nuevo mensaje de contacto</h2>
                        <div style="margin: 20px 0;">
                            <p><strong>Fecha:</strong> ${fecha}</p>
                            <p><strong>Nombre:</strong> ${nombre}</p>
                            <p><strong>Correo:</strong> ${email}</p>
                            <p><strong>Servicio:</strong> ${servicio || 'No especificado'}</p>
                        </div>
                        <div class="info-box">
                            <p style="margin: 0 0 10px;"><strong>Mensaje:</strong></p>
                            <p style="margin: 0; line-height: 1.6;">${mensaje.replace(/\n/g, '<br>')}</p>
                        </div>
                    </div>
                    <div class="footer">
                        Este mensaje fue enviado desde el formulario de contacto de EDAPymes.
                    </div>
                </div>
            </body>
            </html>`,
        attachments: attachments
    };

    const userMailOptions = {
        from: `"EDAPymes" <derecksevi@gmail.com>`,
        to: email,
        subject: `Gracias por contactarnos ${nombre}! - EDAPymes`,
        html: `<!DOCTYPE html>
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
                        <h2 style="color: #034AB0;">Hola ${nombre}!</h2>
                        <p style="font-size: 16px; line-height: 1.6;">Gracias por contactarte con EDAPymes. Hemos recibido tu mensaje y uno de nuestros asesores te respondera a la brevedad.</p>
                        <div class="info-box">
                            <p style="margin: 0 0 10px;"><strong>Detalle de tu consulta:</strong></p>
                            <p><strong>Servicio de interes:</strong> ${servicio || 'Consulta general'}</p>
                            <p><strong>Mensaje:</strong></p>
                            <p style="margin: 8px 0 0; color: #555;">${mensaje.replace(/\n/g, '<br>')}</p>
                        </div>
                        <p style="font-size: 16px; line-height: 1.6;">Nos pondremos en contacto contigo en las proximas 24 horas habiles para brindarte la atencion que mereces.</p>
                        <div class="contact-box">
                            <p style="margin: 0; color: #034AB0; font-weight: bold;">Necesitas ayuda inmediata?</p>
                            <p style="margin: 10px 0 0;">Contactanos al +505 8329 5424<br>
                            o escribenos a evelingespinoza@gmail.com</p>
                        </div>
                    </div>
                    <div class="footer">
                        Este es un mensaje automatico, por favor no responder a este correo.<br>
                        EDAPymes - Tecnologia con Calidad y Calidez<br>
                        Nicaragua
                    </div>
                </div>
            </body>
            </html>`,
        attachments: attachments
    };

    try {
        await transporter.sendMail(adminMailOptions);
        await transporter.sendMail(userMailOptions);
        res.json({ message: "Correo enviado exitosamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al enviar el correo: " + error.message });
    }
});

/* ===============================
   ENDPOINT DE PRUEBA
================================ */
app.get("/api/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
});

/* ===============================
   MANEJO DE ERRORES GLOBAL
================================ */
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: "Error interno del servidor" });
});

/* ===============================
   INICIAR SERVIDOR
================================ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📁 Directorio de uploads: ${uploadsDir}`);
    console.log(`💾 Base de datos: PostgreSQL`);
});