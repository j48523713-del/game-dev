export function generateRandomJob() {
  return { id: Math.random().toString(36).slice(2,8), title: 'Test Job', reward: 100 };
}
