export function fatalMessage(error: unknown): string {
  const cause = error instanceof Error ? error.message : String(error);
  return [
    "No se pudo mostrar la oficina 3D. Tu navegador necesita WebGL activado.",
    "The 3D office could not be displayed. Your browser needs WebGL enabled.",
    `(${cause})`,
  ].join("\n");
}
