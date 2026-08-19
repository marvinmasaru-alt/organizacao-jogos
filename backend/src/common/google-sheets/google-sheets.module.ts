import { Global, Module } from '@nestjs/common';
import { GoogleSheetsService } from './google-sheets.service';

/**
 * Módulo global: qualquer outro módulo pode injetar GoogleSheetsService
 * sem precisar importar GoogleSheetsModule explicitamente.
 */
@Global()
@Module({
  providers: [GoogleSheetsService],
  exports: [GoogleSheetsService],
})
export class GoogleSheetsModule {}
