import * as jsesc from "jsesc";

export function truncateName(name: string) {
  let temp = name || getRandomName();
  return jsesc(name).substr(0, 80);
}

export function getRandomName() {
  return `video-${Math.round(Math.random() * 1000)}`;
}
