/**
 * Minimal stub for @thallesp/nestjs-better-auth used in e2e tests.
 * The real module imports better-auth/node (pure ESM) which Jest can't
 * process in CJS mode.  Since auth.server is already mocked, we only
 * need AuthModule.forRoot to return a valid NestJS dynamic module.
 */
import { Module, DynamicModule } from '@nestjs/common';

@Module({})
class BetterAuthModuleStub {
  static forRoot(_opts: unknown): DynamicModule {
    return {
      module: BetterAuthModuleStub,
      imports: [],
      providers: [],
      exports: [],
    };
  }
}

export { BetterAuthModuleStub as AuthModule };
