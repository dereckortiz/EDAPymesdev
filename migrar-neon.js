const { Pool } = require('pg');

const NEON_URL = 'postgresql://neondb_owner:npg_7LdzOe5sNtnK@ep-still-hill-amsrhy4v-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require';
const neon = new Pool({ connectionString: NEON_URL, ssl: { rejectUnauthorized: false } });

async function fixImages() {
    console.log('🔧 Corrigiendo URLs de imágenes...\n');

    const productos = await neon.query('SELECT id, imagenes FROM productos');

    for (const producto of productos.rows) {
        let imagenesArray = [];
        try {
            imagenesArray = JSON.parse(producto.imagenes);
        } catch (e) {
            continue;
        }

        let modificado = false;
        const nuevasImagenes = imagenesArray.map(img => {
            // Si no tiene URL o tiene una URL antigua
            if (!img.url || img.url.includes('localhost') || img.url.includes('edapymes.onrender.com')) {
                modificado = true;
                return {
                    ...img,
                    url: `https://edapymesdev.onrender.com/uploads/${img.filename}`
                };
            }
            return img;
        });

        if (modificado) {
            await neon.query(
                'UPDATE productos SET imagenes = $1 WHERE id = $2',
                [JSON.stringify(nuevasImagenes), producto.id]
            );
            console.log(`✅ Producto ${producto.id}: URLs actualizadas`);
        }
    }

    console.log('\n🎉 Todas las URLs han sido corregidas!');
    await neon.end();
}

fixImages();