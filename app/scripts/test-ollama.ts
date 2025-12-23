
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

async function testOllama() {
    console.log(`📡 Connecting to Ollama at ${OLLAMA_BASE_URL}...`);
    try {
        // 1. Check Tags
        const tagsRes = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
        if (!tagsRes.ok) throw new Error(`Failed to fetch tags: ${tagsRes.statusText}`);
        const tags = await tagsRes.json();
        console.log('✅ Ollama is reachable.');
        console.log('Available models:', (tags as any).models?.map((m: any) => m.name).join(', '));

        // 2. Test Generation
        console.log(`\n🧪 Testing generation with model: ${OLLAMA_MODEL}...`);
        const prompt = `
      Analizza questo testo (SIMULATO) di un volantino:
      "OFFERTA SPECIALE: Pasta Barilla 500g a 0.89€. Tonno Rio Mare 3x80g a 2.99€."
      Estrai un array JSON con {prodotto, prezzo}. Rispondi SOLO JSON.
    `;

        const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: prompt,
                stream: false
            })
        });

        if (!response.ok) throw new Error(`Generation failed: ${response.statusText}`);
        const data: any = await response.json();
        console.log('\n📝 Response from Ollama:');
        console.log(data.response);

    } catch (error) {
        console.error('\n❌ Ollama Test Failed:', error);
        console.log('\n💡 Tip: Ensure Ollama is running (`ollama serve`) and the model is pulled (`ollama pull llama3.2`).');
    }
}

testOllama();
