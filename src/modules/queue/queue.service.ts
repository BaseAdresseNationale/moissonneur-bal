import { Injectable, Logger } from '@nestjs/common';

export type Worker = {
  run(params: any): Promise<void>;
};

interface Task {
  title: string;
  worker: Worker;
  params: any;
}

@Injectable()
export class QueueService {
  private queue: Task[] = [];
  private isTaskRunning: boolean = false;

  constructor(private readonly logger: Logger) {}

  public pushTask(worker: Worker, title: string = '', params: any = null) {
    const task: Task = {
      worker,
      title,
      params,
    };
    this.queue.push(task);
    if (!this.isTaskRunning) {
      this.runTaskQueue();
    }
  }

  private async runTaskQueue() {
    this.isTaskRunning = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      this.logger.log(
        `[${QueueService.name}] TASK START ${task.title}`,
        QueueService.name,
      );
      try {
        await task.worker.run(task.params);
      } catch (error) {
        this.logger.error(
          `[${QueueService.name}] TASK ERROR ${task.title}`,
          error,
          QueueService.name,
        );
      }
      this.logger.log(
        `[${QueueService.name}] TASK END ${task.title}`,
        QueueService.name,
      );
    }

    this.isTaskRunning = false;
  }
}
