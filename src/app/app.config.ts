import {
  ApplicationConfig,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    // ✅ Zoneless — no zone.js, signals drive all change detection
    provideZonelessChangeDetection(),
    provideHttpClient(),
  ],
};
