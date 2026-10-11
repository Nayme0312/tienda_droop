/**
 * Un unico bucle de requestAnimationFrame compartido por las animaciones de
 * canvas de la tienda (KineticGrid, TextParticle).
 *
 * Cada animacion registra una tarea con `scheduleFrame`; la tarea devuelve
 * true mientras necesite mas frames y false cuando queda en reposo. Sin
 * tareas no hay bucle, y con la pestana oculta se detiene hasta que vuelva a
 * estar visible.
 */

export type FrameTask = (now: number) => boolean

const tasks = new Set<FrameTask>()
let frame = 0

function loop(now: number) {
  frame = 0
  for (const task of Array.from(tasks)) {
    if (!task(now)) tasks.delete(task)
  }
  start()
}

function start() {
  if (frame || tasks.size === 0) return
  if (typeof document !== "undefined" && document.hidden) return
  frame = requestAnimationFrame(loop)
}

function stop() {
  if (!frame) return
  cancelAnimationFrame(frame)
  frame = 0
}

/** Pide frames para `task` hasta que devuelva false. Repetir la llamada no duplica la tarea. */
export function scheduleFrame(task: FrameTask) {
  tasks.add(task)
  start()
}

export function cancelFrame(task: FrameTask) {
  tasks.delete(task)
  if (tasks.size === 0) stop()
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop()
    else start()
  })
}
