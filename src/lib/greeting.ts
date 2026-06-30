const MORNING = [
  "Утречка, {name}",
  "Доброе утро, {name}",
  "Время Pixel\u2019a",
  "Кофе + Pixel = успех",
];

const DAY = [
  "{name} возвращается!",
  "Доброго дня, {name}",
  "С возвращением, {name}",
  "{name}, к вашим услугам",
];

const EVENING = [
  "Спокойствие, с Pixel\u2019ом",
  "Хорошего вечера, {name}",
  "Вечер — время для Pixel\u2019a",
  "{name}, время расслабиться",
];

const NIGHT = [
  "Доброй ночи, {name}",
  "Я уже собирался выключаться)",
  "Ночные совы, здравствуйте",
  "{name}, не забудьте про сон",
];

const UNIVERSAL = [
  "Чем я могу вам помочь?",
  "С чём вам помочь?",
  "Pixel > чрезмерное обдумывание",
];

const MOBILE = "Pixel, прямо у вас в кармане";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickTemplate(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return pick(MORNING);
  if (hour >= 12 && hour < 17) return pick(DAY);
  if (hour >= 17 && hour < 22) return pick(EVENING);
  return pick(NIGHT);
}

export function getGreetingTemplate(isMobile?: boolean): string {
  if (isMobile) return MOBILE;
  return pickTemplate();
}

export function renderGreeting(template: string, userName?: string): string {
  if (!template.includes("{name}")) return template;
  const name = userName?.split(" ")[0] || "";
  if (!name) return pick(UNIVERSAL);
  return template.replace(/{name}/g, name);
}
