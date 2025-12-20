const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const dir = 'c:/Progetti/Dieta/LineeGuidaNutrizionista/';

async function run() {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf'));

    for (const f of files) {
        console.log(`\n\n=== FILE: ${f} ===`);
        try {
            const buffer = fs.readFileSync(path.join(dir, f));
            const data = await pdf(buffer);
            const text = data.text;

            const lines = text.split('\n');
            lines.forEach((line, i) => {
                const lower = line.toLowerCase();
                if (
                    (lower.includes('carne') || lower.includes('pesce') || lower.includes('pollo') || lower.includes('tacchino') || lower.includes('manzo') || lower.includes('grammi') || lower.includes('g '))
                    && line.length < 200
                ) {
                    console.log(`[L${i}] ${line.trim()}`);
                }
            });
        } catch (e) {
            console.error("Error parsing " + f);
        }
    }
}

run();
