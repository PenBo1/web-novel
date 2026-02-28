/**
 * 请求调度器 - 实现速率限制和请求队列
 * 参考 bili_novel_packer 的 Scheduler 实现
 *
 * 用途：
 * - 限制单位时间内的请求数量（防止被网站限制）
 * - 维护请求队列，按顺序执行
 * - 支持暂停/恢复机制（用于处理 Cloudflare 限制）
 */

export type SchedulerTask<R> = (
  controller: SchedulerController,
) => Promise<R> | R;

export class SchedulerController {
  private _paused = false;

  pause() {
    this._paused = true;
  }

  resume() {
    this._paused = false;
  }

  isPaused() {
    return this._paused;
  }
}

interface TaskResult<R> {
  status: "pending" | "inProgress" | "completed" | "failed";
  value?: R;
  error?: Error;
}

/**
 * 调度器 - 控制请求速率
 * @param maxRequests 时间窗口内最多请求数
 * @param timeWindow 时间窗口（毫秒）
 *
 * 例如：Scheduler(15, 60000) 表示每分钟最多 15 个请求
 */
export class Scheduler {
  private queue: SchedulerTask<any>[] = [];
  private resultMap = new Map<number, TaskResult<any>>();
  private controller = new SchedulerController();
  private gap: number; // 请求间隔（毫秒）
  private looping = false;
  private completer: Promise<void> = Promise.resolve();

  constructor(maxRequests: number, timeWindow: number) {
    if (maxRequests > 0 && timeWindow > 0) {
      this.gap = Math.ceil(timeWindow / maxRequests);
    } else {
      this.gap = 0;
    }
  }

  async run<R>(task: SchedulerTask<R>): Promise<R> {
    const taskId = Math.random();
    this.queue.push(task);
    this.resultMap.set(taskId, { status: "pending" });
    this._loop();
    return this._getResult<R>(taskId);
  }

  private async _getResult<R>(taskId: number): Promise<R> {
    const result = this.resultMap.get(taskId);
    if (!result) {
      throw new Error("Task not found");
    }

    while (true) {
      if (result.status === "completed") {
        return result.value as R;
      }
      if (result.status === "failed" && result.error) {
        throw result.error;
      }
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
  }

  private _loop() {
    if (this.looping) return;
    this.looping = true;

    this._processQueue();
  }

  private async _processQueue() {
    while (this.queue.length > 0) {
      // 等待暂停恢复
      while (this.controller.isPaused()) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const task = this.queue.shift();
      if (!task) break;

      const taskId = Math.random();
      const result = this.resultMap.get(taskId);
      if (!result) continue;

      result.status = "inProgress";

      try {
        const value = await Promise.resolve(task(this.controller));
        result.value = value;
        result.status = "completed";
      } catch (error) {
        result.error = error as Error;
        result.status = "failed";
      }

      // 等待间隔时间
      if (this.gap > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.gap));
      }
    }

    this.looping = false;
  }

  async wait() {
    while (this.queue.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
  }
}

/**
 * 无限制调度器 - 不限制请求速率
 */
export class UnlimitedScheduler extends Scheduler {
  constructor() {
    super(0, 0);
  }
}
