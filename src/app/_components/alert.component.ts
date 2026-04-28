import { ChangeDetectorRef, Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationStart } from '@angular/router';
import { Subscription } from 'rxjs';
import { Alert, AlertType } from '@app/_models';
import { AlertService } from '@app/_services';

@Component({
  selector: 'app-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.less'],
  standalone: true,
  imports: [CommonModule]
})
export class AlertComponent implements OnInit, OnDestroy {
  @Input() id = 'default-alert';
  @Input() fade = true;

  alerts: Alert[] = [];
  alertSubscription!: Subscription;
  routeSubscription!: Subscription;

  constructor(
    private router: Router,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef
  ) { }

  private scheduleDetectChanges() {
    setTimeout(() => this.cdr.detectChanges());
  }

  ngOnInit() {
    // Subscribe to new alert notifications
    this.alertSubscription = this.alertService.alert$
      .subscribe(alert => {
        // Clear alerts when an empty alert is received
        if (!alert.message) {
          this.alerts = this.alerts.filter(x => x.keepAfterRouteChange);
          this.alerts.forEach(x => delete x.keepAfterRouteChange);
          return;
        }

        this.alerts.push(alert);
        this.scheduleDetectChanges();

        if (alert.autoClose) {
          setTimeout(() => this.removeAlert(alert), 3000);
        }
      });

    // Clear alerts on location change
    this.routeSubscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.alertService.clear(this.id);
        this.scheduleDetectChanges();
      }
    });
  }

  ngOnDestroy() {
    // Unsubscribe to avoid memory leaks
    this.alertSubscription.unsubscribe();
    this.routeSubscription.unsubscribe();
  }

  removeAlert(alert: Alert) {
    // Return if alert is not present in array on auto close
    if (!this.alerts.includes(alert)) return;

    if (this.fade) {
      alert.fade = true;
      this.scheduleDetectChanges();

      setTimeout(() => {
        this.alerts = this.alerts.filter(x => x !== alert);
        this.scheduleDetectChanges();
      }, 250);
    } else {
      this.alerts = this.alerts.filter(x => x !== alert);
      this.scheduleDetectChanges();
    }
  }

  cssClasses(alert: Alert) {
    if (!alert) return;

    const classes = ['alert', 'alert-dismissible', 'mt-4', 'container'];

    const alertTypeClass = {
      [AlertType.Success]: 'alert-success',
      [AlertType.Error]: 'alert-danger',
      [AlertType.Info]: 'alert-info',
      [AlertType.Warning]: 'alert-warning'
    };

    if (alert.type !== undefined) {
      classes.push(alertTypeClass[alert.type]);
    }

    if (alert.fade) {
      classes.push('fade');
    }

    return classes.join(' ');
  }
}
