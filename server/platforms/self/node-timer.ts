import { TimerAdapter, TimerTask } from '../../types'

interface ScheduledTask {
  id: string
  cron: string
  handler: () => Promise<void>
  timeout?: NodeJS.Timeout
  nextRun: Date
  isActive: boolean
}

export function createNodeTimerAdapter(): TimerAdapter {
  const tasks = new Map<string, ScheduledTask>()

  const parseCron = (cron: string): { interval: number; unit: string } => {
    const parts = cron.split(' ')
    if (parts.length !== 5) {
      throw new Error('Invalid cron expression')
    }

    const [minute, hour, day, month, weekday] = parts

    if (minute !== '*' && hour === '*' && day === '*' && month === '*' && weekday === '*') {
      return { interval: parseInt(minute), unit: 'minute' }
    }

    if (minute === '*' && hour !== '*' && day === '*' && month === '*' && weekday === '*') {
      return { interval: parseInt(hour), unit: 'hour' }
    }

    if (minute === '*' && hour === '*' && day !== '*' && month === '*' && weekday === '*') {
      return { interval: parseInt(day), unit: 'day' }
    }

    throw new Error('Unsupported cron expression')
  }

  const calculateNextRun = (cron: string): Date => {
    const { interval, unit } = parseCron(cron)
    const now = new Date()

    switch (unit) {
      case 'minute':
        return new Date(now.getTime() + interval * 60 * 1000)
      case 'hour':
        return new Date(now.getTime() + interval * 60 * 60 * 1000)
      case 'day':
        return new Date(now.getTime() + interval * 24 * 60 * 60 * 1000)
      default:
        return new Date(now.getTime() + 60 * 1000)
    }
  }

  const scheduleTask = (task: ScheduledTask) => {
    const now = new Date()
    const delay = task.nextRun.getTime() - now.getTime()

    if (delay > 0) {
      task.timeout = setTimeout(async () => {
        if (task.isActive) {
          try {
            await task.handler()
          } catch (error) {
            console.error(`Task ${task.id} failed:`, error)
          }

          task.nextRun = calculateNextRun(task.cron)
          scheduleTask(task)
        }
      }, delay)
    }
  }

  return {
    async schedule(cron: string, handler: () => Promise<void>): Promise<string> {
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const task: ScheduledTask = {
        id: taskId,
        cron,
        handler,
        nextRun: calculateNextRun(cron),
        isActive: true
      }

      tasks.set(taskId, task)
      scheduleTask(task)

      return taskId
    },

    async cancel(taskId: string): Promise<void> {
      const task = tasks.get(taskId)
      if (task) {
        task.isActive = false
        if (task.timeout) {
          clearTimeout(task.timeout)
        }
        tasks.delete(taskId)
      }
    },

    async list(): Promise<TimerTask[]> {
      return Array.from(tasks.values()).map(task => ({
        id: task.id,
        cron: task.cron,
        nextRun: task.nextRun,
        isActive: task.isActive
      }))
    }
  }
}
