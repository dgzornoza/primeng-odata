import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';

@NgModule({
  declarations: [],
  imports: [CommonModule],
  exports: []
})
export class PrimengOdataModule {

  public static forRoot(): ModuleWithProviders<PrimengOdataModule> {
    return {
      ngModule: PrimengOdataModule
    };
  }
}
