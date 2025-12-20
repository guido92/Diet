
async function test() {
    console.log('--- Testing pdf-parse v2 ---');
    try {
        const lib = require('pdf-parse');

        if (lib.PDFParse) {
            console.log('Found PDFParse class.');
            // Try to instantiate
            // const parser = new lib.PDFParse(); // Constructor might need args?
            // console.log('Instantiated parser:', parser);

            // Checking static methods?
            console.log('Static methods:', Object.getOwnPropertyNames(lib.PDFParse));
            console.log('Prototype methods:', Object.getOwnPropertyNames(lib.PDFParse.prototype));

        } else {
            console.log('PDFParse not found in lib.');
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

test();
