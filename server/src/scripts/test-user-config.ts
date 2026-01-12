import OpenAI from 'openai';

const run = async () => {
    // Exact values provided by user
    const apiKey = 'SIAK-uQBQI6r71AgU';
    const baseURL = 'https://api.siemens.com/llm/v1';
    const model = 'qwen3-30b';

    console.log('🔍 Testing User Configuration:');
    console.log(`Key: ${apiKey}`);
    console.log(`BaseURL: ${baseURL}`);
    console.log(`Model: ${model}`);

    const client = new OpenAI({
        apiKey,
        baseURL
    });

    try {
        const response = await client.chat.completions.create({
            model: model,
            messages: [{ role: 'user', content: 'Ping' }],
        });
        console.log('✅ Success!');
        console.log(response.choices[0].message);
    } catch (error: any) {
        console.log('❌ Failed');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Error:', error.message);
        }
    }
};

run();
