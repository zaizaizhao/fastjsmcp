import winston from 'winston';
import path from 'path';

// 日志级别配置
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

// 日志配置接口
export interface LoggerConfig {
  level?: LogLevel;
  format?: 'simple' | 'json';
  enableFile?: boolean;
  logDir?: string;
  prefix?: string;
}

// 默认配置
const defaultConfig: Required<LoggerConfig> = {
  level: (process.env.LOG_LEVEL as LogLevel) || 'info',
  format: (process.env.LOG_FORMAT as 'simple' | 'json') || 'simple',
  enableFile: process.env.NODE_ENV === 'production',
  logDir: 'logs',
  prefix: 'FastMCP'
};

/**
 * Winston 日志器类
 */
export class Logger {
  private winston: winston.Logger;
  private config: Required<LoggerConfig>;

  constructor(config: LoggerConfig = {}) {
    this.config = { ...defaultConfig, ...config };
    this.winston = this.createWinstonLogger();
  }

  private createWinstonLogger(): winston.Logger {
    const transports: winston.transport[] = [];

    // 控制台输出配置
    const consoleFormat = this.config.format === 'json' 
      ? winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        )
      : winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.errors({ stack: true }),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const prefix = this.config.prefix ? `[${this.config.prefix}]` : '';
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            return `${timestamp} ${prefix} ${level.toUpperCase()}: ${message}${metaStr}`;
          })
        );

    // 添加控制台传输
    transports.push(new winston.transports.Console({
      format: consoleFormat,
      level: this.config.level
    }));

    // 文件输出配置（生产环境或显式启用）
    if (this.config.enableFile) {
      const logDir = path.resolve(this.config.logDir);
      
      // 错误日志文件
      transports.push(new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }));

      // 综合日志文件
      transports.push(new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }));
    }

    const logger = winston.createLogger({
       level: this.config.level,
       transports,
       // 禁用 exitOnError 以避免警告
       exitOnError: false
     });

    // 只在生产环境处理未捕获的异常和未处理的 Promise 拒绝
    if (process.env.NODE_ENV === 'production') {
      logger.exceptions.handle(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
          )
        })
      );

      logger.rejections.handle(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
          )
        })
      );
    }

    return logger;
  }

  /**
   * 记录错误级别日志
   */
  error(message: string, meta?: any): void {
    this.winston.error(message, meta);
  }

  /**
   * 记录警告级别日志
   */
  warn(message: string, meta?: any): void {
    this.winston.warn(message, meta);
  }

  /**
   * 记录信息级别日志
   */
  info(message: string, meta?: any): void {
    this.winston.info(message, meta);
  }

  /**
   * 记录调试级别日志
   */
  debug(message: string, meta?: any): void {
    this.winston.debug(message, meta);
  }

  /**
   * 动态设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
    this.winston.level = level;
    this.winston.transports.forEach(transport => {
      if (transport instanceof winston.transports.Console) {
        transport.level = level;
      }
    });
  }

  /**
   * 获取当前日志级别
   */
  getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * 创建子日志器（带有特定前缀）
   */
  child(prefix: string): Logger {
    return new Logger({
      ...this.config,
      prefix: this.config.prefix ? `${this.config.prefix}:${prefix}` : prefix
    });
  }

  /**
   * 关闭日志器
   */
  close(): Promise<void> {
    return new Promise((resolve) => {
      // Winston 4.x 的 close 方法不接受回调参数
      this.winston.close();
      // 给一点时间让所有传输器完成关闭
      setTimeout(() => resolve(), 100);
    });
  }
}

// 创建默认日志器实例
export const logger = new Logger();

// 导出便捷方法
export const log = {
  error: (message: string, meta?: any) => logger.error(message, meta),
  warn: (message: string, meta?: any) => logger.warn(message, meta),
  info: (message: string, meta?: any) => logger.info(message, meta),
  debug: (message: string, meta?: any) => logger.debug(message, meta)
};

export default logger;