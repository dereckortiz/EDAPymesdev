const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_7LdzOe5sNtnK@ep-still-hill-amsrhy4v-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

async function checkAdmin() {
    const result = await pool.query("SELECT * FROM usuarios WHERE username = 'admin'");

    if (result.rows.length === 0) {
        console.log('❌ Usuario admin NO existe. Creándolo...');
        const hash = await bcrypt.hash('Admin123!', 10);
        await pool.query(
            "INSERT INTO usuarios (username, password) VALUES ($1, $2)",
            ['admin', hash]
        );
        console.log('✅ Usuario admin creado');
    } else {
        console.log('✅ Usuario admin existe');
        console.log('   Usuario:', result.rows[0].username);
        console.log('   Password hash:', result.rows[0].password.substring(0, 20) + '...');
    }

    await pool.end();
}

checkAdmin();