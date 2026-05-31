import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { loadDeferredStyles } from './deferred-styles';

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    requestAnimationFrame(() => loadDeferredStyles());
  })
  .catch((err) => console.error(err));
