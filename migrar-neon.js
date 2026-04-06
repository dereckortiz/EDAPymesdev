const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_7LdzOe5sNtnK@ep-still-hill-amsrhy4v-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

async function actualizarContraseña() {
    try {
        const nuevoPassword = 'EdaPymes$5%12@!7857';
        const hash = await bcrypt.hash(nuevoPassword, 10);

        // Actualizar el usuario existente
        const result = await pool.query(
            "UPDATE usuarios SET password = $1 WHERE username = $2 RETURNING id, username",
            [hash, 'edapymes_devCatalog']
        );

        if (result.rows.length > 0) {
            console.log(`✅ Contraseña actualizada para: ${result.rows[0].username}`);
            console.log(`   Nueva contraseña: ${nuevoPassword}`);
        } else {
            console.log('❌ Usuario no encontrado');
        }

        // Verificar que funcionó
        const verify = await pool.query("SELECT username FROM usuarios WHERE username = 'edapymes_devCatalog'");
        console.log(`\n📋 Usuario listo para login: ${verify.rows[0].username}`);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

actualizarContraseña();