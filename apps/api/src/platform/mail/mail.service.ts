import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createRequire } from "node:module";

import type { AppConfig } from "../../config/config.types.js";

@Injectable()
export class MailService {
  private transporter: SmtpMailer | null = null;

  constructor(private readonly configService: ConfigService<AppConfig>) {}

  isConfigured(): boolean {
    return this.readConfig() !== null;
  }

  async send(options: MailMessage): Promise<MailSendResult> {
    const config = this.readConfig();
    if (!config) {
      throw new Error("SMTP is not configured");
    }

    const transporter = this.getTransporter(config);
    return transporter.sendMail({
      from: options.from ?? config.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
  }

  private getTransporter(config: SmtpConfig): SmtpMailer {
    if (!this.transporter) {
      const transporter = loadNodemailer().createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth:
          config.user && config.password
            ? {
                user: config.user,
                pass: config.password,
              }
            : undefined,
      });
      this.transporter = {
        sendMail: (options) => transporter.sendMail(options),
      };
    }

    return this.transporter;
  }

  private readConfig(): SmtpConfig | null {
    const emailConfig = this.configService.get<AppConfig["email"]>("email");
    const host = emailConfig?.smtpHost.trim();
    const from = emailConfig?.smtpFrom.trim();
    if (!host || !from) {
      return null;
    }

    const port = emailConfig?.smtpPort ?? 587;
    const secure = emailConfig?.smtpSecure ?? false;

    return {
      host,
      port: Number.isFinite(port) ? port : 587,
      secure,
      user: emailConfig?.smtpUser.trim() || null,
      password: emailConfig?.smtpPass.trim() || null,
      from,
    };
  }
}

export type MailMessage = {
  from?: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type MailSendResult = {
  messageId: string;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string | null;
  password: string | null;
  from: string;
};

type SmtpTransportAuth = {
  user: string;
  pass: string;
};

type SmtpTransportOptions = {
  host: string;
  port: number;
  secure: boolean;
  auth?: SmtpTransportAuth;
};

type SmtpMailer = {
  sendMail(options: MailMessage): Promise<MailSendResult>;
};

type NodemailerTransporter = {
  sendMail(options: MailMessage): Promise<MailSendResult>;
};

type NodemailerModule = {
  createTransport(options: SmtpTransportOptions): NodemailerTransporter;
};

const require = createRequire(import.meta.url);

function loadNodemailer(): NodemailerModule {
  const candidate: unknown = require("nodemailer");
  if (!isNodemailerModule(candidate)) {
    throw new Error(
      "nodemailer module is missing a usable createTransport function",
    );
  }
  return candidate;
}

function isNodemailerModule(value: unknown): value is NodemailerModule {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const createTransport = getUnknownProperty(value, "createTransport");
  return typeof createTransport === "function";
}

function getUnknownProperty(value: object, propertyName: string): unknown {
  return Reflect.get(value, propertyName) as unknown;
}
