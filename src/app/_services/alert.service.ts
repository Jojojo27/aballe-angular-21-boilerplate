import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Alert, AlertType } from '@app/_models';

@Injectable({ providedIn: 'root' })
export class AlertService {
  private subject = new Subject<Alert>();
  public alert$ = this.subject.asObservable();

  success(message: string, options?: any) {
    const alert = Object.assign(new Alert(), options, { type: AlertType.Success, message });
    this.alert(alert);
  }

  error(message: string, options?: any) {
    const alert = Object.assign(new Alert(), options, { type: AlertType.Error, message });
    this.alert(alert);
  }

  info(message: string, options?: any) {
    const alert = Object.assign(new Alert(), options, { type: AlertType.Info, message });
    this.alert(alert);
  }

  warn(message: string, options?: any) {
    const alert = Object.assign(new Alert(), options, { type: AlertType.Warning, message });
    this.alert(alert);
  }

  alert(alert: Alert) {
    alert.id = new Date().getTime().toString();
    alert.autoClose = alert.autoClose !== false;
    this.subject.next(alert);
  }

  onAlert(id: string = 'default-alert') {
    return this.alert$.pipe();
  }

  clear(id: string = 'default-alert') {
    this.subject.next(new Alert());
  }
}
