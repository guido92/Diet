
async function test() {
    console.log('--- Testing pdf-parse main ---');
    try {
        const libMain = require('pdf-parse');
        console.log('Require "pdf-parse" type:', typeof libMain);
        console.log('Keys:', Object.keys(libMain));
        console.log('Is Default a function?', typeof libMain.default);

        // Check if libMain itself is the class or function
        console.log('libMain prototype:', libMain.prototype);

    } catch (e) {
        console.error('Error:', e);
    }
}

test();
