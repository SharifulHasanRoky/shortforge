// Quick test of image gen API directly
import ZAI from 'z-ai-web-dev-sdk';

async function test() {
  console.log('Starting...');
  const start = Date.now();
  try {
    const zai = await ZAI.create();
    console.log('SDK created in', Date.now() - start, 'ms');

    const t2 = Date.now();
    const response = await zai.images.generations.create({
      prompt: 'A solitary figure walking through a storm, dark cinematic',
      size: '768x1344',
    });
    console.log('Image gen took', Date.now() - t2, 'ms');

    if (response.data && response.data[0]) {
      console.log('Got image, base64 length:', response.data[0].base64?.length || 0);
    } else {
      console.log('No data in response:', JSON.stringify(response).slice(0, 200));
    }
  } catch (err: any) {
    console.error('Error after', Date.now() - start, 'ms:', err.message);
  }
}
test();
