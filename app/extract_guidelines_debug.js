
const fs = require('fs');
const path = require('path');

let pdfParse;
try {
    pdfParse = require('pdf-parse');
} catch (e) {
    try {
        pdfParse = require(path.resolve(__dirname, 'node_modules/pdf-parse'));
    } catch (e2) {
        console.error('Could not find pdf-parse module in standard locations.');
        process.exit(1);
    }
}

console.log('Type of pdfParse:', typeof pdfParse);
console.log('pdfParse keys:', Object.keys(pdfParse));

const filePath = 'c:/Progetti/Dieta/LineeGuidaNutrizionista/JESSICA&MICHAEL Note 11.06.25.pdf';

if (fs.existsSync(filePath)) {
    console.log('File exists.');
} else {
    console.log('File DOES NOT exist.');
}
