/**
 * Имя фрейма → имя файла для скачивания (без расширения).
 *
 * Считается в песочнице (там есть frame.name) и приезжает в UI готовым, чтобы
 * правило жило в одном месте. Целевая ОС — Windows: там запрещённых символов
 * больше всего, и она же отказывается от хвостовых точек и пробелов.
 */

const FORBIDDEN = /[\\/:*?"<>|\u0000-\u001f]/g;
const RESERVED =
  /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
const MAX_LENGTH = 120;

export function sanitizePsdFileName(rawName: string): string {
  let name = typeof rawName === "string" ? rawName : "";
  name = name.replace(FORBIDDEN, "_");
  name = name.replace(/\s+/g, " ").trim();
  // Windows молча отбрасывает хвостовые точки и пробелы — обрезаем сами,
  // иначе имя файла разойдётся с тем, что показали в статусе.
  name = name.replace(/[. ]+$/, "");
  if (name.length > MAX_LENGTH) {
    name = name.slice(0, MAX_LENGTH).replace(/[. ]+$/, "");
  }
  if (name.length === 0) {
    return "frame";
  }
  if (RESERVED.test(name)) {
    return "_" + name;
  }
  return name;
}
