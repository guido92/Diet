
const fs = require('fs');
const path = require('path');

async function test() {
    console.log('--- Testing pdf-parse ---');
    try {
        const lib = require('pdf-parse/lib/pdf-parse.js');
        console.log('Require "pdf-parse/lib/pdf-parse.js" type:', typeof lib);
        console.log('Keys:', Object.keys(lib));

        const libMain = require('pdf-parse');
        console.log('Require "pdf-parse" type:', typeof libMain);
        console.log('Keys:', Object.keys(libMain));

        if (typeof libMain === 'function') {
            console.log('libMain is a function, trying to call it...');
            // Mock buffer
            try {
                // Just see if it crashes immediately on call
                // await libMain(Buffer.from('')); 
            } catch (e) { console.log('Call error:', e.message); }
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

test();
