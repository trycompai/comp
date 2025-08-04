import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should have redirectToSwagger method', () => {
      expect(typeof appController.redirectToSwagger).toBe('function');
    });

    it('should call redirectToSwagger without throwing', () => {
      expect(() => appController.redirectToSwagger()).not.toThrow();
    });
  });
});
