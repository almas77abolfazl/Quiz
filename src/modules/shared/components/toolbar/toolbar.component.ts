import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Command } from 'src/models/models';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
})
export class ToolbarComponent implements OnInit {
  @Input() commands: Command[] = [];

  @Output() processCommand = new EventEmitter<Command>();

  constructor() {}

  ngOnInit() {}

  public onProcessCommand(command: Command) {
    this.processCommand.emit(command);
  }
}
