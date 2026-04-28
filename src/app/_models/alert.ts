export enum AlertType {
  Success = 'success',
  Error = 'error',
  Info = 'info',
  Warning = 'warning'
}

export class Alert {
  id?: string;
  type?: AlertType | string;
  message?: string;
  autoClose?: boolean;
  keepAfterRouteChange?: boolean;
  fade?: boolean;
}
