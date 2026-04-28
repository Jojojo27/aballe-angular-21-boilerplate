import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AccountService } from '@app/_services';
import { Account } from '@app/_models';

@Component({
  selector: 'app-details',
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.less'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class DetailsComponent implements OnInit {
  account?: Account | null;

  constructor(private accountService: AccountService) { }

  ngOnInit() {
    this.account = this.accountService.accountValue;
  }
}
