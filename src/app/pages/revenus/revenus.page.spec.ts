import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RevenusPage } from './revenus.page';

describe('RevenusPage', () => {
  let component: RevenusPage;
  let fixture: ComponentFixture<RevenusPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RevenusPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
