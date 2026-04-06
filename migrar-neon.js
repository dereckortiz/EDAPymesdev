const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');

// URL de Neon
const NEON_URL = 'postgresql://neondb_owner:npg_7LdzOe5sNtnK@ep-still-hill-amsrhy4v-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require';

console.log('🚀 Migrando datos desde SQLite a Neon...\n');

// Conectar a SQLite
const sqliteDb = new sqlite3.Database(path.join(__dirname, 'db', 'edapymes.db'));

// Conectar a Neon
const neon = new Pool({
    connectionString: NEON_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        // 1. Crear tablas en Neon
        console.log('📦 Creando tablas en Neon...');
        await neon.query(`
            CREATE TABLE IF NOT EXISTS categorias (
                id SERIAL PRIMARY KEY,
                nombre TEXT UNIQUE NOT NULL,
                icono TEXT DEFAULT 'category'
            );
            CREATE TABLE IF NOT EXISTS productos (
                id SERIAL PRIMARY KEY,
                nombre TEXT NOT NULL,
                precio REAL NOT NULL,
                categoria TEXT,
                descripcion TEXT,
                especificaciones TEXT,
                imagenes TEXT,
                disponible INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Tablas creadas\n');

        // 2. Migrar categorías
        console.log('📂 Migrando categorías...');
        const categorias = await new Promise((resolve, reject) => {
            sqliteDb.all("SELECT * FROM categorias", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        for (const cat of categorias) {
            await neon.query(
                'INSERT INTO categorias (id, nombre, icono) VALUES ($1, $2, $3) ON CONFLICT (nombre) DO NOTHING',
                [cat.id, cat.nombre, cat.icono || 'category']
            );
        }
        console.log(`   ✅ ${categorias.length} categorías migradas`);

        // 3. Migrar productos
        console.log('📦 Migrando productos...');
        const productos = await new Promise((resolve, reject) => {
            sqliteDb.all("SELECT * FROM productos", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        for (const prod of productos) {
            await neon.query(
                `INSERT INTO productos (id, nombre, precio, categoria, descripcion, 
                                       especificaciones, imagenes, disponible, created_at) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [prod.id, prod.nombre, prod.precio, prod.categoria, prod.descripcion,
                prod.especificaciones, prod.imagenes, prod.disponible, prod.created_at]
            );
        }
        console.log(`   ✅ ${productos.length} productos migrados`);

        // 4. Migrar usuarios
        console.log('👥 Migrando usuarios...');
        const usuarios = await new Promise((resolve, reject) => {
            sqliteDb.all("SELECT * FROM usuarios", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        for (const user of usuarios) {
            await neon.query(
                'INSERT INTO usuarios (id, username, password, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO NOTHING',
                [user.id, user.username, user.password, user.created_at]
            );
        }
        console.log(`   ✅ ${usuarios.length} usuarios migrados`);

        // 5. Verificar
        const counts = await neon.query(`
            SELECT 
                (SELECT COUNT(*) FROM categorias) as categorias,
                (SELECT COUNT(*) FROM productos) as productos,
                (SELECT COUNT(*) FROM usuarios) as usuarios
        `);

        console.log('\n═══════════════════════════════════════');
        console.log('🎉 MIGRACIÓN COMPLETADA!');
        console.log('═══════════════════════════════════════');
        console.log(`📊 Datos en Neon:`);
        console.log(`   📂 Categorías: ${counts.rows[0].categorias}`);
        console.log(`   📦 Productos: ${counts.rows[0].productos}`);
        console.log(`   👥 Usuarios: ${counts.rows[0].usuarios}`);
        console.log('═══════════════════════════════════════');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await neon.end();
        sqliteDb.close();
    }
}

migrate();