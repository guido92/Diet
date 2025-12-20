
async function test() {
    console.log('--- Testing parsng ---');
    try {
        const { PDFParse } = require('pdf-parse');
        const instance = new PDFParse();

        // Mock a small PDF buffer if possible? 
        // Or just print function signatuers.
        console.log('instance.load:', instance.load.toString().substring(0, 100));
        console.log('instance.getText:', instance.getText.toString().substring(0, 100));

    } catch (e) {
        console.error('Error:', e);
    }
}

test();
