import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
  booleanAttribute,
} from '@angular/core';

export type OptionState = 'DEFAULT' | 'SELECTED' | 'CORRECT' | 'INCORRECT' | 'DISABLED';

@Component({
  selector: 'app-option-button',
  templateUrl: './option-button.component.html',
  styleUrl: './option-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OptionButtonComponent {
  readonly label = input('الف');
  readonly text = input('');
  readonly state = input<OptionState>('DEFAULT');
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly clicked = output<void>();

  readonly isDisabled = computed(() => this.disabled() || this.state() === 'DISABLED');
}
