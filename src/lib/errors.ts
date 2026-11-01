export class ConfigError extends Error {
  readonly file: string;
  readonly path: string;

  constructor(file: string, path: string, message: string) {
    super(`[daybook:config] ${file} > ${path}\n  ${message}`);
    this.name = 'ConfigError';
    this.file = file;
    this.path = path;
  }
}

export class ProjectError extends Error {
  readonly file?: string;

  constructor(message: string, file?: string) {
    super(file ? `[daybook:project] ${file}\n  ${message}` : `[daybook:project] ${message}`);
    this.name = 'ProjectError';
    this.file = file;
  }
}

export class ContentError extends Error {
  readonly file: string;

  constructor(file: string, message: string) {
    super(`[daybook:content] ${file}\n  ${message}`);
    this.name = 'ContentError';
    this.file = file;
  }
}
