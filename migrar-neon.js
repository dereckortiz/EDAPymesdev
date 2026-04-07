// actualizar-bd-imagenes.js
const { Pool } = require("pg");
const fs = require('fs');
const path = require('path');

// Configuración de PostgreSQL
const pool = new Pool({
    connectionString: 'postgresql://edapymes_devCatalog_user:sXAWRpav0fy9N62sW9fZJ3vS6hEzIKVZ@dpg-cvqk5jq4d50c73d7nlk0-a.oregon-postgres.render.com/neondb',
    ssl: { rejectUnauthorized: false }
});

// Mapeo de nombres de archivo antiguos a nuevas URLs de ImageKit
// (basado en la salida de tu migración)
const mappingImagenes = {
    '1774359730298.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774359730298_b-D0VrQy2.png',
    '1774360136480.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774360136480_DBeDbghRP.png',
    '1774361499596.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774361499596_dXOiML96I.png',
    '1774644738550-781314911.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774644738550-781314911_l8zBpwlFJ.png',
    '1774644738610-556323722.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774644738610-556323722_Uc4xGZkbI.png',
    '1774644738639-707757467.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774644738639-707757467_-z6uAB8Vp.png',
    '1774646407578-388421083.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774646407578-388421083_Ue2OmDkEw.png',
    '1774646407667-888133569.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774646407667-888133569_SM-CH_PWw.png',
    '1774646407729-731010465.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774646407729-731010465_nXZVPLiyG.png',
    '1774646407780-505420547.jpg': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774646407780-505420547_TR8sIJ_ao.jpg',
    '1774900430386-500848020.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774900430386-500848020_3h-Z1gw9Z.png',
    '1774901523486-560817409.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774901523486-560817409_2e6LixWbD.png',
    '1774902056176-996549599.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774902056176-996549599_ttM1YcLcY.png',
    '1774902510531-655250173.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774902510531-655250173_6EhiXxhxF.png',
    '1774902998171-594922871.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774902998171-594922871_DtY-i6LjY.png',
    '1774903286957-650622320.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774903286957-650622320_HA8KWkJZ7.png',
    '1774905122636-891455991.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774905122636-891455991_CRDjq0O4I.png',
    '1774905122710-980270472.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774905122710-980270472_nTI4p0P5_.png',
    '1774905122767-519498778.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774905122767-519498778_53LpUZ8xv.png',
    '1774907002612-464082484.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774907002612-464082484_wnJ7vQ63a.png',
    '1774907002707-996859080.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774907002707-996859080_0_jwQo8k2.png',
    '1774907002739-531160838.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774907002739-531160838_HneoNbmK8.png',
    '1774907002768-827810486.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774907002768-827810486_ohM3H13QH.png',
    '1774907002792-982682667.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774907002792-982682667_42s9PFKc5.png',
    '1774907002832-581385224.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774907002832-581385224_c2IoVnpbn.png',
    '1774986649243-977148786.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774986649243-977148786_FGsC9pS6d.png',
    '1774986649315-431905958.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774986649315-431905958_Qz_QbqdNf.png',
    '1774986649362-724871895.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774986649362-724871895__aiJSc4WA.png',
    '1774988414241-312370968.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774988414241-312370968_A40nMxC8J.png',
    '1774988414277-467870773.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774988414277-467870773_oQmZ31WC8.png',
    '1774988414320-766584752.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774988414320-766584752_D999a30sG.png',
    '1774988414376-950381905.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774988414376-950381905_3GM99cvn1.png',
    '1774989837661-272011334.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774989837661-272011334_KON9C-QzG.png',
    '1774989837718-204713048.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774989837718-204713048_vJ8MKGEuh.png',
    '1774989837757-837582905.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774989837757-837582905_1ZT0E0YfG.png',
    '1774989837806-906320457.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774989837806-906320457_kc9OLDzIQ.png',
    '1774991528984-744019330.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774991528984-744019330_XednOVN12.png',
    '1774991529025-151238017.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774991529025-151238017_QHxFKbQYu.png',
    '1774991529070-962134532.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774991529070-962134532_LsTK_zfHZ.png',
    '1774993281150-419665007.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774993281150-419665007_FUd-sR8Jj.png',
    '1774994132024-469808662.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774994132024-469808662_FF3tHYgNM.png',
    '1774995055346-156026269.png': 'https://ik.imagekit.io/y52skklsrw/edapymes/productos/1774995055346-156026269_1B3ThgWxd.png'
};

async function actualizarBaseDeDatos() {
    console.log("🚀 Actualizando base de datos con las nuevas URLs de ImageKit...");

    // Obtener todos los productos
    const productos = await pool.query("SELECT id, nombre, imagenes FROM productos WHERE imagenes IS NOT NULL");
    console.log(`📦 Productos encontrados: ${productos.rows.length}`);

    let productosActualizados = 0;
    let imagenesActualizadas = 0;

    for (const producto of productos.rows) {
        let imagenesArray;
        try {
            imagenesArray = JSON.parse(producto.imagenes);
        } catch (e) {
            console.log(`⚠️ Producto ${producto.id} (${producto.nombre}): No se pudo parsear`);
            continue;
        }

        if (!imagenesArray || imagenesArray.length === 0) continue;

        let modificado = false;
        let nuevasImagenes = [];

        for (const img of imagenesArray) {
            const filename = img.filename || img;

            if (mappingImagenes[filename]) {
                // Reemplazar con la URL de ImageKit
                nuevasImagenes.push({
                    url: mappingImagenes[filename],
                    fileId: filename,
                    originalName: img.originalName || filename,
                    isMain: img.isMain || false,
                    order: img.order || 0
                });
                imagenesActualizadas++;
                modificado = true;
                console.log(`   ✅ ${filename} -> actualizada`);
            } else {
                // Mantener la imagen original si no está en el mapping
                nuevasImagenes.push(img);
            }
        }

        if (modificado) {
            await pool.query(
                "UPDATE productos SET imagenes = $1 WHERE id = $2",
                [JSON.stringify(nuevasImagenes), producto.id]
            );
            productosActualizados++;
            console.log(`💾 Producto ${producto.id} (${producto.nombre}) actualizado`);
        }
    }

    console.log("\n" + "=".repeat(50));
    console.log("📊 RESUMEN:");
    console.log(`   ✅ Productos actualizados: ${productosActualizados}`);
    console.log(`   ✅ Imágenes actualizadas: ${imagenesActualizadas}`);
    console.log("=".repeat(50));

    await pool.end();
    console.log("\n🎉 Base de datos actualizada correctamente!");
}

actualizarBaseDeDatos().catch(error => {
    console.error("❌ Error:", error);
    process.exit(1);
});