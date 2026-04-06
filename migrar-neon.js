// generar-hash.js
const bcrypt = require('bcrypt');

async function main() {
    const password = 'EdaPymesdev1472';
    const hash = await bcrypt.hash(password, 10);
    console.log('Nueva contraseña:', password);
    console.log('Hash generado:');
    console.log(hash);
    console.log('\n--- COPIA ESTE HASH ---');
}

main();