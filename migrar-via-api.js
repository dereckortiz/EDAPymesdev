const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const SUPABASE_URL = 'https://pwyomllnrozpxbifmdgq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3eW9tbGxucm96cHhiaWZtZGdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDE5NjksImV4cCI6MjA5MTA3Nzk2OX0.WWWJVWnNPvig_GJXirfyDB3tHs1soDWaruypsbHmGy0';

// Inicializar Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Conectar a SQLite
const sqliteDb = new sqlite3.Database(path.join(__dirname, 'db', 'edapymes.db'));

console.log('🚀 Migrando datos vía API REST...\n');

async function migrate() {
    try {
        // 1. Primero, crear las tablas vía SQL (desde el navegador)
        console.log('⚠️  Asegúrate de haber creado las tablas en Supabase (SQL Editor)');
        console.log('   Si no lo has hecho, ve a SQL Editor y ejecuta el CREATE TABLE\n');

        // 2. Migrar categorías
        console.log('📂 Migrando categorías...');
        const categorias = await new Promise((resolve, reject) => {
            sqliteDb.all("SELECT * FROM categorias", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (categorias.length > 0) {
            const { data, error } = await supabase
                .from('categorias')
                .upsert(categorias, { onConflict: 'nombre' });

            if (error) {
                console.error('   Error:', error.message);
            } else {
                console.log(`   ✅ ${categorias.length} categorías migradas`);
            }
        } else {
            console.log('   ℹ️ No hay categorías para migrar');
        }

        // 3. Migrar productos
        console.log('📦 Migrando productos...');
        const productos = await new Promise((resolve, reject) => {
            sqliteDb.all("SELECT * FROM productos", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (productos.length > 0) {
            // Migrar en lotes de 50
            const batchSize = 50;
            let migrados = 0;

            for (let i = 0; i < productos.length; i += batchSize) {
                const batch = productos.slice(i, i + batchSize);
                const { error } = await supabase
                    .from('productos')
                    .upsert(batch);

                if (error) {
                    console.error(`   Error en lote ${i}:`, error.message);
                } else {
                    migrados += batch.length;
                    console.log(`   ✅ ${migrados}/${productos.length} productos`);
                }
            }
            console.log(`   ✅ ${productos.length} productos migrados`);
        } else {
            console.log('   ℹ️ No hay productos para migrar');
        }

        // 4. Migrar usuarios
        console.log('👥 Migrando usuarios...');
        const usuarios = await new Promise((resolve, reject) => {
            sqliteDb.all("SELECT * FROM usuarios", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (usuarios.length > 0) {
            const { error } = await supabase
                .from('usuarios')
                .upsert(usuarios, { onConflict: 'username' });

            if (error) {
                console.error('   Error:', error.message);
            } else {
                console.log(`   ✅ ${usuarios.length} usuarios migrados`);
            }
        } else {
            console.log('   ℹ️ No hay usuarios para migrar');
        }

        console.log('\n═══════════════════════════════════════');
        console.log('🎉 MIGRACIÓN COMPLETADA!');
        console.log('═══════════════════════════════════════');

        // Verificar resultados
        const { data: verificarCat } = await supabase.from('categorias').select('*', { count: 'exact' });
        const { data: verificarProd } = await supabase.from('productos').select('*', { count: 'exact' });
        const { data: verificarUser } = await supabase.from('usuarios').select('*', { count: 'exact' });

        console.log('\n📊 Datos en Supabase:');
        console.log(`   📂 Categorías: ${verificarCat?.length || 0}`);
        console.log(`   📦 Productos: ${verificarProd?.length || 0}`);
        console.log(`   👥 Usuarios: ${verificarUser?.length || 0}`);

    } catch (error) {
        console.error('❌ Error general:', error.message);
    } finally {
        sqliteDb.close();
    }
}

migrate();