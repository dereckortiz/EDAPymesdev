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
const sgMail = require('@sendgrid/mail');

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
   CONFIGURACION DE SENDGRID - SOLO VARIABLES DE ENTORNO
================================ */
const sendgridApiKey = process.env.SENDGRID_API_KEY;
const emailUser = process.env.EMAIL_USER || 'derecksevi@gmail.com';

if (sendgridApiKey) {
    sgMail.setApiKey(sendgridApiKey);
    console.log('✅ SendGrid configurado correctamente');
    console.log(`📧 Los correos se enviarán desde: ${emailUser}`);
} else {
    console.log('❌ SENDGRID_API_KEY no configurada en variables de entorno');
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
   API DE ENVIO DE CORREOS CON SENDGRID
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
        <head><meta charset="UTF-8"></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #034AB0; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h2>📬 Nuevo Mensaje de Contacto</h2>
                </div>
                <div style="padding: 20px; background: #f5f5f5;">
                    <p><strong>📅 Fecha:</strong> ${escapeHtml(fecha)}</p>
                    <p><strong>👤 Nombre:</strong> ${escapeHtml(nombre)}</p>
                    <p><strong>📧 Correo:</strong> ${escapeHtml(email)}</p>
                    <p><strong>🔧 Servicio:</strong> ${escapeHtml(servicio || 'No especificado')}</p>
                    <p><strong>💬 Mensaje:</strong></p>
                    <p style="background: white; padding: 15px; border-radius: 8px;">${escapeHtml(mensaje).replace(/\n/g, '<br>')}</p>
                </div>
                <div style="text-align: center; padding: 20px; font-size: 12px; color: #666;">
                    <p>EDAPymes - Tecnología con Calidad y Calidez</p>
                </div>
            </div>
        </body>
        </html>
    `;

    // Correo de confirmación para el usuario
    const userEmailContent = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #034AB0; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h2>✨ ¡Hola ${escapeHtml(nombre)}!</h2>
                </div>
                <div style="padding: 20px; background: #f5f5f5;">
                    <p>Gracias por contactarte con <strong>EDAPymes</strong>. Hemos recibido tu mensaje exitosamente.</p>
                    <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #034AB0;">
                        <strong>📝 Tu mensaje:</strong><br>
                        ${escapeHtml(mensaje)}
                    </div>
                    <p>Uno de nuestros asesores te responderá a la brevedad posible (normalmente en menos de 24 horas hábiles).</p>
                    <p>Mientras tanto, te invitamos a:</p>
                    <ul>
                        <li>📱 Seguirnos en <a href="https://www.facebook.com/profile.php?id=61576401396435">Facebook</a></li>
                        <li>💬 Contactarnos por <a href="https://wa.me/50583295424">WhatsApp</a> para consultas rápidas</li>
                    </ul>
                </div>
                <div style="text-align: center; padding: 20px; font-size: 12px; color: #666;">
                    <p>EDAPymes - Tecnología con Calidad y Calidez</p>
                    <p>© ${new Date().getFullYear()} Todos los derechos reservados</p>
                </div>
            </div>
        </body>
        </html>
    `;

    // Configurar los emails para SendGrid
    const adminMsg = {
        to: emailUser,
        from: emailUser,
        replyTo: email,
        subject: `📧 Nuevo mensaje de contacto - ${servicio || 'Consulta general'}`,
        html: adminEmailContent
    };

    const userMsg = {
        to: email,
        from: emailUser,
        subject: `✅ Gracias por contactarnos ${nombre} - EDAPymes`,
        html: userEmailContent
    };

    // Agregar logo como adjunto si existe
    if (logoBase64) {
        adminMsg.attachments = [{
            content: logoBase64,
            filename: 'edapymes-logo.png',
            type: 'image/png',
            disposition: 'inline',
            content_id: 'logo'
        }];
        userMsg.attachments = [{
            content: logoBase64,
            filename: 'edapymes-logo.png',
            type: 'image/png',
            disposition: 'inline',
            content_id: 'logo'
        }];
    }

    try {
        console.log('📤 Enviando correo al administrador via SendGrid...');
        await sgMail.send(adminMsg);
        console.log('✅ Correo a administrador enviado');

        console.log('📤 Enviando correo de confirmación al usuario via SendGrid...');
        await sgMail.send(userMsg);
        console.log('✅ Correo de confirmación enviado');

        res.json({
            success: true,
            message: "Correo enviado exitosamente"
        });
    } catch (error) {
        console.error('❌ Error enviando correo con SendGrid:', error.response?.body || error.message);
        res.status(500).json({
            error: "Error al enviar el correo",
            details: error.response?.body?.errors?.[0]?.message || error.message
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
        message: "SendGrid configurado",
        emailUser: emailUser,
        hasApiKey: !!sendgridApiKey
    });
});

app.post("/api/test-email", async (req, res) => {
    const testEmail = req.body.email || emailUser;

    const testMsg = {
        to: testEmail,
        from: emailUser,
        subject: "🔧 Prueba de configuración de correo - EDAPymes",
        html: `
            <h2>✅ Configuración de SendGrid funcionando!</h2>
            <p>Este es un correo de prueba enviado desde el servidor de EDAPymes.</p>
            <p>Fecha: ${new Date().toLocaleString()}</p>
            <hr>
            <p><strong>Configuración actual:</strong></p>
            <ul>
                <li>Email remitente: ${emailUser}</li>
                <li>Servicio: SendGrid</li>
                <li>API Key configurada: ${!!sendgridApiKey ? '✅ Sí' : '❌ No'}</li>
            </ul>
        `
    };

    try {
        await sgMail.send(testMsg);
        res.json({
            success: true,
            message: "Correo de prueba enviado exitosamente"
        });
    } catch (error) {
        console.error('Error en correo de prueba:', error.response?.body || error.message);
        res.status(500).json({
            success: false,
            error: error.response?.body?.errors?.[0]?.message || error.message
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
    console.log(`📧 SendGrid: ${sendgridApiKey ? '✅ Configurado' : '❌ No configurado'}`);
    console.log(`📧 Email remitente: ${emailUser}`);
});