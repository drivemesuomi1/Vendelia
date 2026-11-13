import { MerchantProvisioningService } from "./modules/merchants/provisioning";
import { SupabaseUserProvisioner, type SignupAdmin, type UserProvisioner } from "./modules/auth/user-provisioner";
import { PasswordResetService } from "./modules/auth/password-reset";
import { SignupService } from "./modules/auth/signup";
import { MerchantRepository } from "./modules/merchants/repository";
import { MerchantService } from "./modules/merchants/service";
import { merchantRoutes, merchantPortalRoutes } from "./modules/merchants/routes";
import { DealRepository } from "./modules/deals/repository";
import { dealRoutes } from "./modules/deals/routes";
import { SupabaseDealImageStorage, type DealImageStorage } from "./modules/deals/storage";
import { authConfig, sessionToken, type AuthConfig } from "./modules/auth/config";
import { AuthRepository } from "./modules/auth/repository";
import { AuthService } from "./modules/auth/service";
import { SupabaseGoogleProvider, SupabasePasswordProvider, type OAuthProvider, type PasswordProvider } from "./modules/auth/provider";
import { authRoutes } from "./modules/auth/routes";
import cors from "@fastify/cors";
import Fastify, { type FastifyError } from "fastify";
import type { Sql } from "postgres";
import { CatalogueRepository } from "./modules/catalogue/repository";
import { CatalogueService } from "./modules/catalogue/service";
import { catalogueRoutes } from "./modules/catalogue/routes";
import { healthRoutes } from "./modules/health/routes";
import { orderRoutes } from "./modules/orders/routes";
import { OrderService } from "./modules/orders/service";
import { createMailer, type Mailer } from "./modules/vouchers/mailer";
import { HttpProblem } from "./errors";
import { orderConfig, platformConfig, type OrderConfig, type PlatformConfig } from "./config";

export function buildApp(database: Sql, options: {
  config?: PlatformConfig; orders?: OrderConfig; mailer?: Mailer; logger?: boolean;
  auth?: AuthConfig; passwordProvider?: PasswordProvider; oauthProvider?: OAuthProvider; userProvisioner?: UserProvisioner; passwordAdmin?: SignupAdmin;
  dealImages?: DealImageStorage;
} = {}) {
  const app = Fastify({ logger: options.logger ?? false });
  const authSettings = options.auth ?? authConfig();
  const authService = new AuthService(new AuthRepository(database), options.passwordProvider ?? new SupabasePasswordProvider(authSettings));
  const repository = new CatalogueRepository(database);
  const config = options.config ?? platformConfig();
  const ordersConfig = options.orders ?? orderConfig();
  const service = new CatalogueService(repository, { ...config, paymentBypass: ordersConfig.paymentBypass });
  const mailer = options.mailer ?? createMailer(ordersConfig.mail);
  const orders = new OrderService(database, service, config, ordersConfig, mailer);
  app.register(cors, { origin: process.env.FRONTEND_URL ?? "http://localhost:3000", credentials: true });
  // Nothing is cached unless a route says otherwise (only immutable deal photos do).
  app.addHook("onSend", async (_request, reply) => { if (!reply.hasHeader("cache-control")) reply.header("cache-control", "no-store"); });
  app.addHook("onClose", async () => { await database.end({ timeout: 5 }); });
  app.setErrorHandler<FastifyError>((error, request, reply) => {
    if (error instanceof HttpProblem) {
      return reply.code(error.statusCode).send({ error: error.code, message: "Request could not be completed" });
    }
    request.log.error({ err: error }, "API request failed");
    const databaseFailure = typeof error.code === "string" && (
      /^(08|22|23|28|3D|3F|42|53|54|55|57|58|XX)/.test(error.code)
      || /^(CONNECTION_|CONNECT_|ECONN|EHOST|ENET|ENOTFOUND|EAI_|ETIMEDOUT)/.test(error.code)
    );
    const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 500
      ? error.statusCode : databaseFailure ? 503 : 500;
    // The Fastify logger is off inside Next.js, so server errors are written to the function log here.
    if (status >= 500 && !options.logger) console.error(`API ${request.method} ${request.url} failed:`, error.code ?? "", error.message);
    reply.code(status).send({ error: status < 500 ? "invalid_request" : "service_unavailable", message: "Request could not be completed" });
  });
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: "not_found", message: "Not found" }));

  // Applies to future admin API modules as well as current routes. Never trust a UI-only gate.
  app.addHook("preHandler", async request => {
    const path = request.url.split("?")[0]!;
    if (path === "/api/admin" || path.startsWith("/api/admin/")) {
      const user = await authService.current(sessionToken(request.headers.cookie));
      if (!user) throw new HttpProblem(401, "invalidLogin");
      if (user.role !== "admin") throw new HttpProblem(403, "forbidden");
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && request.headers.origin
        && !authSettings.origins.includes(request.headers.origin)) throw new HttpProblem(403, "forbidden");
    }
  });
  app.get("/api/me/vouchers", async request => {
    const user = await authService.current(sessionToken(request.headers.cookie));
    if (!user) throw new HttpProblem(401, "invalidLogin");
    return { vouchers: await orders.forCustomer(user) };
  });
  app.register(merchantPortalRoutes, { repository: new MerchantRepository(database), auth: authService });
  const merchantRepository = new MerchantRepository(database);
  const supabaseAdmin = new SupabaseUserProvisioner(authSettings.url, process.env.SUPABASE_SECRET_KEY?.trim() ?? '');
  const provisioning = new MerchantProvisioningService(merchantRepository,
    options.userProvisioner ?? supabaseAdmin);
  const merchantMail = { siteUrl: ordersConfig.siteUrl, supportEmail: ordersConfig.mail.businessReplyTo };
  app.register(merchantRoutes, { service: new MerchantService(merchantRepository, provisioning, mailer, merchantMail), auth: authService });
  app.register(dealRoutes, { repository: new DealRepository(database), auth: authService, origins: authSettings.origins,
    images: options.dealImages ?? new SupabaseDealImageStorage() });
  // Reset links point at authSettings.siteUrl: the public site in production, the local frontend in development.
  const passwordReset = new PasswordResetService(database, options.passwordAdmin ?? supabaseAdmin, mailer, authSettings.siteUrl);
  const signup = new SignupService(database, options.passwordAdmin ?? supabaseAdmin, mailer);
  app.register(authRoutes, { service: authService, config: authSettings, oauth: options.oauthProvider ?? new SupabaseGoogleProvider(authSettings), passwordReset, signup });
  app.register(healthRoutes, { database });
  app.register(catalogueRoutes, { service });
  app.register(orderRoutes, { service: orders, auth: authService, origins: authSettings.origins });
  return app;
}
