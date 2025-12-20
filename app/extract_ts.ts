
import fs from 'fs';
import pdf from 'pdf-parse';

const filePath = 'c:/Progetti/Dieta/LineeGuidaNutrizionista/JESSICA&MICHAEL Note 11.06.25.pdf';

async function readPdf() {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        console.log(data.text);
    } catch (err) {
        console.error('Error:', err);
    }
}

readPdf();
