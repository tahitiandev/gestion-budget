import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DepensesPage } from './depenses.page';

describe('DepensesPage', () => {
  let component: DepensesPage;
  let fixture: ComponentFixture<DepensesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DepensesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
