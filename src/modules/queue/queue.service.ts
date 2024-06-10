import { Injectable } from '@nestjs/common';

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

  constructor() {}

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
      console.debug(`Task start ${task.title}`);
      try {
        await task.worker.run(task.params);
      } catch (e) {
        console.debug(`Task error ${task.title}`, e);
      }
      console.debug(`Task end ${task.title}`);
    }

    this.isTaskRunning = false;
  }
}
