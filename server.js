const express = require("express");
const { Pool } = require("pg");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const session = require("express-session");
const pgSession = require('connect-pg-simple')(session);
const ImageKit = require('imagekit');
const brevo = require('@getbrevo/brevo');

const app = express();

/* ===============================
   POSTGRESQL - CONEXION
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
   CONFIGURACION DE IMAGEKIT
================================ */
const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

console.log('✅ ImageKit configurado');

/* ===============================
   CONFIGURACION DE BREVO - VERSIÓN 1.0.1 CORRECTA
================================ */
const brevoApiKey = process.env.BREVO_API_KEY;
const emailUser = process.env.EMAIL_USER || 'edapymestech@gmail.com';

let brevoClient = null;
if (brevoApiKey) {
    brevoClient = new brevo.TransactionalEmailsApi();
    brevoClient.setApiKey('api-key', brevoApiKey);
    console.log('✅ Brevo configurado correctamente');
    console.log(`📧 Los correos se enviarán desde: ${emailUser}`);
} else {
    console.log('❌ BREVO_API_KEY no configurada en variables de entorno');
    console.log('⚠️ Los correos NO funcionarán hasta que la configures');
}

/* ===============================
   MIDDLEWARE ESENCIALES
================================ */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);

/* ===============================
   CONFIGURACION CORS
================================ */
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        const allowedOrigins = [
            'https://edapymesdev.onrender.com',
            'https://edapymes.onrender.com',
            'http://localhost:5500',
            'http://127.0.0.1:5500',
            'http://localhost:3000'
        ];
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('Origen bloqueado por CORS:', origin);
            callback(new Error('No permitido por CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('Body:', req.body);
    }
    next();
});

/* ===============================
   CONFIGURACION DE SESIONES
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
        secure: true,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax'
    }
}));

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
   FUNCIONES AUXILIARES
================================ */
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/* ===============================
   CONFIGURACION DE MULTER
================================ */
const storage = multer.memoryStorage();

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
    console.log("=== LOGIN REQUEST RECIBIDO ===");
    console.log("Body completo:", req.body);

    const { username, password } = req.body;

    if (!username || !password) {
        console.log("ERROR: Faltan credenciales");
        return res.status(400).json({ error: "Usuario y contrasena requeridos" });
    }

    console.log(`Intentando login para usuario: ${username}`);

    try {
        const result = await pool.query("SELECT * FROM usuarios WHERE username = $1", [username]);
        console.log(`Usuario encontrado: ${result.rows.length > 0}`);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Usuario o contrasena incorrectos" });
        }

        const user = result.rows[0];
        console.log("Verificando contraseña...");

        const validPassword = await bcrypt.compare(password, user.password);
        console.log(`Contraseña válida: ${validPassword}`);

        if (!validPassword) {
            return res.status(401).json({ error: "Usuario o contrasena incorrectos" });
        }

        req.session.isAuthenticated = true;
        req.session.username = user.username;
        req.session.userId = user.id;

        req.session.save((err) => {
            if (err) {
                console.error("Error guardando sesión:", err);
                return res.status(500).json({ error: "Error al guardar sesión" });
            }

            console.log("✅ Login exitoso - Sesión guardada");
            res.json({
                success: true,
                message: "Login exitoso",
                redirect: "/admin.html"
            });
        });

    } catch (error) {
        console.error("ERROR en login:", error);
        res.status(500).json({ error: "Error en el servidor: " + error.message });
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
    console.log('Verificando sesión - SessionID:', req.sessionID);
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

app.get("/api/diagnostico-usuario", async (req, res) => {
    try {
        const username = 'edapymes_devCatalog';
        const password = 'EdaPymesdev1472';
        const result = await pool.query("SELECT * FROM usuarios WHERE username = $1", [username]);
        if (result.rows.length === 0) {
            return res.json({ error: "Usuario no encontrado" });
        }
        const user = result.rows[0];
        const isValid = await bcrypt.compare(password, user.password);
        res.json({
            usuario_existe: true,
            username: user.username,
            password_valida: isValid,
            mensaje: isValid ? "✅ Login funcionaría" : "❌ La contraseña no coincide"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/debug-session", (req, res) => {
    res.json({
        sessionID: req.sessionID,
        isAuthenticated: req.session?.isAuthenticated || false,
        sessionData: req.session ? {
            username: req.session.username,
            userId: req.session.userId
        } : null
    });
});

/* ===============================
   API DE PRODUCTOS CON IMAGEKIT
================================ */
app.get("/api/productos", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM productos ORDER BY id DESC");
        const productos = result.rows.map(p => {
            let imagenesUrls = [];
            if (p.imagenes) {
                try {
                    const imagenesArray = JSON.parse(p.imagenes);
                    imagenesUrls = imagenesArray.map(img => img.url);
                } catch (e) {
                    console.error('Error parseando imagenes:', e);
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
                imagenes: imagenesUrls,
                disponible: p.disponible === 1,
                created_at: p.created_at
            };
        });
        res.json(productos);
    } catch (error) {
        console.error('Error en /api/productos:', error);
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
        try {
            let imagenesData = [];
            if (req.files && req.files.length > 0) {
                for (let i = 0; i < req.files.length; i++) {
                    const file = req.files[i];
                    const base64 = file.buffer.toString('base64');
                    console.log(`Subiendo imagen ${i + 1} a ImageKit...`);
                    const result = await imagekit.upload({
                        file: base64,
                        fileName: `${Date.now()}-${file.originalname}`,
                        folder: '/edapymes/productos',
                        useUniqueFileName: true,
                        tags: ['producto', categoria || 'general']
                    });
                    imagenesData.push({
                        url: result.url,
                        fileId: result.fileId,
                        originalName: file.originalname,
                        isMain: i === 0,
                        order: i
                    });
                    console.log(`✅ Imagen ${i + 1} subida: ${result.url}`);
                }
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
            console.error('Error al subir a ImageKit:', error);
            res.status(500).json({ error: "Error al subir imágenes: " + error.message });
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
                for (const img of imagenes) {
                    if (img.fileId) {
                        await imagekit.deleteFile(img.fileId);
                        console.log(`✅ Imagen eliminada de ImageKit: ${img.fileId}`);
                    }
                }
            } catch (e) {
                console.error('Error eliminando de ImageKit:', e);
            }
        }
        await pool.query("DELETE FROM productos WHERE id = $1", [id]);
        res.json({ message: "Producto eliminado", changes: 1 });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
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
   FUNCION PARA CREAR HEADER CON LOGO
================================ */
function crearHeaderConLogo() {
    return `
        <div style="background: linear-gradient(135deg, #034AB0 0%, #022B66 100%); padding: 25px 20px; border-radius: 12px 12px 0 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td style="width: 90px; vertical-align: middle;">
                        <img src="cid:edapymes-logo" alt="EDAPymes" style="display: block; width: 70px; height: 70px; border-radius: 12px; object-fit: cover; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                    </td>
                    <td style="vertical-align: middle; padding-left: 18px;">
                        <h1 style="margin: 0; color: white; font-size: 26px; font-weight: bold;">EDAPymes</h1>
                        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.95); font-size: 13px; font-weight: 500;">Tecnologia con Calidad y Calidez</p>
                    </td>
                </tr>
            </table>
        </div>
    `;
}

/* ===============================
   API DE ENVIO DE CORREOS CON BREVO - VERSIÓN 1.0.1
================================ */
app.post("/api/enviar-correo", async (req, res) => {
    const { nombre, email, servicio, mensaje } = req.body;

    console.log('📨 Recibida solicitud de correo:', { nombre, email, servicio });

    if (!nombre || !email || !mensaje) {
        console.log('❌ Faltan campos requeridos');
        return res.status(400).json({ error: "Todos los campos son requeridos" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        console.log('❌ Email inválido:', email);
        return res.status(400).json({ error: "Correo electrónico inválido" });
    }

    if (!brevoClient) {
        console.log('❌ Brevo no configurado');
        return res.status(500).json({ error: "Servicio de correo no configurado" });
    }

    const fecha = new Date().toLocaleString('es-ES', {
        timeZone: 'America/Managua',
        dateStyle: 'full',
        timeStyle: 'short'
    });

    // Buscar logo
    const posiblesLogos = [
        path.join(__dirname, "src", "image", "TU-LOGO.png"),
        path.join(__dirname, "src", "image", "redimension.png"),
        path.join(__dirname, "src", "image", "logo.png"),
        path.join(__dirname, "static", "image", "logo.png"),
        path.join(__dirname, "public", "image", "logo.png")
    ];

    let logoBase64 = null;
    for (const ruta of posiblesLogos) {
        if (fs.existsSync(ruta)) {
            logoBase64 = fs.readFileSync(ruta, { encoding: 'base64' });
            break;
        }
    }

    // Correo para el administrador
    const adminEmailContent = `
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
                    <h2 style="color: #034AB0; margin-top: 0;">Nuevo mensaje de contacto</h2>
                    
                    <div style="margin: 20px 0;">
                        <p><strong>📅 Fecha:</strong> ${escapeHtml(fecha)}</p>
                        <p><strong>👤 Nombre:</strong> ${escapeHtml(nombre)}</p>
                        <p><strong>📧 Correo:</strong> ${escapeHtml(email)}</p>
                        <p><strong>🔧 Servicio:</strong> ${escapeHtml(servicio || 'No especificado')}</p>
                    </div>
                    
                    <div class="info-box">
                        <p style="margin: 0 0 10px;"><strong>💬 Mensaje:</strong></p>
                        <p style="margin: 0; line-height: 1.6;">${escapeHtml(mensaje).replace(/\n/g, '<br>')}</p>
                    </div>
                </div>
                <div class="footer">
                    Este mensaje fue enviado desde el formulario de contacto de EDAPymes.
                </div>
            </div>
        </body>
        </html>
    `;

    // Correo de confirmación para el usuario
    const userEmailContent = `
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
                    <h2 style="color: #034AB0;">✨ ¡Hola ${escapeHtml(nombre)}!</h2>
                    <p style="font-size: 16px; line-height: 1.6;">Gracias por contactarte con <strong>EDAPymes</strong>. Hemos recibido tu mensaje exitosamente.</p>
                    
                    <div class="info-box">
                        <p style="margin: 0 0 10px;"><strong>📝 Detalle de tu consulta:</strong></p>
                        <p><strong>🔧 Servicio de interés:</strong> ${escapeHtml(servicio || 'Consulta general')}</p>
                        <p><strong>💬 Mensaje:</strong></p>
                        <p style="margin: 8px 0 0; color: #555;">${escapeHtml(mensaje)}</p>
                    </div>
                    
                    <p style="font-size: 16px; line-height: 1.6;">Nos pondremos en contacto contigo en las próximas 24 horas hábiles para brindarte la atención que mereces.</p>
                    
                    <div class="contact-box">
                        <p style="margin: 0; color: #034AB0; font-weight: bold;">📱 ¿Necesitas ayuda inmediata?</p>
                        <p style="margin: 10px 0 0;">Contáctanos al <strong>+505 8329 5424</strong><br>
                        o escríbenos a <strong>edapymestech@gmail.com</strong></p>
                    </div>
                </div>
                <div class="footer">
                    Este es un mensaje automático, por favor no responder a este correo.<br>
                    EDAPymes - Tecnología con Calidad y Calidez<br>
                    Nicaragua
                </div>
            </div>
        </body>
        </html>
    `;

    // ✅ CORRECTO para versión 1.0.1 (usando clases, no objetos)
    const adminEmail = new brevo.SendSmtpEmail();
    adminEmail.to = [{ email: emailUser, name: 'Administrador EDAPymes' }];
    adminEmail.sender = { email: emailUser, name: 'EDAPymes Contacto' };
    adminEmail.replyTo = { email: email, name: nombre };
    adminEmail.subject = `📧 Nuevo mensaje de contacto - ${servicio || 'Consulta general'}`;
    adminEmail.htmlContent = adminEmailContent;

    const userEmail = new brevo.SendSmtpEmail();
    userEmail.to = [{ email: email, name: nombre }];
    userEmail.sender = { email: emailUser, name: 'EDAPymes' };
    userEmail.subject = `✅ Gracias por contactarnos ${nombre} - EDAPymes`;
    userEmail.htmlContent = userEmailContent;

    // Agregar logo como adjunto si existe
    if (logoBase64) {
        const attachment = {
            content: logoBase64,
            name: 'edapymes-logo.png'
        };
        adminEmail.attachment = [attachment];
        userEmail.attachment = [attachment];
    }

    try {
        console.log('📤 Enviando correo al administrador via Brevo...');
        await brevoClient.sendTransacEmail(adminEmail);
        console.log('✅ Correo a administrador enviado');

        console.log('📤 Enviando correo de confirmación al usuario via Brevo...');
        await brevoClient.sendTransacEmail(userEmail);
        console.log('✅ Correo de confirmación enviado');

        res.json({
            success: true,
            message: "Correo enviado exitosamente"
        });
    } catch (error) {
        console.error('❌ Error enviando correo con Brevo:', error.response?.body || error.message);
        res.status(500).json({
            error: "Error al enviar el correo",
            details: error.response?.body?.message || error.message
        });
    }
});

/* ===============================
   ENDPOINTS DE PRUEBA
================================ */
app.get("/api/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.post("/api/test-body", (req, res) => {
    console.log("Test body recibido:", req.body);
    res.json({
        received: true,
        body: req.body
    });
});

app.get("/api/diagnostico-email", async (req, res) => {
    res.json({
        status: "OK",
        message: "Brevo configurado",
        emailUser: emailUser,
        hasApiKey: !!brevoApiKey
    });
});

app.post("/api/test-email", async (req, res) => {
    const testEmail = req.body.email || emailUser;

    if (!brevoClient) {
        return res.status(500).json({ error: "Brevo no configurado" });
    }

    const testMsg = new brevo.SendSmtpEmail();
    testMsg.to = [{ email: testEmail }];
    testMsg.sender = { email: emailUser, name: 'EDAPymes Test' };
    testMsg.subject = "🔧 Prueba de configuración - EDAPymes";
    testMsg.htmlContent = `
        <h2>✅ Brevo funcionando correctamente!</h2>
        <p>Este es un correo de prueba desde EDAPymes con Brevo.</p>
        <p>Fecha: ${new Date().toLocaleString()}</p>
        <hr>
        <p><strong>Configuración actual:</strong></p>
        <ul>
            <li>Email remitente: ${emailUser}</li>
            <li>Servicio: Brevo</li>
            <li>API Key configurada: ${!!brevoApiKey ? '✅ Sí' : '❌ No'}</li>
        </ul>
    `;

    try {
        await brevoClient.sendTransacEmail(testMsg);
        res.json({
            success: true,
            message: "Correo de prueba enviado exitosamente"
        });
    } catch (error) {
        console.error('Error en correo de prueba:', error.response?.body || error.message);
        res.status(500).json({
            success: false,
            error: error.response?.body?.message || error.message
        });
    }
});

/* ===============================
   MANEJO DE ERRORES GLOBAL
================================ */
app.use((err, req, res, next) => {
    console.error('Error global:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ error: "Error interno del servidor: " + err.message });
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
    console.log(`🖼️ ImageKit: Configurado`);
    console.log(`📧 Brevo: ${brevoApiKey ? '✅ Configurado' : '❌ No configurado'}`);
    console.log(`📧 Email remitente: ${emailUser}`);
});